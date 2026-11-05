import prisma from '../../lib/prisma';
import { AppError } from '../../utils/errors';

export const markReadyForBilling = async (
  appointmentId: string,
  organizationId: string,
  userId: string
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Tenant-Scoped Fetch (Fixes Blocking Issue 1)
    // Using findFirst to enforce organizationId at the DB query level
    const appointment = await tx.appointment.findFirst({
      where: { 
        id: appointmentId,
        organizationId: organizationId, 
      },
      include: {
        attendance: true,
        clinicalNote: true,
        timeEntry: true,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found or unauthorized access', 404);
    }

    // 2. Pre-requisite Checks
    if (!appointment.attendance || appointment.attendance.status !== 'PRESENT') {
      throw new AppError('Cannot mark ready: Valid attendance is missing', 400);
    }
    if (!appointment.clinicalNote || !appointment.clinicalNote.isApproved) {
      throw new AppError('Cannot mark ready: Clinical Note is missing or not approved', 400);
    }

    // 3. Idempotency Check
    if (appointment.timeEntry && appointment.timeEntry.billingStatus === 'READY') {
      throw new AppError('Session is already marked as ready for billing', 400);
    }

    // 4. Create or Update TimeEntry 
    const timeEntryData = {
      isBillable: true,
      billingStatus: 'READY',
      readyForBillingAt: new Date(),
    };

    const timeEntry = appointment.timeEntry
      ? await tx.timeEntry.update({
          where: { id: appointment.timeEntry.id },
          data: timeEntryData,
        })
      : await tx.timeEntry.create({
          data: {
            appointmentId: appointment.id,
            organizationId: appointment.organizationId,
            therapistId: appointment.therapistId,
            clientId: appointment.clientId,
            
            // Fixes Blocking Issue 2: Populating required fields from appointment
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            serviceId: appointment.serviceId, // Passing the approved service/billing code
            
            ...timeEntryData,
          },
        });

    // 5. Write an Audit Log
    await tx.auditLog.create({
      data: {
        action: 'MARK_READY_FOR_BILLING',
        entityType: 'APPOINTMENT',
        entityId: appointment.id,
        organizationId: appointment.organizationId,
        userId: userId, 
        details: { message: 'Session verified and marked ready for billing' },
      },
    });

    // 6. Richer Response (Enhancement applied)
    return {
      appointmentId: appointment.id,
      timeEntryId: timeEntry.id,
      billingStatus: timeEntry.billingStatus,
      readyForBillingAt: timeEntry.readyForBillingAt,
      isBillable: timeEntry.isBillable,
    };
  });
};
