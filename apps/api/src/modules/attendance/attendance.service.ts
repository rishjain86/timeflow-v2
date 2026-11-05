import { prisma } from '../../config/prisma';
import { AttendanceStatus } from '@prisma/client';

export const createAttendance = async (
  organizationId: string,
  data: {
    appointmentId: string;
    sessionDate?: string;
    status?: AttendanceStatus;
    therapistSigned?: boolean;
    clientSigned?: boolean;
  }
) => {
  const appointment = await prisma.appointment.findFirst({
    where: { id: data.appointmentId, organizationId },
  });

  if (!appointment) {
    throw new Error('Appointment not found or does not belong to your organization');
  }

  const existing = await prisma.attendance.findUnique({
    where: { appointmentId: data.appointmentId },
  });

  if (existing) {
    throw new Error('Attendance record already exists for this appointment');
  }

  const isFullySigned = data.therapistSigned && data.clientSigned;

  return prisma.attendance.create({
    data: {
      appointmentId: data.appointmentId,
      organizationId,
      sessionDate: data.sessionDate ? new Date(data.sessionDate) : new Date(),
      status: data.status ?? AttendanceStatus.PRESENT,
      therapistSigned: data.therapistSigned ?? false,
      clientSigned: data.clientSigned ?? false,
      signedAt: isFullySigned ? new Date() : null,
    },
  });
};

export const getAttendance = async (organizationId: string, id: string) => {
  const attendance = await prisma.attendance.findFirst({
    where: { id, organizationId },
    include: { attachments: true },
  });

  if (!attendance) {
    throw new Error('Attendance record not found');
  }

  return attendance;
};

export const getAttendanceByAppointment = async (organizationId: string, appointmentId: string) => {
  const attendance = await prisma.attendance.findFirst({
    where: { appointmentId, organizationId },
    include: { attachments: true },
  });

  return attendance; // Can be null, and that's okay for validation checks
};

export const updateAttendance = async (
  organizationId: string,
  id: string,
  data: {
    sessionDate?: string;
    status?: AttendanceStatus;
    therapistSigned?: boolean;
    clientSigned?: boolean;
  }
) => {
  const attendance = await prisma.attendance.findFirst({
    where: { id, organizationId },
  });

  if (!attendance) {
    throw new Error('Attendance record not found');
  }

  const therapistSigned = data.therapistSigned ?? attendance.therapistSigned;
  const clientSigned = data.clientSigned ?? attendance.clientSigned;
  const isFullySigned = therapistSigned && clientSigned;

  return prisma.attendance.update({
    where: { id },
    data: {
      sessionDate: data.sessionDate ? new Date(data.sessionDate) : undefined,
      status: data.status,
      therapistSigned: data.therapistSigned,
      clientSigned: data.clientSigned,
      signedAt: (isFullySigned && !attendance.signedAt) ? new Date() : attendance.signedAt,
    },
  });
};

export const verifyAttendanceCompleteness = async (organizationId: string, appointmentId: string) => {
  const attendance = await prisma.attendance.findFirst({
    where: { appointmentId, organizationId },
  });

  if (!attendance) {
    return { exists: false, isComplete: false };
  }

  // Master Prompt Business Rule: 
  // PRESENT and LATE allow for treatment/billing time entry.
  // ABSENT and EXCUSED generally block treatment time (unless specific overrides exist).
  const isEligibleForTreatment = [AttendanceStatus.PRESENT, AttendanceStatus.LATE].includes(attendance.status);

  return {
    exists: true,
    status: attendance.status,
    isComplete: isEligibleForTreatment,
  };
};
