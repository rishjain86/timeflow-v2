import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { NotFoundError, BadRequestError, UnauthorizedError } from '../../utils/errors';
import { validateTimeEntryEligibility } from '../validation-engine/validation-engine.service';
import { recalculateProjectBudget } from '../project-budget/project-budget-engine.service';

export interface CreateTimeEntryDTO {
  date: string;
  duration: number | string; 
  description?: string;
  isBillable?: boolean | string; 
  projectId: string;
  clientId?: string;
  taskId?: string;
  fundingSourceId?: string;
  serviceCodeId?: string;
  appointmentId?: string;
}

export const createTimeEntry = async (
  organizationId: string,
  userId: string,
  data: CreateTimeEntryDTO,
  files?: any
) => {
  const durationNum = Number(data.duration);
  const isBillableBool = data.isBillable === undefined ? true : String(data.isBillable) === 'true';

  if (!data.description || data.description.trim() === '') {
    throw new BadRequestError('Notes (Tx Session Details) are mandatory. Please provide a description of the work done.');
  }

  let cnrDocumentUrl: string | undefined;
  let attendanceDocumentUrl: string | undefined;

  if (files) {
    const cnr = files['cnrDocument']?.[0];
    const attendance = files['attendanceDocument']?.[0];
    if (cnr) cnrDocumentUrl = cnr.path || cnr.location || cnr.filename;
    if (attendance) attendanceDocumentUrl = attendance.path || attendance.location || attendance.filename;
  }

  await validateTimeEntryEligibility(
    organizationId,
    userId,
    data.projectId,
    data.taskId || null,
    data.appointmentId || null,
    durationNum,
    !!(cnrDocumentUrl && attendanceDocumentUrl) 
  );

  const timeEntry = await prisma.$transaction(async (tx) => {
    if (data.clientId) {
      const client = await tx.client.findFirst({
        where: { id: data.clientId, organizationId },
      });
      if (!client) {
        throw new NotFoundError('Client not found or does not belong to your organization');
      }
    }

    let appliedRate: number | null = null;
    let billableAmount: number | null = null;
    
    const projectRecord = await tx.project.findUnique({ where: { id: data.projectId } });
    let taskRecord = null;

    if (isBillableBool !== false) {
      let taskRate = null;
      let customTaskRate = null;

      if (data.taskId) {
        taskRecord = await tx.task.findUnique({ where: { id: data.taskId } });
        if (taskRecord?.hourlyRate) {
          taskRate = Number(taskRecord.hourlyRate);
        }

        const projectTaskRate = await tx.projectTaskRate.findUnique({
          where: { projectId_taskId: { projectId: data.projectId, taskId: data.taskId } }
        });
        if (projectTaskRate?.customRate !== undefined && projectTaskRate?.customRate !== null) {
          customTaskRate = Number(projectTaskRate.customRate);
        }
      }

      const projectRate = projectRecord?.hourlyRate ? Number(projectRecord.hourlyRate) : null;
      appliedRate = customTaskRate ?? taskRate ?? projectRate ?? 0;

      if (appliedRate === 0) {
        throw new BadRequestError('Cannot log billable time: No hourly rate is set for this task or project. Please edit the task to add a rate first.');
      }

      billableAmount = appliedRate * durationNum; 
    } else if (data.taskId) {
      taskRecord = await tx.task.findUnique({ where: { id: data.taskId } });
    }

    if (billableAmount !== null && billableAmount > 0 && projectRecord?.budget) {
      const projectBudgetLimit = Number(projectRecord.budget);
      
      const currentBilled = await tx.timeEntry.aggregate({
        where: { projectId: data.projectId, isBillable: true },
        _sum: { billableAmount: true }
      });
      
      const totalBilledSoFar = Number(currentBilled._sum.billableAmount || 0);
      const newTotal = totalBilledSoFar + billableAmount;

      if (newTotal > projectBudgetLimit) {
        const availableAmount = Math.max(0, projectBudgetLimit - totalBilledSoFar);
        throw new BadRequestError(`OVER BUDGET: This entry costs $${billableAmount.toFixed(2)}, but only $${availableAmount.toFixed(2)} remains in the project's $${projectBudgetLimit.toFixed(2)} monetary budget.`);
      }
    }

    const timeEntryData: any = {
      date: new Date(data.date),
      duration: durationNum, 
      description: data.description,
      isBillable: isBillableBool, 
      projectId: data.projectId,
      clientId: data.clientId || projectRecord?.clientId || null,
      taskId: data.taskId,
      fundingSourceId: data.fundingSourceId,
      serviceCodeId: data.serviceCodeId,
      appointmentId: data.appointmentId,
      userId,
      organizationId,
      hourlyRate: appliedRate,
      billableAmount: billableAmount,
    };

    if (cnrDocumentUrl) timeEntryData.cnrDocumentUrl = cnrDocumentUrl;
    if (attendanceDocumentUrl) timeEntryData.attendanceDocumentUrl = attendanceDocumentUrl;

    const createdEntry = await tx.timeEntry.create({
      data: timeEntryData,
    });

    await tx.auditLog.create({
      data: {
        action: 'CREATED',
        entityType: 'TIME_ENTRY',
        entityId: createdEntry.id,
        userId,
        organizationId,
        details: { 
          duration: durationNum, 
          description: data.description,
          projectName: projectRecord?.name || 'Unknown Project',
          taskName: taskRecord?.name || 'General Task'
        } as any
      }
    });

    return createdEntry;
  });

  try {
    await recalculateProjectBudget(organizationId, data.projectId);
  } catch (error: any) {
    console.warn('⚠️ Budget recalculation skipped:', error.message);
  }

  return timeEntry;
};

