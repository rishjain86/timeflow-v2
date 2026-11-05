import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../utils/errors';
import { validateTimeEntryEligibility } from '../modules/validation-engine/validation-engine.service';
import { 
  CreateTimeEntryInput, 
  UpdateTimeEntryInput, 
  ReviewTimeEntryInput,
  RequestBudgetInput
} from '../schemas/time-entry.schema';

const getRole = (payload: any) => {
  return String(payload?.role || payload?.user?.role || payload?.data?.role || payload?.data?.user?.role || '').toUpperCase();
};

const getUserId = (payload: any) => {
  return payload?.id || payload?.userId || payload?.sub || payload?.user?.id || '';
};

const hasManagerAccess = (role: string) => {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'SUPER_ADMIN';
};

// 🟢 SMART BUDGET SYNC ENGINE: Refund or Consume hours mathematically across all tables
const syncBudget = async (tx: any, projectId: string, taskId: string | null, userId: string, orgId: string, hoursChange: number) => {
  if (!projectId || hoursChange === 0) return;
  try {
    const pBudget = await tx.projectBudget.findFirst({ where: { projectId, organizationId: orgId } });
    if (!pBudget) return;

    await tx.projectBudget.update({
      where: { id: pBudget.id },
      data: { consumedHours: { increment: hoursChange } }
    });

    if (taskId) {
      const tBudget = await tx.projectTaskBudget.findFirst({ where: { projectBudgetId: pBudget.id, taskId } });
      if (tBudget) {
        await tx.projectTaskBudget.update({
          where: { id: tBudget.id },
          data: { consumedHours: { increment: hoursChange } }
        });
      }
    }

    const mBudget = await tx.projectMemberBudget.findFirst({ where: { projectBudgetId: pBudget.id, userId } });
    if (mBudget) {
      await tx.projectMemberBudget.update({
        where: { id: mBudget.id },
        data: { consumedHours: { increment: hoursChange } }
      });
    }
  } catch (err) {
    console.error("Budget Sync Error:", err);
  }
};

export const createTimeEntry = async (
  req: Request<unknown, unknown, CreateTimeEntryInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId, taskId, date, duration, description, isBillable } = req.body;
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const userId = getUserId(userPayload);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'CRITICAL Auth Error: Missing User ID' });
    }

    const finalDuration = Number(duration);
    const finalIsBillable = String(isBillable) === 'false' ? false : Boolean(isBillable ?? true);

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId, isActive: true },
    });

    if (!project) throw new NotFoundError('Project not found in your organization');

    let taskRecord = null;
    let customTaskRateRecord = null;

    if (taskId) {
      taskRecord = await prisma.task.findFirst({
        where: { id: taskId, projectId, isActive: true },
      });
      if (!taskRecord) throw new NotFoundError('Task not found in this project');

      customTaskRateRecord = await prisma.projectTaskRate.findFirst({
        where: { projectId, taskId, organizationId }
      });
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    let cnrDocumentUrl = null;
    let attendanceDocumentUrl = null;

    if (files?.cnrDocument?.[0]) {
      const file = files.cnrDocument[0];
      cnrDocumentUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }
    
    if (files?.attendanceDocument?.[0]) {
      const file = files.attendanceDocument[0];
      attendanceDocumentUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    const hasInlineDocuments = !!(cnrDocumentUrl || attendanceDocumentUrl);

    await validateTimeEntryEligibility(
      organizationId,
      userId,
      projectId,
      taskId || null,
      null, 
      finalDuration,
      hasInlineDocuments
    );

    let appliedRate: number | null = null;
    let billableAmount: number | null = null;

    if (finalIsBillable !== false) {
      if (customTaskRateRecord?.customRate !== undefined && customTaskRateRecord?.customRate !== null) {
        appliedRate = Number(customTaskRateRecord.customRate);
      } else if (taskRecord?.hourlyRate) {
        appliedRate = Number(taskRecord.hourlyRate);
      } else if (project?.hourlyRate) {
        appliedRate = Number(project.hourlyRate);
      }
      if(appliedRate === null) appliedRate = 0;
      billableAmount = appliedRate * finalDuration;
    }

    const timeEntry = await prisma.timeEntry.create({
      data: {
        projectId,
        taskId,
        userId,
        organizationId,
        date: new Date(date),
        duration: finalDuration,
        description,
        isBillable: finalIsBillable,
        hourlyRate: appliedRate,
        billableAmount: billableAmount,
        approvalStatus: 'PENDING' as any,
        cnrDocumentUrl,       
        attendanceDocumentUrl 
      },
    });

    // 🟢 Consume budget when entry is created
    await syncBudget(prisma, projectId, taskId || null, userId, organizationId, finalDuration);

    await prisma.auditLog.create({
      data: {
        action: 'CREATED',
        entityType: 'TIME_ENTRY',
        entityId: timeEntry.id,
        userId,
        organizationId,
        details: { duration: finalDuration, description } as any
      }
    });

    res.status(201).json({
      success: true,
      message: 'Time entry created successfully and is pending approval.',
      data: { timeEntry },
    });
  } catch (error) {
    next(error);
  }
};

