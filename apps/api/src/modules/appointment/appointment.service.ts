import { AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { encryptField, decryptField } from '../../utils/phi-crypto';
import { BadRequestError, NotFoundError, ConflictError } from '../../utils/errors';
import { 
  CreateAppointmentInput, 
  UpdateAppointmentInput,
  SubmitAttendanceInput,
  SubmitCNRInput,
  ApproveCNRInput
} from './schemas/appointment.schema';

export interface GetAppointmentsFilters {
  page: number;
  limit: number;
  clientId?: string;
  therapistId?: string;
  status?: AppointmentStatus;
  startDate?: string;
  endDate?: string;
}

export const createAppointment = async (
  organizationId: string,
  data: CreateAppointmentInput
) => {
  // 1. Verify all relationships exist and belong to the organization
  const [client, therapist, serviceCode] = await Promise.all([
    prisma.client.findFirst({ where: { id: data.clientId, organizationId } }),
    prisma.therapistProfile.findFirst({ where: { id: data.therapistId, organizationId } }),
    prisma.serviceCode.findFirst({ where: { id: data.serviceCodeId, organizationId } }),
  ]);

  if (!client) throw new NotFoundError('Client not found in your organization');
  if (!therapist) throw new NotFoundError('Therapist not found in your organization');
  if (!serviceCode) throw new NotFoundError('Service code not found in your organization');

  const startTime = new Date(data.startTime);
  const endTime = new Date(data.endTime);

  // 2. Prevent Double Booking for the Therapist
  const overlappingAppointment = await prisma.appointment.findFirst({
    where: {
      organizationId,
      therapistId: data.therapistId,
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      OR: [
        {
          // New appointment starts during an existing appointment
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      ],
    },
  });

  if (overlappingAppointment) {
    throw new ConflictError('Therapist is already booked for this time slot');
  }

  // 3. Create the Appointment
  return prisma.appointment.create({
    data: {
      organizationId,
      clientId: data.clientId,
      therapistId: data.therapistId,
      serviceCodeId: data.serviceCodeId,
      startTime,
      endTime,
      status: data.status || AppointmentStatus.SCHEDULED,
      modality: data.modality,
      notes: data.notes,
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
      therapist: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      serviceCode: { select: { id: true, code: true, description: true } },
    },
  });
};

export const updateAppointment = async (
  id: string,
  organizationId: string,
  data: UpdateAppointmentInput
) => {
  const existing = await prisma.appointment.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new NotFoundError('Appointment not found');
  }

  // If changing therapist, verify the new therapist
  if (data.therapistId && data.therapistId !== existing.therapistId) {
    const therapist = await prisma.therapistProfile.findFirst({
      where: { id: data.therapistId, organizationId },
    });
    if (!therapist) throw new NotFoundError('New therapist not found');
  }

  // Check for overlaps if time or therapist is updated
  const checkStartTime = data.startTime ? new Date(data.startTime) : existing.startTime;
  const checkEndTime = data.endTime ? new Date(data.endTime) : existing.endTime;
  const checkTherapistId = data.therapistId || existing.therapistId;

  if (data.startTime || data.endTime || data.therapistId) {
    const overlap = await prisma.appointment.findFirst({
      where: {
        id: { not: id }, // Exclude current appointment
        organizationId,
        therapistId: checkTherapistId,
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
        startTime: { lt: checkEndTime },
        endTime: { gt: checkStartTime },
      },
    });

    if (overlap) {
      throw new ConflictError('Therapist is already booked for this updated time slot');
    }
  }

  // Update
  return prisma.appointment.update({
    where: { id },
    data: {
      therapistId: data.therapistId,
      serviceCodeId: data.serviceCodeId,
      startTime: data.startTime ? new Date(data.startTime) : undefined,
      endTime: data.endTime ? new Date(data.endTime) : undefined,
      status: data.status,
      modality: data.modality,
      notes: data.notes,
    },
    include: {
      client: { select: { id: true, name: true } },
      therapist: { include: { user: { select: { firstName: true, lastName: true } } } },
      serviceCode: true,
    },
  });
};

export const getAppointments = async (
  organizationId: string,
  filters: GetAppointmentsFilters
) => {
  const { page, limit, clientId, therapistId, status, startDate, endDate } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.AppointmentWhereInput = {
    organizationId,
    ...(clientId && { clientId }),
    ...(therapistId && { therapistId }),
    ...(status && { status }),
  };

  // Date range filtering
  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime.gte = new Date(startDate);
    if (endDate) where.startTime.lte = new Date(endDate);
  }

  const [total, data] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startTime: 'asc' },
      include: {
        client: { select: { id: true, name: true } },
        therapist: { include: { user: { select: { firstName: true, lastName: true } } } },
        serviceCode: { select: { id: true, code: true } },
      },
    }),
  ]);

  return {
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data,
  };
};

