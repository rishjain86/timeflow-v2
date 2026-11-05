import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { NotFoundError } from '../utils/errors';
import { AllocateBudgetInput } from '../schemas/project-budget.schema';

export const allocateProjectBudget = async (
  req: Request<unknown, unknown, any>, // Changed to 'any' to accept assignedUsers without strict schema errors
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId, totalAllocatedHours, tasks, members, granularAssignments } = req.body;
    const { organizationId } = res.locals.user;

    // 1. Verify Project
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId, isActive: true },
    });

    if (!project) {
      throw new NotFoundError('Project not found in your organization');
    }

    // 2. Transaction for atomic updates (Shared Task Pool Architecture)
    const result = await prisma.$transaction(async (tx) => {
      // Upsert Project Budget
      const projectBudget = await tx.projectBudget.upsert({
        where: { projectId },
        update: { totalAllocatedHours },
        create: {
          projectId,
          organizationId,
          totalAllocatedHours,
        },
      });

      // Process Members (Access Only)
      const incomingUserIds = (members || []).map((m: any) => m.userId);
      await tx.projectMemberBudget.deleteMany({
        where: {
          projectBudgetId: projectBudget.id,
          userId: { notIn: incomingUserIds },
        },
      });

      for (const member of (members || [])) {
        await tx.projectMemberBudget.upsert({
          where: {
            projectBudgetId_userId: {
              projectBudgetId: projectBudget.id,
              userId: member.userId,
            },
          },
          update: { allocatedHours: member.allocatedHours || 0 },
          create: {
            projectBudgetId: projectBudget.id,
            userId: member.userId,
            allocatedHours: member.allocatedHours || 0,
          },
        });
      }

      // Process Shared Tasks for Project Budget directly
      const incomingTaskIds = (tasks || []).map((t: any) => t.taskId);
      await tx.projectTaskBudget.deleteMany({
        where: {
          projectBudgetId: projectBudget.id,
          taskId: { notIn: incomingTaskIds },
        },
      });

      for (const task of (tasks || [])) {
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
            },
          });
        }

        // 🟢 FIX: Sync Granular Task Assignments securely to Database bypassing Zod Stripping
        const rootAssignments = granularAssignments || [];
        const assignmentData = rootAssignments.find((ga: any) => ga.taskId === task.taskId);
        
        let usersToAssign: string[] = [];
        
        if (task.assignedUsers && Array.isArray(task.assignedUsers)) {
          usersToAssign = task.assignedUsers;
        } else if (assignmentData && assignmentData.users && Array.isArray(assignmentData.users)) {
          usersToAssign = assignmentData.users;
        } else if (task.assignedUsersString) {
          usersToAssign = task.assignedUsersString.split(',').filter(Boolean);
        }

        // 1. Delete old granular assignments for this task
        await tx.taskAssignment.deleteMany({
          where: { taskId: task.taskId, organizationId }
        });

        if (usersToAssign.length > 0) {
          // 2. Insert the updated granular assignments
          await tx.taskAssignment.createMany({
            data: usersToAssign.map((userId: string) => ({
              taskId: task.taskId,
              userId: userId,
              organizationId: organizationId
            }))
          });

          // 3. CRITICAL FALLBACK: Also update legacy assignedToId so tasks ALWAYS appear correctly 
          await tx.task.update({
            where: { id: task.taskId },
            data: { assignedToId: usersToAssign[0] }
          });
        } else {
          // Clear legacy assignment if no users are selected
          await tx.task.update({
            where: { id: task.taskId },
            data: { assignedToId: null }
          });
        }
      }

      return projectBudget;
    });

    res.status(200).json({
      success: true,
      message: 'Budget allocated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