export const getTimeEntries = async (
  req: Request<unknown, unknown, unknown, { 
    page?: string; 
    limit?: string; 
    projectId?: string; 
    userId?: string;
    startDate?: string;
    endDate?: string;
    approvalStatus?: string;
    fetchLogs?: string;
  }>,
  res: Response,
  next: NextFunction
) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  try {
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const currentUserId = getUserId(userPayload);
    const role = getRole(userPayload);
    const isManager = hasManagerAccess(role);

    if (!currentUserId) {
      return res.status(401).json({ success: false, message: 'CRITICAL Auth Error: Missing User ID' });
    }
    
    if (req.query.fetchLogs === 'true') {
      const logWhereClause: any = { organizationId };
      
      if (!isManager && currentUserId) {
        logWhereClause.userId = String(currentUserId);
      }

      const logs = await prisma.auditLog.findMany({
        where: logWhereClause,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, role: true } } }
      });
      return res.status(200).json({ success: true, data: { logs } });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const whereClause: any = { organizationId };

    if (req.query.projectId) whereClause.projectId = req.query.projectId;
    if (req.query.approvalStatus) whereClause.approvalStatus = req.query.approvalStatus;

    if (req.query.startDate && req.query.endDate) {
      whereClause.date = { gte: new Date(req.query.startDate), lte: new Date(req.query.endDate) };
    } else if (req.query.startDate) {
      whereClause.date = { gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      whereClause.date = { lte: new Date(req.query.endDate) };
    }

    if (isManager) {
      if (req.query.userId && String(req.query.userId).trim() !== '') {
        whereClause.userId = String(req.query.userId);
      }
    } else {
      whereClause.userId = String(currentUserId); 
    }

    const [timeEntries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          project: { select: { id: true, name: true } },
          task: { select: { id: true, name: true } }, 
          user: { select: { id: true, firstName: true, lastName: true, role: true } }
        }
      }),
      prisma.timeEntry.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      data: { 
        timeEntries,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTimeEntryById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const currentUserId = getUserId(userPayload);
    const role = getRole(userPayload);
    const isManager = hasManagerAccess(role);

    const timeEntry = await prisma.timeEntry.findFirst({
      where: { id, organizationId },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, name: true } }, 
        user: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    if (!timeEntry) throw new NotFoundError('Time entry not found');

    if (!isManager && timeEntry.userId !== currentUserId) {
      throw new UnauthorizedError('You are not authorized to view this time entry');
    }

    const history = await prisma.auditLog.findMany({
        where: { entityId: id, organizationId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, role: true } } }
    });

    res.status(200).json({
      success: true,
      data: { timeEntry, history }, 
    });
  } catch (error) {
    next(error);
  }
};