export interface UpdateTimeEntryDTO {
  date?: string;
  duration?: number | string;
  description?: string;
  isBillable?: boolean | string;
  projectId?: string;
  clientId?: string;
  taskId?: string;
  fundingSourceId?: string;
  serviceCodeId?: string;
  appointmentId?: string;
  isManagerOverride?: boolean | string; 
}

export const updateTimeEntry = async (
  id: string,
  organizationId: string,
  userId: string,
  data: UpdateTimeEntryDTO
) => {
  if (data.description !== undefined && data.description.trim() === '') {
    throw new BadRequestError('Notes (Tx Session Details) cannot be empty.');
  }

  const currentEntry = await prisma.timeEntry.findFirst({
    where: { id, organizationId },
    include: { project: true, task: true } 
  });

  if (!currentEntry) {
    throw new NotFoundError('Time entry not found');
  }

  // 🟢 NEW DB ROLE CHECK: Verify directly from DB if user is an Admin/Manager
  const reqUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isManager = reqUser?.role === 'ADMIN' || reqUser?.role === 'MANAGER' || reqUser?.role === 'SUPER_ADMIN';

  // 🟢 If APPROVED, block regular users. Let Managers pass naturally.
  if (currentEntry.approvalStatus === 'APPROVED' && !isManager) {
      throw new BadRequestError('This entry is APPROVED and LOCKED. Only an Admin/Manager can modify it.');
  }

  if (['BILLED', 'PROCESSING', 'READY'].includes(currentEntry.billingStatus || '')) {
    throw new BadRequestError(`Cannot update a time entry with billing status: ${currentEntry.billingStatus}`);
  }

  const newProjectId = data.projectId || currentEntry.projectId;
  const newTaskId = data.taskId !== undefined ? data.taskId : currentEntry.taskId;
  const newAppointmentId = data.appointmentId !== undefined ? data.appointmentId : currentEntry.appointmentId;
  const newDuration = data.duration !== undefined ? Number(data.duration) : Number(currentEntry.duration);
  const finalIsBillable = data.isBillable !== undefined ? (String(data.isBillable) === 'true') : currentEntry.isBillable;

  if (
    data.duration !== undefined ||
    data.projectId !== undefined ||
    data.taskId !== undefined ||
    data.appointmentId !== undefined
  ) {
    const isSameTask = currentEntry.projectId === newProjectId && currentEntry.taskId === newTaskId;
    const netDurationForValidation = isSameTask ? Math.max(0, newDuration - Number(currentEntry.duration)) : newDuration;

    await validateTimeEntryEligibility(
      organizationId,
      userId,
      newProjectId,
      newTaskId || null,
      newAppointmentId || null,
      netDurationForValidation, 
      !!(currentEntry.cnrDocumentUrl && currentEntry.attendanceDocumentUrl) 
    );
  }

  const updatedEntry = await prisma.$transaction(async (tx) => {
    let appliedRate: number | null = currentEntry.hourlyRate ? Number(currentEntry.hourlyRate) : null;
    let billableAmount: number | null = null;
    
    const pRecord = await tx.project.findUnique({ where: { id: newProjectId } });

    if (finalIsBillable) {
       if (data.taskId !== undefined || data.projectId !== undefined) {
           let taskRate = null;
           let customTaskRate = null; 
           
           if (newTaskId) {
               const t = await tx.task.findUnique({ where: { id: newTaskId } });
               if (t?.hourlyRate) taskRate = Number(t.hourlyRate);

               const projectTaskRate = await tx.projectTaskRate.findUnique({
                 where: { projectId_taskId: { projectId: newProjectId, taskId: newTaskId } }
               });
               if (projectTaskRate?.customRate !== undefined && projectTaskRate?.customRate !== null) {
                 customTaskRate = Number(projectTaskRate.customRate);
               }
           }
           const projectRate = pRecord?.hourlyRate ? Number(pRecord.hourlyRate) : null;
           
           appliedRate = customTaskRate ?? taskRate ?? projectRate ?? 0;
       } else if (appliedRate === null) {
           appliedRate = 0;
       }

       if (appliedRate === 0) {
         throw new BadRequestError('Cannot update billable time: Hourly rate is missing. Please edit the task to assign a valid rate first.');
       }

       billableAmount = appliedRate * newDuration;
    } else {
       appliedRate = null;
       billableAmount = null;
    }

    if (billableAmount !== null && billableAmount > 0 && pRecord?.budget) {
      const projectBudgetLimit = Number(pRecord.budget);
      
      const currentBilled = await tx.timeEntry.aggregate({
        where: { projectId: newProjectId, isBillable: true },
        _sum: { billableAmount: true }
      });
      
      const oldAmount = (currentEntry.projectId === newProjectId) ? Number(currentEntry.billableAmount || 0) : 0;
      const totalBilledSoFar = Number(currentBilled._sum.billableAmount || 0) - oldAmount;
      
      const newTotal = totalBilledSoFar + billableAmount;

      if (newTotal > projectBudgetLimit) {
        const availableAmount = Math.max(0, projectBudgetLimit - totalBilledSoFar);
        throw new BadRequestError(`OVER BUDGET: Updating this costs $${billableAmount.toFixed(2)}, but only $${availableAmount.toFixed(2)} remains of the project budget.`);
      }
    }

    const updates: Prisma.TimeEntryUpdateInput = {
      date: data.date ? new Date(data.date) : undefined,
      duration: data.duration !== undefined ? Number(data.duration) : undefined, 
      description: data.description,
      isBillable: data.isBillable !== undefined ? finalIsBillable : undefined, 
      hourlyRate: appliedRate,
      billableAmount: billableAmount,
    };

    let actionName = 'UPDATED';

    if (currentEntry.approvalStatus === 'REJECTED') {
      updates.approvalStatus = 'PENDING';
      updates.rejectionReason = null;
      updates.isResubmitted = true;
      actionName = 'RESUBMITTED';
    }

    if (data.projectId) updates.project = { connect: { id: data.projectId } };
    
    if (data.clientId !== undefined) {
      updates.client = data.clientId ? { connect: { id: data.clientId } } : { disconnect: true };
    } else if (!currentEntry.clientId && pRecord?.clientId) {
      updates.client = { connect: { id: pRecord.clientId } };
    }

    if (data.taskId !== undefined) updates.task = data.taskId ? { connect: { id: data.taskId } } : { disconnect: true };
    if (data.fundingSourceId !== undefined) updates.fundingSource = data.fundingSourceId ? { connect: { id: data.fundingSourceId } } : { disconnect: true };
    if (data.serviceCodeId !== undefined) updates.serviceCode = data.serviceCodeId ? { connect: { id: data.serviceCodeId } } : { disconnect: true };
    if (data.appointmentId !== undefined) updates.appointment = data.appointmentId ? { connect: { id: data.appointmentId } } : { disconnect: true };

    Object.keys(updates).forEach(
      (key) => updates[key as keyof Prisma.TimeEntryUpdateInput] === undefined && delete updates[key as keyof Prisma.TimeEntryUpdateInput]
    );

    const updatedRec = await tx.timeEntry.update({
      where: { id },
      data: updates,
    });

    await tx.auditLog.create({
      data: {
        action: actionName,
        entityType: 'TIME_ENTRY',
        entityId: id,
        userId,
        organizationId,
        details: { 
          previousDuration: Number(currentEntry.duration), 
          newDuration, 
          message: actionName === 'RESUBMITTED' ? 'Employee fixed and resubmitted' : 'Time entry updated',
          projectName: pRecord?.name || currentEntry.project?.name || 'Unknown Project',
          wasApproved: currentEntry.approvalStatus === 'APPROVED' // 🟢 ADDED TAG
        } as any
      }
    });

    return updatedRec;
  });

  try {
    await recalculateProjectBudget(organizationId, newProjectId);
    if (data.projectId && data.projectId !== currentEntry.projectId) {
      await recalculateProjectBudget(organizationId, currentEntry.projectId);
    }
  } catch (error: any) {
    console.warn('⚠️ Budget recalculation skipped:', error.message);
  }

  return updatedEntry;
};