export const getAppointmentById = async (id: string, organizationId: string) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id, organizationId },
    include: {
      client: true,
      therapist: {
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      },
      serviceCode: true,
      timeEntry: true, // Pulls billing data if the appointment is completed and billed
    },
  });

  if (!appointment) {
    throw new NotFoundError('Appointment not found');
  }

  return appointment;
};

// ==========================================
// SPRINT 4: Session Card & Verification API
// ==========================================

export const getSessionCardSummary = async (appointmentId: string, organizationId: string) => {
  // 1. Fetch complete appointment graph including SPRINT 4 relations
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: organizationId,
    },
    include: {
      client: true,
      therapist: {
        include: { user: { select: { firstName: true, lastName: true } } }
      },
      serviceCode: true,
      attendance: true,
      clinicalNote: true,
      timeEntry: true,
    },
  });

  if (!appointment) {
    throw new NotFoundError('Appointment not found or access denied.');
  }

  // 2. Compute Verification Status (Granular checks)
  const attendance = appointment.attendance;
  const cnr = appointment.clinicalNote;

  const verificationStatus = {
    attendance: {
      isUploaded: !!attendance,
      therapistSigned: attendance?.therapistSigned || false,
      patientSigned: attendance?.clientSigned || false,
    },
    cnr: {
      isUploaded: !!cnr,
      therapistSigned: cnr?.therapistSigned || false,
      patientSigned: cnr?.clientSigned || false,
      isManagerApproved: cnr?.isApproved || false,
    }
  };

  // 3. Compute Billing Eligibility & Hold Reasons
  const holdReasons: string[] = [];

  if (!verificationStatus.attendance.isUploaded) holdReasons.push('Attendance record is missing.');
  if (!verificationStatus.attendance.therapistSigned) holdReasons.push('Therapist signature missing on Attendance.');
  if (!verificationStatus.attendance.patientSigned) holdReasons.push('Patient signature missing on Attendance.');

  if (!verificationStatus.cnr.isUploaded) holdReasons.push('Clinical Notes (CNR) record is missing.');
  if (!verificationStatus.cnr.therapistSigned) holdReasons.push('Therapist signature missing on CNR.');
  if (!verificationStatus.cnr.patientSigned) holdReasons.push('Patient signature missing on CNR.');
  if (verificationStatus.cnr.isUploaded && !verificationStatus.cnr.isManagerApproved) holdReasons.push('Manager approval pending for CNR.');

  const isEligibleForBilling = holdReasons.length === 0;

  // 4. Return formatted response for the frontend UI
  return {
    sessionInfo: {
      appointmentId: appointment.id,
      date: appointment.startTime,
      duration: appointment.timeEntry?.duration || null,
      status: appointment.status,
    },
    patient: {
      id: appointment.client?.id,
      name: appointment.client?.name,
    },
    therapist: {
      id: appointment.therapist?.id,
      name: `${appointment.therapist?.user?.firstName} ${appointment.therapist?.user?.lastName || ''}`.trim(),
    },
    billingDetails: {
      serviceCode: appointment.serviceCode?.code,
      rate: appointment.serviceCode?.defaultRate,
      isBillable: appointment.timeEntry?.isBillable || false,
    },
    verificationStatus,
    eligibility: {
      isEligible: isEligibleForBilling,
      holdReasons: holdReasons,
      readyForBillingFlag: isEligibleForBilling && appointment.timeEntry?.isBillable,
    }
  };
};

