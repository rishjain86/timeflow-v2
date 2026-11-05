import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { AppError } from '../../utils/errors';
import { RecordPaymentBody } from './schemas/record-payment.schema';

export const recordPaymentService = async (
  invoiceId: string,
  organizationId: string,
  userId: string,
  payload: RecordPaymentBody
) => {
  // 1. Fetch Invoice securely
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
  });

  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  // 2. Strict Decimal Math to prevent floating-point errors
  const paymentAmount = new Prisma.Decimal(payload.amount);
  const currentBalance = invoice.balanceDue; // Assuming this is already a Prisma.Decimal from DB
  const currentTotalPaid = invoice.amountPaid;

  if (paymentAmount.greaterThan(currentBalance)) {
    throw new AppError('Payment amount exceeds the current balance due', 400);
  }

  const newTotalPaid = currentTotalPaid.plus(paymentAmount);
  const newBalanceDue = currentBalance.minus(paymentAmount);

  // 3. Determine new invoice status
  let newStatus = invoice.status;
  if (newBalanceDue.equals(0)) {
    newStatus = 'PAID';
  } else if (invoice.status === 'SENT' || invoice.status === 'DRAFT') {
    newStatus = 'PARTIALLY_PAID';
  }

  // 4. Execute atomic transaction (Payment creation + Invoice Update + Audit)
  return await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId,
        organizationId,
        amount: paymentAmount,
        paymentDate: new Date(payload.paymentDate),
        paymentMethod: payload.paymentMethod,
        referenceNumber: payload.referenceNumber,
        notes: payload.notes,
      },
    });

    const updatedInvoice = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newTotalPaid,
        balanceDue: newBalanceDue,
        status: newStatus,
        ...(newStatus === 'PAID' && !invoice.paidAt && { paidAt: new Date() }),
      },
    });

    await tx.auditLog.create({
      data: {
        action: 'RECORD_PAYMENT',
        entityType: 'INVOICE',
        entityId: invoiceId,
        userId,
        organizationId,
        details: {
          paymentId: payment.id,
          amountRecorded: paymentAmount.toNumber(),
          previousBalance: currentBalance.toNumber(),
          newBalance: newBalanceDue.toNumber(),
          paymentMethod: payload.paymentMethod,
        },
      },
    });

    return {
      payment,
      invoice: updatedInvoice,
    };
  });
};
