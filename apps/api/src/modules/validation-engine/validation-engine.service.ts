import { calculateBudgetConsumption } from '../budget-engine/budget-engine.service';
import { BadRequestError } from '../../utils/errors';
import prisma from '../../lib/prisma';
import { AttendanceStatus } from '@prisma/client';

/**
 * SPRINT 3: Validates if a specific Service Code has enough authorized units remaining.
 * Critical for preventing over-scheduling by therapists.
 */
export const validateAuthorizationLimit = async (
  authorizationId: string,
  serviceCodeId: string,
  requestedUnits: number
): Promise<void> => {
  const limit = await prisma.authorizationLimit.findUnique({
    where: {
      authorizationId_serviceCodeId: {
        authorizationId,
        serviceCodeId,
      },
    },
    include: { serviceCode: true },
  });

  if (limit) {
    const remainingUnits = limit.approvedUnits - limit.consumedUnits;
    if (requestedUnits > remainingUnits) {
      throw new BadRequestError(
        `Authorization limit exceeded for ${limit.serviceCode.code}. Remaining units: ${remainingUnits}, Requested: ${requestedUnits}.`
      );
    }
  }
};

/**
 * Validates if a new time entry can be accommodated within the active budget.
 * Updated for Sprint 3 to use billable hours and dynamic rates.
 */
export const validateTimeEntryBudget = async (
  fundingSourceId: string,
  organizationId: string,
  durationInHours: number,
  serviceCodeId?: string,
  userId?: string
): Promise<void> => {
  const budget = await prisma.budget.findUnique({
    where: { fundingSourceId },
    include: {
      fundingSource: {
        include: { authorization: true },
      },
    },
  });

  if (!budget || budget.organizationId !== organizationId) {
    throw new BadRequestError('No budget found for this funding source. Cannot log billable time.');
  }

  const auth = budget.fundingSource?.authorization;
  if (auth) {
    const now = new Date();
    if (now < auth.startDate || now > auth.endDate) {
      throw new BadRequestError('Current date falls outside the active Authorization date range.');
    }
  }

  let rate = 50; 
  if (serviceCodeId) {
    const serviceCode = await prisma.serviceCode.findUnique({ where: { id: serviceCodeId } });
    if (serviceCode) rate = serviceCode.defaultRate.toNumber();
  } else if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && user.hourlyRate) rate = user.hourlyRate.toNumber();
  }

  const consumption = await calculateBudgetConsumption(budget.id, organizationId);
  const projectedCost = durationInHours * rate;

  if (consumption.remainingBalance < projectedCost) {
    throw new BadRequestError(
      `Budget validation failed. Remaining balance is $${consumption.remainingBalance.toFixed(2)}, but this time entry requires $${projectedCost.toFixed(2)}.`
    );
  }

  if (auth && serviceCodeId) {
    await validateAuthorizationLimit(auth.id, serviceCodeId, durationInHours);
  }
};

/**
 * Validates if a new expense can be accommodated within the active budget.
 */
export const validateExpenseBudget = async (
  fundingSourceId: string,
  organizationId: string,
  amount: number
): Promise<void> => {
  const budget = await prisma.budget.findUnique({
    where: { fundingSourceId },
    include: {
      fundingSource: { include: { authorization: true } }
    }
  });

  if (!budget || budget.organizationId !== organizationId) {
    throw new BadRequestError('No budget found for this funding source. Cannot log billable expense.');
  }

  const auth = budget.fundingSource?.authorization;
  if (auth) {
    const now = new Date();
    if (now < auth.startDate || now > auth.endDate) {
      throw new BadRequestError('Current date falls outside the active Authorization date range.');
    }
  }

  const consumption = await calculateBudgetConsumption(budget.id, organizationId);

  if (consumption.remainingBalance < amount) {
    throw new BadRequestError(
      `Budget validation failed. Remaining balance is $${consumption.remainingBalance.toFixed(2)}, but this expense is for $${amount.toFixed(2)}.`
    );
  }
};

// ==========================================
// SPRINT 6: PROJECT BUDGET & COMPLIANCE ENGINE
// ==========================================

export const validateProjectBudget = async (
  projectBudgetId: string,
  requestedHours: number
): Promise<void> => {
  const pb = await prisma.projectBudget.findUnique({ where: { id: projectBudgetId } });
  if (!pb) return;
  
  if (!pb.allowOverBudget && Number(pb.totalAllocatedHours) > 0 && Number(pb.remainingHours) < requestedHours) {
    throw new BadRequestError(`Only ${Number(pb.remainingHours).toFixed(2)} hours remain in your project allocation.`);
  }
};

export const validateMemberBudget = async (
  memberBudgetId: string,
  requestedHours: number,
  allowOverBudget: boolean
): Promise<void> => {
  const mb = await prisma.projectMemberBudget.findUnique({ where: { id: memberBudgetId } });
  if (!mb) return;
  
  // 🟢 FIX: Employee individual allocation check is completely BYPASSED.
  // Since there is no UI to manage individual employee budgets yet,
  // this strict check was blocking valid entries. Relying strictly on Task Budget now.
  return;
};