// ==========================================
// SPRINT 4: Digital Forms Submission Logic
// ==========================================

export const submitAttendance = async (
  appointmentId: string,
  organizationId: string,
  data: SubmitAttendanceInput
) => {
  // Ensure appointment exists and belongs to the correct org
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId }
  });
  
  if (!appointment) throw new NotFoundError('Appointment not found');

  // A fully signed attendance record is a legal document: it is locked against further edits.
  const existingAttendance = await prisma.attendance.findUnique({ where: { appointmentId } });
  if (existingAttendance?.signedAt) {
    throw new ConflictError('Attendance has been fully signed and is locked.');
  }

  const isFullySigned = data.therapistSigned && data.clientSigned;

  return prisma.attendance.upsert({
    where: { appointmentId },
    update: {
      sessionDate: data.sessionDate ? new Date(data.sessionDate) : undefined,
      status: data.status,
      therapistSigned: data.therapistSigned,
      clientSigned: data.clientSigned,
      signedAt: isFullySigned ? new Date() : null,
    },
    create: {
      appointmentId,
      organizationId,
      sessionDate: data.sessionDate ? new Date(data.sessionDate) : new Date(),
      status: data.status || 'PRESENT',
      therapistSigned: data.therapistSigned,
      clientSigned: data.clientSigned,
      signedAt: isFullySigned ? new Date() : null,
    }
  });
};

export const submitCNR = async (
  appointmentId: string,
  organizationId: string,
  data: SubmitCNRInput
) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId }
  });
  
  if (!appointment) throw new NotFoundError('Appointment not found');

  // Approved clinical notes are immutable until a manager reopens them (which is audited).
  const existingCnr = await prisma.clinicalNoteReview.findUnique({ where: { appointmentId } });
  if (existingCnr?.isApproved) {
    throw new ConflictError('This clinical note is approved and locked. A manager must reopen it before it can be changed.');
  }
  const aad = `${organizationId}:${appointmentId}`;

  const isFullySigned = data.therapistSigned && data.clientSigned;

  const saved = await prisma.clinicalNoteReview.upsert({
    where: { appointmentId },
    update: {
      notes: encryptField(data.notes, aad),
      therapistSigned: data.therapistSigned,
      clientSigned: data.clientSigned,
      signedAt: isFullySigned ? new Date() : null,
    },
    create: {
      appointmentId,
      organizationId,
      notes: encryptField(data.notes, aad),
      therapistSigned: data.therapistSigned,
      clientSigned: data.clientSigned,
      signedAt: isFullySigned ? new Date() : null,
    }
  });
  return { ...saved, notes: decryptField(saved.notes, aad) };
};

export const approveCNR = async (
  appointmentId: string,
  organizationId: string,
  data: ApproveCNRInput
) => {
  const cnr = await prisma.clinicalNoteReview.findUnique({
    where: { appointmentId }
  });
  
  if (!cnr || cnr.organizationId !== organizationId) {
    throw new NotFoundError('Clinical note not found for this appointment. Please submit CNR first.');
  }

  if (data.isApproved && !cnr.therapistSigned) {
    throw new BadRequestError('The therapist must sign the clinical note before it can be approved.');
  }
  if (data.isApproved && !cnr.notes) {
    throw new BadRequestError('An empty clinical note cannot be approved.');
  }

  return prisma.clinicalNoteReview.update({
    where: { appointmentId },
    data: {
      isApproved: data.isApproved,
    },
    // Approval responses never include the note text itself.
    select: {
      id: true,
      appointmentId: true,
      isApproved: true,
      therapistSigned: true,
      clientSigned: true,
      signedAt: true,
      reviewDate: true,
    },
  });
};

// Read a clinical note (decrypted). Access is audited by the PHI guard middleware.
export const getCNR = async (appointmentId: string, organizationId: string) => {
  const cnr = await prisma.clinicalNoteReview.findFirst({ where: { appointmentId, organizationId } });
  if (!cnr) throw new NotFoundError('No clinical note has been submitted for this appointment');
  return { ...cnr, notes: decryptField(cnr.notes, `${organizationId}:${appointmentId}`) };
};
