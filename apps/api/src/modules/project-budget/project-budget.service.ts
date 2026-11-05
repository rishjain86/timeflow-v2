import { prisma } from '../../config/prisma';
import { ProjectBudgetStatus } from '@prisma/client';
import { recalculateProjectBudget } from './project-budget-engine.service'; // 🟢 FIX: Added import

export const createProjectBudget = async (
  organizationId: string,
  data: {
    projectId: string;
    totalAllocatedHours: number;
    alert50Enabled?: boolean;
    alert75Enabled?: boolean;
    alert90Enabled?: boolean;
    alert100Enabled?: boolean;
    allowOverBudget?: boolean;
  }
) => {
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, organizationId },
  });

  if (!project) {
    throw new Error('Project not found or does not belong to your organization');
  }

  const existingBudget = await prisma.projectBudget.findUnique({
    where: { projectId: data.projectId },
  });

  if (existingBudget) {
    throw new Error('A budget already exists for this project');
  }

  return prisma.projectBudget.create({
    data: {
      projectId: data.projectId,
      organizationId,
      totalAllocatedHours: data.totalAllocatedHours,
      alert50Enabled: data.alert50Enabled ?? true,
      alert75Enabled: data.alert75Enabled ?? true,
      alert90Enabled: data.alert90Enabled ?? true,
      alert100Enabled: data.alert100Enabled ?? true,
      allowOverBudget: data.allowOverBudget ?? false,
      status: ProjectBudgetStatus.HEALTHY,
    },
  });
};

export const getProjectBudget = async (organizationId: string, projectId: string) => {
  const budget = await prisma.projectBudget.findFirst({
    where: { projectId, organizationId },
    include: {
      // 🟢 NEW SCHEMA UPDATE: Task Budgets and Member Budgets are now separate lists under ProjectBudget
      memberBudgets: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      },
      taskBudgets: {
        include: {
          task: {
            select: { id: true, name: true, isBillable: true, requiresClinicalCompliance: true },
          },
        },
      },
    },
  });

  if (!budget) {
    return null;
  }

  return budget;
};

export const updateProjectBudget = async (
  organizationId: string,
  budgetId: string,
  data: {
    totalAllocatedHours?: number;
    status?: ProjectBudgetStatus;
    alert50Enabled?: boolean;
    alert75Enabled?: boolean;
    alert90Enabled?: boolean;
    alert100Enabled?: boolean;
    allowOverBudget?: boolean;
  }
) => {
  const budget = await prisma.projectBudget.findFirst({
    where: { id: budgetId, organizationId },
  });

  if (!budget) {
    throw new Error('Project budget not found');
  }

  return prisma.projectBudget.update({
    where: { id: budgetId },
    data,
  });
};

export const allocateMemberBudget = async (
  organizationId: string,
  projectBudgetId: string,
  data: {
    userId: string;
    allocatedHours: number;
  }
) => {
  return prisma.$transaction(async (tx) => {
    const projectBudget = await tx.projectBudget.findFirst({
      where: { id: projectBudgetId, organizationId },
      include: { memberBudgets: true },
    });

    if (!projectBudget) {
      throw new Error('Project budget not found');
    }

    const userInOrg = await tx.organizationMember.findFirst({
      where: { userId: data.userId, organizationId },
    });

    if (!userInOrg) {
      throw new Error('User is not a member of this organization');
    }

    const currentTotalAllocated = projectBudget.memberBudgets.reduce(
      (sum, mb) => sum + Number(mb.allocatedHours),
      0
    );

    if (currentTotalAllocated + data.allocatedHours > Number(projectBudget.totalAllocatedHours)) {
      throw new Error('Total member allocations cannot exceed the project budget');
    }

    return tx.projectMemberBudget.create({
      data: {
        projectBudgetId,
        userId: data.userId,
        allocatedHours: data.allocatedHours,
        remainingHours: data.allocatedHours,
        status: ProjectBudgetStatus.HEALTHY,
      },
    });
  });
};

