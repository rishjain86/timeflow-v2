import { Prisma, InvoiceStatus, PaymentMethod } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export const generateInvoices = async (
  organizationId: string,
  data: { clientId?: string; startDate: string; endDate: string }
) => {
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      organizationId,
      ...(data.clientId && { clientId: data.clientId }),
      date: {
        gte: new Date(data.startDate),
        lte: new Date(data.endDate),
      },
      isBillable: true,
      billingStatus: 'UNBILLED',
    },
    include: {
      client: true,
      serviceCode: true,
      user: true,
    },
  });

  if (timeEntries.length === 0) {
    throw new BadRequestError('No billable time entries found for the given criteria.');
  }

  const entriesByClient = timeEntries.reduce((acc, entry) => {
    const clientId = entry.clientId!;
    if (!acc[clientId]) acc[clientId] = [];
    acc[clientId].push(entry);
    return acc;
  }, {} as Record<string, typeof timeEntries>);

  const createdInvoices = [];

  for (const [clientId, entries] of Object.entries(entriesByClient)) {
    let totalAmount = 0;
    
    entries.forEach((entry) => {
      const rate = entry.serviceCode?.defaultRate?.toNumber() || entry.user?.hourlyRate?.toNumber() || 50;
      totalAmount += Number(entry.duration) * rate;
    });

    const invoice = await prisma.$transaction(async (tx) => {
      const newInvoice = await tx.invoice.create({
        data: {
          organizationId,
          clientId,
          amount: totalAmount,
          status: InvoiceStatus.DRAFT,
          issueDate: new Date(),
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        },
      });

      await tx.timeEntry.updateMany({
        where: { id: { in: entries.map(e => e.id) } },
        data: { 
          billingStatus: 'BILLED',
          invoiceId: newInvoice.id 
        },
      });

      return newInvoice;
    });

    createdInvoices.push(invoice);
  }

  return createdInvoices;
};

export const listInvoices = async (
  organizationId: string,
  filters: { page: number; limit: number; status?: InvoiceStatus; clientId?: string }
) => {
  const { page, limit, status, clientId } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.InvoiceWhereInput = {
    organizationId,
    ...(status && { status }),
    ...(clientId && { clientId }),
  };

  const [total, data] = await Promise.all([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { issueDate: 'desc' },
      include: { client: { select: { id: true, name: true } } },
    }),
  ]);

  return {
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    data,
  };
};

export const getInvoiceById = async (id: string, organizationId: string) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: {
      client: true,
      timeEntries: {
        include: { serviceCode: true, user: { select: { firstName: true, lastName: true } } }
      },
      payments: true,
    },
  });

  if (!invoice) throw new NotFoundError('Invoice not found');
  
  return invoice;
};

export const updateInvoiceStatus = async (
  id: string,
  organizationId: string,
  status: InvoiceStatus
) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId },
  });

  if (!invoice) throw new NotFoundError('Invoice not found');

  return prisma.invoice.update({
    where: { id },
    data: { status },
  });
};

export const recordPayment = async (
  id: string,
  organizationId: string,
  data: { amount: number; paymentMethod: PaymentMethod; reference?: string; date?: string }
) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId },
  });

  if (!invoice) throw new NotFoundError('Invoice not found');

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        invoiceId: id,
        organizationId,
        amount: data.amount,
        method: data.paymentMethod,
        reference: data.reference,
        paymentDate: data.date ? new Date(data.date) : new Date(),
      },
    });

    const allPayments = await tx.payment.aggregate({
      where: { invoiceId: id },
      _sum: { amount: true },
    });

    const totalPaid = allPayments._sum.amount?.toNumber() || 0;
    if (totalPaid >= invoice.amount.toNumber()) {
      await tx.invoice.update({
        where: { id },
        data: { status: InvoiceStatus.PAID },
      });
    }

    return payment;
  });
};