export const updateTimeEntry = async (
  req: Request<{ id: string }, unknown, UpdateTimeEntryInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const currentUserId = getUserId(userPayload);
    const role = getRole(userPayload);
    const isManager = hasManagerAccess(role);

    const { projectId, taskId, date, duration, description, isBillable } = req.body;

    const existingTimeEntry = await prisma.timeEntry.findFirst({
      where: { id, organizationId },
    });

    if (!existingTimeEntry) throw new NotFoundError('Time entry not found');

    // 🟢 BLOCK EDIT IF PERMANENTLY REJECTED
    if (existingTimeEntry.rejectionReason?.includes('[PERMANENTLY REJECTED]') && !isManager) {
      throw new BadRequestError('This entry has been permanently rejected by the Admin and cannot be edited or resubmitted.');
    }

    if (!isManager && existingTimeEntry.userId !== currentUserId) {
      throw new UnauthorizedError('You are not authorized to update this time entry');
    }

    if (existingTimeEntry.approvalStatus === 'APPROVED' && !isManager) {
      throw new BadRequestError('This time entry is already APPROVED and locked. Only an Admin or Manager can modify it.');
    }

    const finalIsBillable = isBillable !== undefined ? (String(isBillable) === 'false' ? false : Boolean(isBillable)) : existingTimeEntry.isBillable;
    const finalDuration = duration !== undefined ? Number(duration) : Number(existingTimeEntry.duration);

    let appliedRate: number | null = null;
    let billableAmount: number | null = null;

    if (finalIsBillable) {
       let customTaskRateRecord = null;
       if(taskId) {
         customTaskRateRecord = await prisma.projectTaskRate.findFirst({
           where: { projectId: projectId || existingTimeEntry.projectId, taskId, organizationId }
         });
       }

       if (customTaskRateRecord?.customRate !== undefined && customTaskRateRecord?.customRate !== null) {
          appliedRate = Number(customTaskRateRecord.customRate);
       } else if (existingTimeEntry.hourlyRate) {
          appliedRate = Number(existingTimeEntry.hourlyRate);
       } else {
          const project = await prisma.project.findFirst({ where: { id: projectId || existingTimeEntry.projectId }});
          if(project?.hourlyRate) appliedRate = Number(project.hourlyRate);
       }

       if (appliedRate === null) appliedRate = 0;
       billableAmount = appliedRate * finalDuration;
    } else {
       appliedRate = null;
       billableAmount = null;
    }

    const parsedDate = date === undefined ? undefined : (date === null ? null : new Date(date));
    let newApprovalStatus = existingTimeEntry.approvalStatus;
    let newRejectionReason = existingTimeEntry.rejectionReason;
    
    if (!isManager && existingTimeEntry.approvalStatus === 'REJECTED') {
      newApprovalStatus = 'PENDING' as any;
      newRejectionReason = null;
    }

    // 🟢 SYNC BUDGET: Refund the old duration first if it wasn't rejected
    if (existingTimeEntry.approvalStatus !== 'REJECTED') {
       await syncBudget(prisma, existingTimeEntry.projectId, existingTimeEntry.taskId, existingTimeEntry.userId, organizationId, -Number(existingTimeEntry.duration));
    }

    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        projectId,
        taskId: taskId === null ? null : taskId,
        date: parsedDate ?? undefined,
        duration: finalDuration,
        description,
        isBillable: finalIsBillable,
        hourlyRate: appliedRate,
        billableAmount: billableAmount,
        approvalStatus: newApprovalStatus,
        rejectionReason: newRejectionReason,
        isResubmitted: newApprovalStatus === 'PENDING' && existingTimeEntry.approvalStatus === 'REJECTED' ? true : existingTimeEntry.isResubmitted,
      },
    });

    // 🟢 SYNC BUDGET: Consume the new duration if the new status is NOT rejected
    if (newApprovalStatus !== 'REJECTED') {
       await syncBudget(prisma, projectId || existingTimeEntry.projectId, taskId === null ? null : (taskId || existingTimeEntry.taskId), existingTimeEntry.userId, organizationId, finalDuration);
    }

    const actionName = newApprovalStatus === 'PENDING' && existingTimeEntry.approvalStatus === 'REJECTED' ? 'RESUBMITTED' : 'UPDATED';
    
    await prisma.auditLog.create({
      data: {
        action: actionName,
        entityType: 'TIME_ENTRY',
        entityId: id,
        userId: currentUserId,
        organizationId,
        details: { 
          previousDuration: Number(existingTimeEntry.duration), 
          newDuration: finalDuration, 
          message: actionName === 'RESUBMITTED' ? 'Employee fixed and resubmitted' : 'Time entry updated',
          wasApproved: existingTimeEntry.approvalStatus === 'APPROVED'
        } as any
      }
    });

    res.status(200).json({
      success: true,
      message: 'Time entry updated successfully',
      data: { timeEntry: updatedTimeEntry },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTimeEntry = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const currentUserId = getUserId(userPayload);
    const role = getRole(userPayload);
    const isManager = hasManagerAccess(role);

    const existingTimeEntry = await prisma.timeEntry.findFirst({
      where: { id, organizationId },
    });

    if (!existingTimeEntry) throw new NotFoundError('Time entry not found');

    if (!isManager && existingTimeEntry.userId !== currentUserId) {
      throw new UnauthorizedError('You are not authorized to delete this time entry');
    }

    if (existingTimeEntry.approvalStatus === 'APPROVED' && !isManager) {
      throw new BadRequestError('Cannot delete an APPROVED time entry. Only an Admin or Manager can perform this action.');
    }

    // 🟢 SYNC BUDGET: Refund the hours on delete
    if (existingTimeEntry.approvalStatus !== 'REJECTED') {
      await syncBudget(prisma, existingTimeEntry.projectId, existingTimeEntry.taskId, existingTimeEntry.userId, organizationId, -Number(existingTimeEntry.duration));
    }

    await prisma.auditLog.create({
      data: {
        action: 'DELETED',
        entityType: 'TIME_ENTRY',
        entityId: id,
        userId: currentUserId,
        organizationId,
        details: { 
          duration: Number(existingTimeEntry.duration),
          wasApproved: existingTimeEntry.approvalStatus === 'APPROVED'
        } as any
      }
    });

    await prisma.timeEntry.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Time entry deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const reviewTimeEntry = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    // 🟢 ADDED isPermanent FROM PAYLOAD
    const { approvalStatus, rejectionReason, isPermanent } = req.body;
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const userId = getUserId(userPayload);
    const role = getRole(userPayload);
    const isManager = hasManagerAccess(role);

    if (approvalStatus !== 'APPROVED' && approvalStatus !== 'REJECTED') {
      return res.status(400).json({ success: false, message: 'Status must be APPROVED or REJECTED' });
    }

    if (approvalStatus === 'REJECTED' && (!rejectionReason || String(rejectionReason).trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    if (!isManager) {
      return res.status(403).json({ success: false, message: 'Only Managers and Admins can perform this action' });
    }

    const existingTimeEntry = await prisma.timeEntry.findFirst({
      where: { id, organizationId },
    });

    if (!existingTimeEntry) {
      return res.status(404).json({ success: false, message: 'Time entry not found' });
    }

    // 🟢 APPLY HARD LOCK LABEL IF CHECKED
    let finalRejectionReason = approvalStatus === 'REJECTED' ? String(rejectionReason).trim() : null;
    if (approvalStatus === 'REJECTED' && isPermanent) {
       finalRejectionReason = `[PERMANENTLY REJECTED] ${finalRejectionReason}`;
    }

    const updatedTimeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        approvalStatus: approvalStatus as any,
        rejectionReason: finalRejectionReason,
        isResubmitted: approvalStatus === 'APPROVED' ? false : existingTimeEntry.isResubmitted, 
      },
    });

    // 🟢 SYNC BUDGET: Refund on Reject, Re-consume on forced Approve
    if (approvalStatus === 'REJECTED' && existingTimeEntry.approvalStatus !== 'REJECTED') {
        await syncBudget(prisma, existingTimeEntry.projectId, existingTimeEntry.taskId, existingTimeEntry.userId, organizationId, -Number(existingTimeEntry.duration));
    } else if (approvalStatus === 'APPROVED' && existingTimeEntry.approvalStatus === 'REJECTED') {
        await syncBudget(prisma, existingTimeEntry.projectId, existingTimeEntry.taskId, existingTimeEntry.userId, organizationId, Number(existingTimeEntry.duration));
    }

    await prisma.auditLog.create({
      data: {
        action: approvalStatus === 'REJECTED' ? 'FIX_REQUESTED' : 'APPROVED',
        entityType: 'TIME_ENTRY',
        entityId: id,
        userId, 
        organizationId,
        details: { reason: finalRejectionReason || 'No reason provided' } as any
      }
    });

    return res.status(200).json({
      success: true,
      message: `Time entry successfully ${approvalStatus.toLowerCase()}.`,
      data: { timeEntry: updatedTimeEntry },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Internal Error' });
  }
};

export const moveTimeEntry = async (
  req: Request<{ id: string }, unknown, any>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const userId = getUserId(userPayload);
    const role = getRole(userPayload);
    
    const isManager = hasManagerAccess(role);
    
    const { newProjectId, newTaskId, reason } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

    const data = {
      newProjectId,
      newTaskId: newTaskId === 'null' || newTaskId === '' ? null : newTaskId,
      reason
    };

    const timeEntryService = require('../modules/time-entry/time-entry.service');

    const movedEntry = await timeEntryService.moveTimeEntry(
      id,
      organizationId,
      userId,
      data,
      files,
      isManager
    );

    res.status(200).json({
      success: true,
      message: 'Time entry moved successfully',
      data: { timeEntry: movedEntry },
    });
  } catch (error) {
    next(error);
  }
};