export const updateMemberBudget = async (
  organizationId: string,
  memberBudgetId: string,
  data: {
    allocatedHours?: number;
    status?: ProjectBudgetStatus;
  }
) => {
  return prisma.$transaction(async (tx) => {
    const memberBudget = await tx.projectMemberBudget.findUnique({
      where: { id: memberBudgetId },
      include: { projectBudget: true },
    });

    if (!memberBudget || memberBudget.projectBudget.organizationId !== organizationId) {
      throw new Error('Member budget not found');
    }

    if (data.allocatedHours !== undefined) {
      const allMembers = await tx.projectMemberBudget.findMany({
        where: { projectBudgetId: memberBudget.projectBudgetId },
      });

      const otherMembersTotal = allMembers
        .filter((mb) => mb.id !== memberBudgetId)
        .reduce((sum, mb) => sum + Number(mb.allocatedHours), 0);

      if (otherMembersTotal + data.allocatedHours > Number(memberBudget.projectBudget.totalAllocatedHours)) {
        throw new Error('Total member allocations cannot exceed the project budget');
      }
    }

    return tx.projectMemberBudget.update({
      where: { id: memberBudgetId },
      data: {
        ...data,
        ...(data.allocatedHours !== undefined && {
          remainingHours: Math.max(0, data.allocatedHours - Number(memberBudget.consumedHours))
        })
      },
    });
  });
};

export const allocateTaskBudget = async (
  organizationId: string,
  projectBudgetId: string, // 🟢 FIX: Updated to match new schema (was memberBudgetId)
  data: {
    taskId: string;
    allocatedHours: number;
    sessionLimitHours?: number;
  }
) => {
  return prisma.$transaction(async (tx) => {
    const projectBudget = await tx.projectBudget.findUnique({ // 🟢 FIX: Look up projectBudget directly
      where: { id: projectBudgetId },
      include: { taskBudgets: true },
    });

    if (!projectBudget || projectBudget.organizationId !== organizationId) {
      throw new Error('Project budget not found');
    }

    const task = await tx.task.findFirst({
      where: { id: data.taskId, projectId: projectBudget.projectId, organizationId },
    });

    if (!task) {
      throw new Error('Task not found or does not belong to this project');
    }

    const currentTaskTotal = projectBudget.taskBudgets.reduce(
      (sum, tb) => sum + Number(tb.allocatedHours),
      0
    );

    if (currentTaskTotal + data.allocatedHours > Number(projectBudget.totalAllocatedHours)) { // 🟢 FIX: Check against project budget
      throw new Error('Total task allocations cannot exceed the project budget');
    }

    return tx.projectTaskBudget.create({
      data: {
        projectBudgetId: projectBudgetId, // 🟢 FIX: Connect to projectBudgetId instead of memberBudgetId
        taskId: data.taskId,
        allocatedHours: data.allocatedHours,
        remainingHours: data.allocatedHours,
        sessionLimitHours: data.sessionLimitHours ?? task.defaultSessionLimitHours,
        status: ProjectBudgetStatus.HEALTHY,
      },
    });
  });
};

export const updateTaskBudget = async (
  organizationId: string,
  taskBudgetId: string,
  data: {
    allocatedHours?: number;
    sessionLimitHours?: number | null;
    status?: ProjectBudgetStatus;
  }
) => {
  return prisma.$transaction(async (tx) => {
    const taskBudget = await tx.projectTaskBudget.findUnique({
      where: { id: taskBudgetId },
      include: {
        projectBudget: true // 🟢 FIX: Include projectBudget directly
      },
    });

    if (!taskBudget || taskBudget.projectBudget.organizationId !== organizationId) {
      throw new Error('Task budget not found');
    }

    if (data.allocatedHours !== undefined) {
      const allTasks = await tx.projectTaskBudget.findMany({
        where: { projectBudgetId: taskBudget.projectBudgetId }, // 🟢 FIX: Query by projectBudgetId
      });

      const otherTasksTotal = allTasks
        .filter((tb) => tb.id !== taskBudgetId)
        .reduce((sum, tb) => sum + Number(tb.allocatedHours), 0);

      if (otherTasksTotal + data.allocatedHours > Number(taskBudget.projectBudget.totalAllocatedHours)) { // 🟢 FIX: Compare with project total
        throw new Error('Total task allocations cannot exceed the project budget');
      }
    }

    return tx.projectTaskBudget.update({
      where: { id: taskBudgetId },
      data: {
        ...data,
        ...(data.allocatedHours !== undefined && {
          remainingHours: Math.max(0, data.allocatedHours - Number(taskBudget.consumedHours))
        })
      },
    });
  });
};