export interface ReviewTimeEntryDTO {
  approvalStatus: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

export const reviewTimeEntry = async (
  id: string,
  organizationId: string,
  userId: string,
  data: ReviewTimeEntryDTO
) => {
  const currentEntry = await prisma.timeEntry.findFirst({
    where: { id, organizationId },
    include: { project: true, task: true }
  });

  if (!currentEntry) {
    throw new NotFoundError('Time entry not found');
  }

  if (['BILLED', 'PROCESSING', 'READY'].includes(currentEntry.billingStatus || '')) {
    throw new BadRequestError(`Cannot review a time entry that is already in the billing process.`);
  }

  const updatedEntry = await prisma.timeEntry.update({
    where: { id },
    data: {
      approvalStatus: data.approvalStatus,
      rejectionReason: data.approvalStatus === 'REJECTED' ? data.rejectionReason : null,
      isResubmitted: data.approvalStatus === 'APPROVED' ? false : currentEntry.isResubmitted,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: data.approvalStatus === 'REJECTED' ? 'FIX_REQUESTED' : 'APPROVED',
      entityType: 'TIME_ENTRY',
      entityId: id,
      userId, 
      organizationId,
      details: { 
        reason: data.rejectionReason || 'No reason provided',
        duration: Number(currentEntry.duration),
        projectName: currentEntry.project?.name || 'Unknown Project'
      } as any
    }
  });

  return updatedEntry;
};

export interface GetTimeEntriesQuery {
  page: number;
  limit: number;
  projectId?: string;
  clientId?: string;
  fundingSourceId?: string;
  userId?: string;
  taskId?: string;
  startDate?: string;
  endDate?: string;
  isBillable?: boolean | string;
  approvalStatus?: string; 
  fetchLogs?: boolean | string; 
  currentUserId?: string;
  role?: string;
}

export const getTimeEntries = async (
  organizationId: string,
  query: GetTimeEntriesQuery
) => {
  const { 
    page, limit, projectId, clientId, fundingSourceId, userId, taskId, 
    startDate, endDate, isBillable, approvalStatus, currentUserId, role 
  } = query;

  const normalizedRole = String(role || '').toUpperCase();
  const isAdminOrManager = 
    normalizedRole === 'SUPER_ADMIN' || 
    normalizedRole === 'ADMIN' || 
    normalizedRole === 'MANAGER';
    
  const strictUserId = currentUserId;

  if (String(query.fetchLogs) === 'true') {
    const pg = Number(page) || 1;
    const lmt = Number(limit) || 20;
    const skip = (pg - 1) * lmt;

    const logWhere: any = { organizationId };

    if (!isAdminOrManager && strictUserId) {
        logWhere.userId = String(strictUserId);
    }

    const [logs, totalLogs] = await Promise.all([
      prisma.auditLog.findMany({
        where: logWhere,
        take: lmt,
        skip: skip,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, role: true } } }
      }),
      prisma.auditLog.count({ where: logWhere })
    ]);

    return {
      data: [],
      logs: logs, 
      meta: { total: totalLogs, page: pg, limit: lmt, totalPages: Math.ceil(totalLogs / lmt) },
    } as any;
  }

  const where: Prisma.TimeEntryWhereInput = {
    organizationId,
  };

  if (projectId) where.projectId = projectId;
  if (clientId) where.clientId = clientId;
  if (fundingSourceId) where.fundingSourceId = fundingSourceId;
  if (taskId) where.taskId = taskId;
  if (approvalStatus) where.approvalStatus = approvalStatus as any; 
  
  if (isBillable !== undefined) where.isBillable = String(isBillable) === 'true';

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  if (isAdminOrManager) {
    if (userId && userId !== 'undefined' && userId !== 'null' && String(userId).trim() !== '') {
      where.userId = String(userId);
    }
  } else {
    where.userId = String(strictUserId);
  }

  const skipRows = (page - 1) * limit;

  const [timeEntries, totalCount] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      skip: skipRows,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        project: { 
          select: { 
            id: true, 
            name: true,
            client: { select: { id: true, name: true } }
          } 
        },
        task: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        fundingSource: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.timeEntry.count({ where }),
  ]);

  const mappedTimeEntries = timeEntries.map(entry => ({
    ...entry,
    client: entry.client || (entry.project as any)?.client || null
  }));

  return {
    data: mappedTimeEntries,
    meta: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};