export const createBudgetRequest = async (
  req: Request<unknown, unknown, RequestBudgetInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { projectId, taskId, requestedHours, reason } = req.body;
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const userId = getUserId(userPayload);

    if (!userId || !organizationId) {
       throw new UnauthorizedError('Unauthorized');
    }

    if (!projectId) {
      throw new BadRequestError('projectId is required');
    }

    const hours = Number(requestedHours);

    const budgetRequest = await prisma.budgetRequest.create({
      data: {
        projectId,
        taskId: taskId || null,
        userId,
        organizationId,
        requestedHours: hours,
        reason: (reason && String(reason).trim() !== '') ? String(reason).trim() : 'Extra hours needed',
        status: 'PENDING'
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'BUDGET_REQUESTED',
        entityType: 'PROJECT',
        entityId: projectId,
        userId,
        organizationId,
        details: { 
          message: `Employee requested ${hours} extra hours`,
          reason: reason || 'No reason provided'
        } as any
      }
    });

    res.status(201).json({
      success: true,
      message: 'Budget request submitted successfully to managers.',
      data: { budgetRequest }
    });
  } catch (error) {
    next(error);
  }
};

export const getActiveTimer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const userId = getUserId(userPayload);

    const timer = await prisma.timerSession.findFirst({
      where: { userId, organizationId },
      include: { project: true, task: true }
    });

    res.status(200).json({ success: true, data: { timer } });
  } catch (error) { 
    next(error); 
  }
};

