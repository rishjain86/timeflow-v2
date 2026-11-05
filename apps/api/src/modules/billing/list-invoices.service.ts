import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ListInvoicesQuery } from './list-invoices.schema';

export const listInvoicesService = async (
  organizationId: string,
  filters: ListInvoicesQuery
) => {
  const { 
    page = 1, 
    limit = 10, 
    search, 
    status, 
    clientId, 
    fundingSourceId, 
    fromDate, 
    toDate 
  } = filters;

  const skip = (page - 1) * limit;
  const take = limit;

  // Build the strict Prisma where clause based on schema
  const whereClause: Prisma.InvoiceWhereInput = {
    organizationId,
  };

  if (status) whereClause.status = status;
  if (clientId) whereClause.clientId = clientId;
  if (fundingSourceId) whereClause.fundingSourceId = fundingSourceId;

  if (search) {
    whereClause.invoiceNumber = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Filter based on issueDate
  if (fromDate || toDate) {
    whereClause.issueDate = {};
    if (fromDate) whereClause.issueDate.gte = new Date(fromDate);
    if (toDate) whereClause.issueDate.lte = new Date(toDate);
  }

  // Run count and data fetch in parallel using transaction
  const [total, invoices] = await prisma.$transaction([
    prisma.invoice.count({ where: whereClause }),
    prisma.invoice.findMany({
      where: whereClause,
      skip,
      take,
      orderBy: { issueDate: 'desc' },
      include: {
        // Only fetching necessary relations for the list view
        client: {
          select: { id: true, name: true, companyName: true },
        },
        fundingSource: {
          select: { id: true, name: true, payorType: true },
        },
      },
    }),
  ]);

  return {
    data: invoices,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};
