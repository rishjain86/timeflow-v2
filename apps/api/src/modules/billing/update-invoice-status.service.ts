import prisma from '../../lib/prisma';
import { AppError } from '../../utils/errors';
import { UpdateInvoiceStatusBody } from './schemas/update-invoice-status.schema';

export const updateInvoiceStatusService = async (
  id: string,
  organizationId: string,
  userId: string,
  payload: UpdateInvoiceStatusBody
) => {
  // 1. Verify invoice exists and belongs to the organization
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // 2. If status is the same, return early to save DB calls
  if (invoice.status === payload.status && payload.notes === undefined) {
    return invoice;
  }

  // 3. Execute update and audit log in a transaction
  return await prisma.$transaction(async (tx) => {
    const updatedInvoice = await tx.invoice.update({
      where: { id },
      data: {
        status: payload.status,
        ...(payload.notes !== undefined && { notes: payload.notes }),
        // Automatically capture lifecycle timestamps
        ...(payload.status === 'SENT' && !invoice.sentAt && { sentAt: new Date() }),
        ...(payload.status === 'PAID' && !invoice.paidAt && { paidAt: new Date() }),
      },
    });

    // 4. Create an immutable Audit Trail for the status change
    await tx.auditLog.create({
      data: {
        action: 'UPDATE_INVOICE_STATUS',
        entityType: 'INVOICE',
        entityId: id,
        userId,
        organizationId,
        details: {
          previousStatus: invoice.status,
          newStatus: payload.status,
          notes: payload.notes,
        },
      },
    });

    return updatedInvoice;
  });
};