export const startTimer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, taskId, notes } = req.body;
    const userPayload = res.locals.user || {};
    const organizationId = userPayload.organizationId;
    const userId = getUserId(userPayload);

    const existingTimer = await prisma.timerSession.findFirst({ where: { userId, organizationId } });
    if (existingTimer) throw new BadRequestError('You already have an active timer running. Please stop or resume it first.');

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
    if (!project) throw new NotFoundError('Project not found or not in your organization.');

    const timer = await prisma.timerSession.create({
      data: {
        userId, 
        organizationId, 
        projectId, 
        taskId, 
        clientId: project.clientId, 
        notes, 
        status: 'RUNNING'
      }
    });

    await prisma.auditLog.create({
      data: { action: 'START_TIMER', entityType: 'TIMER', entityId: timer.id, userId, organizationId, details: { projectId, taskId } as any }
    });

    res.status(201).json({ success: true, data: { timer } });
  } catch (error) { 
    next(error); 
  }
};

export const pauseTimer = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userPayload = res.locals.user || {};
    
    const timer = await prisma.timerSession.findFirst({ where: { id, userId: getUserId(userPayload) } });
    if (!timer) throw new NotFoundError('Active timer not found');
    if (timer.status !== 'RUNNING') throw new BadRequestError('Timer is not currently running');

    const updated = await prisma.timerSession.update({
      where: { id },
      data: { status: 'PAUSED', pausedAt: new Date() }
    });

    res.status(200).json({ success: true, data: { timer: updated } });
  } catch (error) { 
    next(error); 
  }
};

