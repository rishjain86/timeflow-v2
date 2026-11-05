import { prisma } from '../../config/prisma';
import { ProjectBudgetStatus, AlertThreshold } from '@prisma/client';
import { sendNotification } from '../../services/notification.service'; // Implement this as needed

/**
 * Calculates current consumed hours for a Task Budget by querying real time entries.
 * 🟢 FIX: Removed userId to calculate GLOBAL consumption for the Shared Task Pool.
 */
const calculateTaskConsumption = async (taskId: string, organizationId: string): Promise<number> => {
  const entries = await prisma.timeEntry.aggregate({
    _sum: { duration: true },
    // 🟢 FIX: Exclude REJECTED entries from Task Budget calculations
    where: { taskId, organizationId, approvalStatus: { not: 'REJECTED' } }
  });
  return Number(entries._sum.duration || 0);
};

/**
 * Validates budget health and dispatches alerts if thresholds are crossed
 */
const evaluateBudgetHealth = async (
  entity: any, 
  type: 'PROJECT' | 'MEMBER' | 'TASK', // 🟢 FIX: Added 'TASK' to the types 
  organizationId: string
) => {
  const consumed = Number(entity.consumedHours);
  const allocated = Number(entity.allocatedHours || entity.totalAllocatedHours);
  
  if (allocated === 0) return ProjectBudgetStatus.HEALTHY;

  const percentage = (consumed / allocated) * 100;
  
  let newStatus = ProjectBudgetStatus.HEALTHY;
  if (percentage >= 100) newStatus = ProjectBudgetStatus.EXHAUSTED;
  else if (percentage >= 90) newStatus = ProjectBudgetStatus.NEAR_EXHAUSTION;
  else if (percentage >= 75) newStatus = ProjectBudgetStatus.WARNING;

  // 🟢 FIX: Trigger Notification Logic (Assuming you have a notification system)
  if (entity.alert90Enabled && percentage >= 90 && percentage < 100) {
    console.log(`[ALERT] ${type} is at 90% consumption capacity.`);
  } else if (entity.alert100Enabled && percentage >= 100) {
    console.log(`[ALERT] ${type} budget is fully exhausted!`);
  }

  return newStatus;
};

/**
 * Master engine that recalculates the entire Project Budget tree (Project -> Tasks & Members)
 * Call this every time a TimeEntry is Created, Updated, or Deleted.
 */
export const recalculateProjectBudget = async (organizationId: string, projectId: string) => {
  console.log(`[BUDGET ENGINE] Starting recalculation for Project: ${projectId}`);
  
  // 1. Fetch entire project budget tree (🟢 FIX: Now includes members and tasks separately)
  const projectBudget = await prisma.projectBudget.findUnique({
    where: { projectId },
    include: {
      memberBudgets: true,
      taskBudgets: true
    }
  });

  if (!projectBudget || projectBudget.organizationId !== organizationId) {
    console.warn(`[BUDGET ENGINE] No budget tree found for Project: ${projectId}. Skipping.`);
    return;
  }

  let totalProjectConsumed = 0;

  // 2. Iterate through Tasks (Shared Pool)
  for (const task of projectBudget.taskBudgets) {
    // 🟢 FIX: Real DB Summation across all users for this task (Excluding REJECTED)
    const actualTaskConsumption = await calculateTaskConsumption(task.taskId, organizationId);
    
    const taskAllocated = Number(task.allocatedHours);
    const taskRemaining = Math.max(0, taskAllocated - actualTaskConsumption);
    const taskPercentage = taskAllocated > 0 ? (actualTaskConsumption / taskAllocated) * 100 : 0;
    
    let taskStatus = ProjectBudgetStatus.HEALTHY;
    if (taskPercentage >= 100) taskStatus = ProjectBudgetStatus.EXHAUSTED;
    else if (taskPercentage >= 90) taskStatus = ProjectBudgetStatus.NEAR_EXHAUSTION;
    else if (taskPercentage >= 75) taskStatus = ProjectBudgetStatus.WARNING;

    // Update Task Budget
    await prisma.projectTaskBudget.update({
      where: { id: task.id },
      data: {
        consumedHours: actualTaskConsumption,
        remainingHours: taskRemaining,
        progressPercentage: taskPercentage,
        status: taskStatus
      }
    });
  }

  // 3. Iterate through Members
  for (const member of projectBudget.memberBudgets) {
    // 🟢 FIX: Direct DB sum for all time logged by THIS member on THIS project (Excluding REJECTED)
    const memberEntries = await prisma.timeEntry.aggregate({
      _sum: { duration: true },
      where: { userId: member.userId, projectId, organizationId, approvalStatus: { not: 'REJECTED' } }
    });
    
    const totalMemberConsumed = Number(memberEntries._sum.duration || 0);

    // Update Member Budget
    const memberAllocated = Number(member.allocatedHours);
    const memberRemaining = Math.max(0, memberAllocated - totalMemberConsumed);
    const memberPercentage = memberAllocated > 0 ? (totalMemberConsumed / memberAllocated) * 100 : 0;
    
    // Evaluate Member Health & Alert
    const memberStatus = await evaluateBudgetHealth({
      ...member, 
      consumedHours: totalMemberConsumed, 
      alert90Enabled: projectBudget.alert90Enabled,
      alert100Enabled: projectBudget.alert100Enabled
    }, 'MEMBER', organizationId);

    await prisma.projectMemberBudget.update({
      where: { id: member.id },
      data: {
        consumedHours: totalMemberConsumed,
        remainingHours: memberRemaining,
        progressPercentage: memberPercentage,
        status: memberStatus
      }
    });

    totalProjectConsumed += totalMemberConsumed;
  }

  // 4. Update Root Project Budget
  const projectAllocated = Number(projectBudget.totalAllocatedHours);
  const projectRemaining = Math.max(0, projectAllocated - totalProjectConsumed);
  const projectPercentage = projectAllocated > 0 ? (totalProjectConsumed / projectAllocated) * 100 : 0;

  // Evaluate Project Health & Alert
  const projectStatus = await evaluateBudgetHealth({
    ...projectBudget, 
    consumedHours: totalProjectConsumed
  }, 'PROJECT', organizationId);

  await prisma.projectBudget.update({
    where: { id: projectBudget.id },
    data: {
      consumedHours: totalProjectConsumed,
      remainingHours: projectRemaining,
      progressPercentage: projectPercentage,
      status: projectStatus
    }
  });

  console.log(`[BUDGET ENGINE] Recalculation Complete. Total Consumed: ${totalProjectConsumed}`);
};