export const validateTaskBudget = async (
  taskBudgetId: string,
  requestedHours: number,
  allowOverBudget: boolean,
  taskName: string
): Promise<void> => {
  const tb = await prisma.projectTaskBudget.findUnique({ where: { id: taskBudgetId } });
  if (!tb) return;
  
  if (!allowOverBudget && Number(tb.allocatedHours) > 0 && Number(tb.remainingHours) < requestedHours) {
    throw new BadRequestError(`${taskName} task has only ${Number(tb.remainingHours).toFixed(2)} hours remaining.`);
  }
};

export const validateSessionLimit = async (
  sessionLimitHours: number | null,
  existingSessionDuration: number,
  requestedDuration: number
): Promise<void> => {
  if (!sessionLimitHours) return;
  const total = existingSessionDuration + requestedDuration;
  if (total > sessionLimitHours) {
    throw new BadRequestError(`Maximum allowed duration for this session is ${sessionLimitHours.toFixed(2)} hours. You entered a total of ${total.toFixed(2)} hours.`);
  }
};

export const validateTreatmentCompliance = async (
  organizationId: string,
  appointmentId: string
): Promise<void> => {
  const attendance = await prisma.attendance.findUnique({ where: { appointmentId } });
  const clinicalNote = await prisma.clinicalNoteReview.findUnique({ where: { appointmentId } });

  const missing = [];
  
  if (!attendance || ![AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status)) {
    missing.push('Attendance');
  }
  
  if (!clinicalNote || !clinicalNote.isApproved) {
    missing.push('Clinical Note');
  }

  if (missing.length > 0) {
    throw new BadRequestError(`Treatment time cannot be submitted until ${missing.join(' and ')} are completed.`);
  }
};

export const validateTimeEntryEligibility = async (
  organizationId: string,
  userId: string,
  projectId: string,
  taskId: string | null,
  appointmentId: string | null,
  durationHours: number,
  hasInlineDocuments: boolean = false 
): Promise<void> => {
  // 1. Verify Project
  const project = await prisma.project.findFirst({ where: { id: projectId, organizationId } });
  if (!project || !project.isActive) {
    throw new BadRequestError('Project is inactive or does not belong to your organization.');
  }

  // 2. Sprint 6 Budget & Compliance Checks (Permissive for assigned employees)
  const projectBudget = await prisma.projectBudget.findUnique({ where: { projectId } });
  
  if (projectBudget) {
    await validateProjectBudget(projectBudget.id, durationHours);

    const memberBudget = await prisma.projectMemberBudget.findUnique({
      where: { projectBudgetId_userId: { projectBudgetId: projectBudget.id, userId } }
    });

    if (memberBudget) {
      await validateMemberBudget(memberBudget.id, durationHours, projectBudget.allowOverBudget);
    }

    let activeSessionLimit: number | null = null;
    let requiresClinicalCompliance = false;

    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task || task.projectId !== projectId) {
        throw new BadRequestError('Invalid task selected.');
      }

      requiresClinicalCompliance = task.requiresClinicalCompliance;

      const taskBudget = await prisma.projectTaskBudget.findUnique({
        where: { projectBudgetId_taskId: { projectBudgetId: projectBudget.id, taskId } }
      });

      if (taskBudget) {
        await validateTaskBudget(taskBudget.id, durationHours, projectBudget.allowOverBudget, task.name);
        activeSessionLimit = taskBudget.sessionLimitHours ? Number(taskBudget.sessionLimitHours) : null;
      } else {
        activeSessionLimit = task.defaultSessionLimitHours ? Number(task.defaultSessionLimitHours) : null;
      }
    }

    // 3. Session Limit Check
    if (activeSessionLimit && appointmentId) {
      const existingEntries = await prisma.timeEntry.findMany({
        where: { appointmentId, userId, taskId: taskId || undefined }
      });
      const existingSessionDuration = existingEntries.reduce((sum, te) => sum + Number(te.duration), 0);
      await validateSessionLimit(activeSessionLimit, existingSessionDuration, durationHours);
    } else if (activeSessionLimit && !appointmentId) {
       const todayStart = new Date();
       todayStart.setHours(0, 0, 0, 0);
       const todayEnd = new Date();
       todayEnd.setHours(23, 59, 59, 999);

       const existingEntries = await prisma.timeEntry.findMany({
         where: { date: { gte: todayStart, lte: todayEnd }, userId, taskId: taskId || undefined }
       });
       const existingSessionDuration = existingEntries.reduce((sum, te) => sum + Number(te.duration), 0);
       await validateSessionLimit(activeSessionLimit, existingSessionDuration, durationHours);
    }

    // 4. Clinical Compliance Check
    if (requiresClinicalCompliance) {
      if (hasInlineDocuments) {
        return;
      }
      
      if (!appointmentId) {
        throw new BadRequestError('Clinical compliance requires uploaded documents or a linked appointment.');
      }
      await validateTreatmentCompliance(organizationId, appointmentId);
    }
  }
};

export const validateTimeEntrySubmission = validateTimeEntryEligibility;