export const resumeTimer = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userPayload = res.locals.user || {};

    const timer = await prisma.timerSession.findFirst({ where: { id, userId: getUserId(userPayload) } });
    if (!timer) throw new NotFoundError('Active timer not found');
    if (timer.status !== 'PAUSED' || !timer.pausedAt) throw new BadRequestError('Timer is not paused');

    const pauseDurationSeconds = Math.floor((new Date().getTime() - timer.pausedAt.getTime()) / 1000);
    
    const updated = await prisma.timerSession.update({
      where: { id },
      data: { status: 'RUNNING', pausedAt: null, totalPausedSeconds: timer.totalPausedSeconds + pauseDurationSeconds }
    });

    res.status(200).json({ success: true, data: { timer: updated } });
  } catch (error) { 
    next(error); 
  }
};

export const stopTimer = async (req: Request<{ id: string }>, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const userPayload = res.locals.user || {};
    
    const timer = await prisma.timerSession.findFirst({ where: { id, userId: getUserId(userPayload) } });
    if (!timer) throw new NotFoundError('Timer not found');

    let additionalPauseSeconds = 0;
    if (timer.status === 'PAUSED' && timer.pausedAt) {
       additionalPauseSeconds = Math.floor((new Date().getTime() - timer.pausedAt.getTime()) / 1000);
    }

    const totalPaused = timer.totalPausedSeconds + additionalPauseSeconds;
    const totalElapsedSeconds = Math.floor((new Date().getTime() - timer.startedAt.getTime()) / 1000);
    const workedSeconds = totalElapsedSeconds - totalPaused;
    
    const workedHours = Number((Math.max(workedSeconds, 60) / 3600).toFixed(4));

    const timeEntry = await prisma.timeEntry.create({
      data: {
        userId: timer.userId,
        organizationId: timer.organizationId,
        projectId: timer.projectId,
        taskId: timer.taskId,
        clientId: timer.clientId,
        date: timer.startedAt,
        duration: workedHours,
        description: notes || timer.notes,
        approvalStatus: 'DRAFT', 
        isBillable: true 
      }
    });

    // 🟢 SYNC BUDGET: Consume timer hours
    await syncBudget(prisma, timer.projectId, timer.taskId || null, timer.userId, timer.organizationId, workedHours);

    await prisma.timerSession.delete({ where: { id } });

    await prisma.auditLog.create({
      data: { action: 'STOP_TIMER', entityType: 'TIMER', entityId: id, userId: timer.userId, organizationId: timer.organizationId, details: { workedHours } as any }
    });

    res.status(200).json({ success: true, data: { timeEntry } });
  } catch (error) { 
    next(error); 
  }
};