export const getTimeEntryById = async (id: string, organizationId: string) => {
  const timeEntry = await prisma.timeEntry.findFirst({
    where: { id, organizationId },
    include: {
      project: { 
        select: { 
          id: true, 
          name: true,
          client: { select: { id: true, name: true } } 
        } 
      },
      task: { select: { id: true, name: true } },
      client: { select: { id: true, name: true } },
      fundingSource: true,
      serviceCode: true,
      appointment: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!timeEntry) {
    throw new NotFoundError('Time entry not found');
  }

  const history = await prisma.auditLog.findMany({
      where: { entityId: id, organizationId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true, role: true } } }
  });

  return {
    ...timeEntry,
    client: timeEntry.client || (timeEntry.project as any)?.client || null,
    history
  };
};

// 🟢 DB ROLE CHECK ADDED TO DELETE
export const deleteTimeEntry = async (id: string, organizationId: string, userId?: string) => {
  const timeEntry = await prisma.timeEntry.findFirst({
    where: { id, organizationId },
    include: { project: true, task: true } 
  });

  if (!timeEntry) {
    throw new NotFoundError('Time entry not found');
  }

  let isManager = false;
  if (userId) {
    const reqUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    isManager = reqUser?.role === 'ADMIN' || reqUser?.role === 'MANAGER' || reqUser?.role === 'SUPER_ADMIN';
  }

  if (timeEntry.approvalStatus === 'APPROVED' && !isManager) {
    throw new BadRequestError('This entry is APPROVED and LOCKED. It cannot be deleted.');
  }

  if (['BILLED', 'PROCESSING', 'READY'].includes(timeEntry.billingStatus || '')) {
    throw new BadRequestError(`Cannot delete a time entry with billing status: ${timeEntry.billingStatus}`);
  }

  await prisma.timeEntry.delete({
    where: { id },
  });

  await prisma.auditLog.create({
    data: {
      action: 'DELETED',
      entityType: 'TIME_ENTRY',
      entityId: id,
      userId: timeEntry.userId,
      organizationId,
      details: { 
        duration: Number(timeEntry.duration),
        projectName: timeEntry.project?.name || 'Unknown Project',
        taskName: timeEntry.task?.name || 'General Task',
        wasApproved: timeEntry.approvalStatus === 'APPROVED' // 🟢 ADDED TAG
      } as any
    }
  });

  try {
    await recalculateProjectBudget(organizationId, timeEntry.projectId);
  } catch (error: any) {
    console.warn('⚠️ Budget recalculation skipped:', error.message);
  }

  return { message: 'Time entry deleted successfully' };
};