export const syncProjectAllocations = async (
  organizationId: string,
  projectId: string,
  data: {
    totalAllocatedHours: number;
    tasks: { taskId: string; allocatedHours: number }[]; 
    members: { userId: string; allocatedHours?: number }[]; 
  }
) => {
  await prisma.$transaction(async (tx) => {
    let projectBudget = await tx.projectBudget.findUnique({
      where: { projectId },
      include: { memberBudgets: true, taskBudgets: true }, 
    });

    if (!projectBudget) {
      projectBudget = await tx.projectBudget.create({
        data: {
          projectId,
          organizationId,
          totalAllocatedHours: Number(data.totalAllocatedHours) || 0,
          status: ProjectBudgetStatus.HEALTHY,
        },
        include: { memberBudgets: true, taskBudgets: true }
      });
    } else {
      if (projectBudget.organizationId !== organizationId) {
        throw new Error('Project budget does not belong to your organization');
      }
      await tx.projectBudget.update({
        where: { id: projectBudget.id },
        data: { totalAllocatedHours: Number(data.totalAllocatedHours) || 0 },
      });
    }

    // 🟢 SAFETY FIX: Isse undefined map() ki error root se khatam ho jayegi
    const safeTasks = data.tasks || [];
    const safeMembers = data.members || [];

    // 🟢 NEW LOGIC: Sync Tasks Directly to Project Budget
    const incomingTaskIds = safeTasks.map((t) => t.taskId);
    await tx.projectTaskBudget.deleteMany({
      where: {
        projectBudgetId: projectBudget.id,
        taskId: { notIn: incomingTaskIds },
      },
    });

    for (const task of safeTasks) {
      const existingTask = await tx.projectTaskBudget.findFirst({
        where: { projectBudgetId: projectBudget.id, taskId: task.taskId },
      });

      const allocT = Number(task.allocatedHours) || 0;

      if (existingTask) {
        const consumedT = Number(existingTask.consumedHours) || 0;
        await tx.projectTaskBudget.update({
          where: { id: existingTask.id },
          data: { 
            allocatedHours: allocT,
            remainingHours: Math.max(0, allocT - consumedT)
          },
        });
      } else {
        const taskData = await tx.task.findUnique({ where: { id: task.taskId } });
        await tx.projectTaskBudget.create({
          data: {
            projectBudgetId: projectBudget.id,
            taskId: task.taskId,
            allocatedHours: allocT,
            remainingHours: allocT, 
            sessionLimitHours: taskData?.defaultSessionLimitHours || null,
            status: ProjectBudgetStatus.HEALTHY,
          },
        });
      }
    }

    // 🟢 NEW LOGIC: Sync Team Member Access
    const incomingUserIds = safeMembers.map((m) => m.userId);
    const membersToDelete = projectBudget.memberBudgets?.filter(
      (mb) => !incomingUserIds.includes(mb.userId)
    ) || [];
    
    for (const mb of membersToDelete) {
      await tx.projectMemberBudget.delete({ where: { id: mb.id } });
    }

    for (const member of safeMembers) {
      let memberBudget = await tx.projectMemberBudget.findFirst({
        where: { projectBudgetId: projectBudget.id, userId: member.userId },
      });

      const allocM = Number(member.allocatedHours) || 0;

      if (memberBudget) {
        const consumedM = Number(memberBudget.consumedHours) || 0;
        await tx.projectMemberBudget.update({
          where: { id: memberBudget.id },
          data: { 
            allocatedHours: allocM,
            remainingHours: Math.max(0, allocM - consumedM)
          },
        });
      } else {
        await tx.projectMemberBudget.create({
          data: {
            projectBudgetId: projectBudget.id,
            userId: member.userId,
            allocatedHours: allocM,
            remainingHours: allocM, 
            status: ProjectBudgetStatus.HEALTHY,
          },
        });
      }
    }
  });

  try {
    await recalculateProjectBudget(organizationId, projectId);
  } catch (error) {
    console.warn("Failed to recalculate budget after sync", error);
  }

  return { success: true, message: 'Allocations synced successfully' };
};
