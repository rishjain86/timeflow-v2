import { Prisma, InvoiceStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { NotFoundError, BadRequestError } from '../../utils/errors';

export interface CreateInvoiceDTO {
  clientId: string;
  fundingSourceId?: string;
  issueDate: string;
  dueDate: string;
  status?: InvoiceStatus; // 🔥 Stricter compile-time safety applied here
  totalAmount: number;
  notes?: string;
}

export const createInvoice = async (
  organizationId: string,
  userId: string,
  data: CreateInvoiceDTO
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify Client exists and belongs to the organization
    const client = await tx.client.findFirst({
      where: { id: data.clientId, organizationId },
    });
    if (!client) {
      throw new NotFoundError('Client not found or does not belong to your organization');
    }

    // 2. Verify Funding Source if provided
    if (data.fundingSourceId) {
      const fundingSource = await tx.fundingSource.findFirst({
        where: { id: data.fundingSourceId, organizationId },
      });
      if (!fundingSource) {
        throw new NotFoundError('Funding Source not found or does not belong to your organization');
      }
    }

    // 3. Create Invoice
    const invoice = await tx.invoice.create({
      data: {
        ...data,
        issueDate: new Date(data.issueDate),
        dueDate: new Date(data.dueDate),
        userId,
        organizationId,
      },
    });

    return invoice;
  });
};

export interface UpdateInvoiceDTO {
  clientId?: string;
  fundingSourceId?: string;
  issueDate?: string;
  dueDate?: string;
  status?: InvoiceStatus; // 🔥 Stricter compile-time safety applied here
  totalAmount?: number;
  notes?: string;
}

export const updateInvoice = async (
  id: string,
  organizationId: string,
  data: UpdateInvoiceDTO
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current entry
    const currentInvoice = await tx.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!currentInvoice) {
      throw new NotFoundError('Invoice not found');
    }

    // 2. Verify ownership of new Client if provided
    if (data.clientId && data.clientId !== currentInvoice.clientId) {
      const clientExists = await tx.client.findFirst({
        where: { id: data.clientId, organizationId },
      });
      if (!clientExists) {
        throw new NotFoundError('Client not found or does not belong to your organization');
      }
    }

    // 3. Verify ownership of new Funding Source if provided
    if (data.fundingSourceId && data.fundingSourceId !== currentInvoice.fundingSourceId) {
      const fundingSourceExists = await tx.fundingSource.findFirst({
        where: { id: data.fundingSourceId, organizationId },
      });
      if (!fundingSourceExists) {
        throw new NotFoundError('Funding Source not found or does not belong to your organization');
      }
    }

    // 4. Database-level time consistency check for partial updates
    const updatedIssueDate = data.issueDate ? new Date(data.issueDate).getTime() : currentInvoice.issueDate.getTime();
    const updatedDueDate = data.dueDate ? new Date(data.dueDate).getTime() : currentInvoice.dueDate.getTime();

    if (updatedDueDate < updatedIssueDate) {
      throw new BadRequestError('Due date cannot be earlier than the issue date.');
    }

    // 5. Prepare update payload
    const updates: Prisma.InvoiceUpdateInput = {
      ...data,
      issueDate: data.issueDate ? new Date(data.issueDate) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    };

    // Remove undefined values
    Object.keys(updates).forEach(
      (key) => updates[key as keyof Prisma.InvoiceUpdateInput] === undefined && delete updates[key as keyof Prisma.InvoiceUpdateInput]
    );

    // 6. Update the record
    const updatedInvoice = await tx.invoice.update({
      where: { id },
      data: updates,
    });

    return updatedInvoice;
  });
};

export interface GetInvoicesQuery {
  page: number;
  limit: number;
  clientId?: string;
  fundingSourceId?: string;
  status?: InvoiceStatus;
  startDate?: string;
  endDate?: string;
}

export const getInvoices = async (
  organizationId: string,
  query: GetInvoicesQuery
) => {
  const { page, limit, clientId, fundingSourceId, status, startDate, endDate } = query;

  const where: Prisma.InvoiceWhereInput = {
    organizationId,
  };

  if (clientId) where.clientId = clientId;
  if (fundingSourceId) where.fundingSourceId = fundingSourceId;
  if (status) where.status = status;

  if (startDate || endDate) {
    where.issueDate = {};
    if (startDate) where.issueDate.gte = new Date(startDate);
    if (endDate) where.issueDate.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [invoices, totalCount] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { issueDate: 'desc' },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        fundingSource: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    data: invoices,
    meta: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};

export const getInvoiceById = async (id: string, organizationId: string) => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      fundingSource: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!invoice) {
    throw new NotFoundError('Invoice not found');
  }

  return invoice;
};

export const deleteInvoice = async (id: string, organizationId: string) => {
  return await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id, organizationId },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    await tx.invoice.delete({
      where: { id },
    });

    return { message: 'Invoice deleted successfully' };
  });
};