// ======================================================================
// 🟢 NEW INDEPENDENT FEATURE: MOVE TIME ENTRY 
// Updated to support file uploads for compliance and DB Role-based lock bypass
// ======================================================================

export interface MoveTimeEntryDTO {
  newProjectId: string;
  newTaskId?: string | null;
  reason?: string;
  isManagerOverride?: boolean | string; 
}

export const moveTimeEntry = async (
  id: string,
  organizationId: string,
  userId: string, 
  data: MoveTimeEntryDTO,
  files?: any 
) => {
  const currentEntry = await prisma.timeEntry.findFirst({
    where: { id, organizationId },
    include: { project: true, task: true }
  });

  if (!currentEntry) throw new NotFoundError('Time entry not found');

  // 🟢 NEW DB ROLE CHECK: Verify directly from DB if user is an Admin/Manager
  const reqUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isManager = reqUser?.role === 'ADMIN' || reqUser?.role === 'MANAGER' || reqUser?.role === 'SUPER_ADMIN';

  // 🟢 NO MORE FRONTEND CHECK: Backend DB query decides if user is Manager
  if (currentEntry.approvalStatus === 'APPROVED' && !isManager) {
      throw new BadRequestError('This entry is APPROVED and LOCKED. Only an Admin/Manager can move it.');
  }

  if (['BILLED', 'PROCESSING', 'READY'].includes(currentEntry.billingStatus || '')) {
    throw new BadRequestError(`Cannot move a time entry with billing status: ${currentEntry.billingStatus}`);
  }

  const netDuration = Number(currentEntry.duration);
  const isExternalMove = currentEntry.projectId !== data.newProjectId;
  
  let finalIsBillable = currentEntry.isBillable;
  if (isExternalMove && !data.newTaskId) {
      finalIsBillable = false; 
  }

  let newCnrUrl = currentEntry.cnrDocumentUrl;
  let newAttendanceUrl = currentEntry.attendanceDocumentUrl;

  if (files) {
    const cnr = files['cnrDocument']?.[0];
    const attendance = files['attendanceDocument']?.[0];
    if (cnr) newCnrUrl = cnr.path || cnr.location || cnr.filename;
    if (attendance) newAttendanceUrl = attendance.path || attendance.location || attendance.filename;
  }

  await validateTimeEntryEligibility(
    organizationId,
    currentEntry.userId, 
    data.newProjectId,
    data.newTaskId || null,
    currentEntry.appointmentId || null,
    netDuration, 
    !!(newCnrUrl && newAttendanceUrl) 
  );

  const movedEntry = await prisma.$transaction(async (tx) => {
    let appliedRate: number | null = currentEntry.hourlyRate ? Number(currentEntry.hourlyRate) : null;
    let billableAmount: number | null = null;
    
    const newPRecord = await tx.project.findUnique({ where: { id: data.newProjectId } });

    if (finalIsBillable) {
       let taskRate = null;
       let customTaskRate = null; 

       if (data.newTaskId) {
           const t = await tx.task.findUnique({ where: { id: data.newTaskId } });
           if (t?.hourlyRate) taskRate = Number(t.hourlyRate);

           const projectTaskRate = await tx.projectTaskRate.findUnique({
             where: { projectId_taskId: { projectId: data.newProjectId, taskId: data.newTaskId } }
           });
           if (projectTaskRate?.customRate !== undefined && projectTaskRate?.customRate !== null) {
             customTaskRate = Number(projectTaskRate.customRate);
           }
       }
       const projectRate = newPRecord?.hourlyRate ? Number(newPRecord.hourlyRate) : null;
       
       appliedRate = customTaskRate ?? taskRate ?? projectRate ?? 0;

       if (appliedRate === 0) {
         throw new BadRequestError('Cannot move billable time: Hourly rate is missing on target task/project.');
       }

       billableAmount = appliedRate * netDuration;
    } else {
       appliedRate = null;
       billableAmount = null;
    }

    if (billableAmount !== null && billableAmount > 0 && newPRecord?.budget) {
      const projectBudgetLimit = Number(newPRecord.budget);
      const currentBilled = await tx.timeEntry.aggregate({
        where: { projectId: data.newProjectId, isBillable: true },
        _sum: { billableAmount: true }
      });
      
      const totalBilledSoFar = Number(currentBilled._sum.billableAmount || 0);
      const newTotal = totalBilledSoFar + billableAmount;

      if (newTotal > projectBudgetLimit) {
        const availableAmount = Math.max(0, projectBudgetLimit - totalBilledSoFar);
        throw new BadRequestError(`OVER BUDGET: Target project only has $${availableAmount.toFixed(2)} remaining.`);
      }
    }

    const updates: Prisma.TimeEntryUpdateInput = {
      project: { connect: { id: data.newProjectId } },
      isBillable: finalIsBillable, 
      hourlyRate: appliedRate,
      billableAmount: billableAmount,
      cnrDocumentUrl: newCnrUrl, 
      attendanceDocumentUrl: newAttendanceUrl 
    };

    if (data.newTaskId) {
      updates.task = { connect: { id: data.newTaskId } };
    } else {
      updates.task = { disconnect: true };
    }

    if (newPRecord?.clientId) {
      updates.client = { connect: { id: newPRecord.clientId } };
    } else if (currentEntry.clientId) {
      updates.client = { disconnect: true };
    }

    const updatedRec = await tx.timeEntry.update({
      where: { id },
      data: updates,
      include: { project: true, task: true }
    });

    await tx.auditLog.create({
      data: {
        action: 'MOVED',
        entityType: 'TIME_ENTRY',
        entityId: id,
        userId,
        organizationId,
        details: { 
          duration: netDuration, 
          reason: data.reason || 'Reassigned to another task/project',
          fromProject: currentEntry.project?.name || 'Unknown',
          toProject: updatedRec.project?.name || 'Unknown',
          fromTask: currentEntry.task?.name || 'General Task',
          toTask: updatedRec.task?.name || 'General Task',
          complianceUpdated: !!files,
          wasApproved: currentEntry.approvalStatus === 'APPROVED' // 🟢 ADDED TAG
        } as any
      }
    });

    return updatedRec;
  }, {
    timeout: 10000
  });

  try {
    await recalculateProjectBudget(organizationId, data.newProjectId);
    if (data.newProjectId !== currentEntry.projectId) {
      await recalculateProjectBudget(organizationId, currentEntry.projectId);
    }
  } catch (error: any) {
    console.warn('⚠️ Budget recalculation skipped:', error.message);
  }

  return movedEntry;
};
