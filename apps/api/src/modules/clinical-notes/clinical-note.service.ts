import { prisma } from '../../config/prisma';

export const createClinicalNote = async (
  organizationId: string,
  data: {
    appointmentId: string;
    notes?: string;
    isApproved?: boolean;
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

  const existing = await prisma.clinicalNoteReview.findUnique({
    where: { appointmentId: data.appointmentId },
  });

  if (existing) {
    throw new Error('Clinical note record already exists for this appointment');
  }

  const isFullySigned = data.therapistSigned && data.clientSigned;

  return prisma.clinicalNoteReview.create({
    data: {
      appointmentId: data.appointmentId,
      organizationId,
      notes: data.notes,
      isApproved: data.isApproved ?? false,
      therapistSigned: data.therapistSigned ?? false,
      clientSigned: data.clientSigned ?? false,
      signedAt: isFullySigned ? new Date() : null,
      reviewDate: new Date(),
    },
  });
};

export const getClinicalNote = async (organizationId: string, id: string) => {
  const note = await prisma.clinicalNoteReview.findFirst({
    where: { id, organizationId },
    include: { attachments: true },
  });

  if (!note) {
    throw new Error('Clinical note record not found');
  }

  return note;
};

export const getClinicalNoteByAppointment = async (organizationId: string, appointmentId: string) => {
  const note = await prisma.clinicalNoteReview.findFirst({
    where: { appointmentId, organizationId },
    include: { attachments: true },
  });

  return note;
};

export const updateClinicalNote = async (
  organizationId: string,
  id: string,
  data: {
    notes?: string;
    isApproved?: boolean;
    therapistSigned?: boolean;
    clientSigned?: boolean;
  }
) => {
  const note = await prisma.clinicalNoteReview.findFirst({
    where: { id, organizationId },
  });

  if (!note) {
    throw new Error('Clinical note record not found');
  }

  const therapistSigned = data.therapistSigned ?? note.therapistSigned;
  const clientSigned = data.clientSigned ?? note.clientSigned;
  const isFullySigned = therapistSigned && clientSigned;

  return prisma.clinicalNoteReview.update({
    where: { id },
    data: {
      notes: data.notes,
      isApproved: data.isApproved,
      therapistSigned: data.therapistSigned,
      clientSigned: data.clientSigned,
      signedAt: (isFullySigned && !note.signedAt) ? new Date() : note.signedAt,
    },
  });
};

export const verifyClinicalNoteCompleteness = async (organizationId: string, appointmentId: string) => {
  const note = await prisma.clinicalNoteReview.findFirst({
    where: { appointmentId, organizationId },
  });

  if (!note) {
    return { exists: false, isComplete: false };
  }

  // Master Prompt Business Rule:
  // Treatment hours should not be submitted until Clinical Note is available and marked complete/approved.
  // We use isApproved as the primary gate for completion.
  const isComplete = note.isApproved === true;

  return {
    exists: true,
    isApproved: note.isApproved,
    isComplete,
  };
};
