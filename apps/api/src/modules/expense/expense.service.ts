import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';

export interface CreateExpenseDTO {
  clientId: string;
  fundingSourceId: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
  receiptUrl?: string;
  isBillable?: boolean;
}

export const createExpense = async (
  organizationId: string,
  userId: string,
  data: CreateExpenseDTO
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify Client exists and belongs to the organization
    const client = await tx.client.findFirst({
      where: { id: data.clientId, organizationId },
    });
    if (!client) {
      throw new NotFoundError('Client not found or does not belong to your organization');
    }

    // 2. Verify Funding Source exists and belongs to the organization
    const fundingSource = await tx.fundingSource.findFirst({
      where: { id: data.fundingSourceId, organizationId },
    });
    if (!fundingSource) {
      throw new NotFoundError('Funding Source not found or does not belong to your organization');
    }

    // 3. Create Expense
    const expense = await tx.expense.create({
      data: {
        ...data,
        date: new Date(data.date),
        userId,
        organizationId,
      },
    });

    return expense;
  });
};

export interface UpdateExpenseDTO {
  clientId?: string;
  fundingSourceId?: string;
  date?: string;
  amount?: number;
  category?: string;
  description?: string;
  receiptUrl?: string;
  isBillable?: boolean;
}

export const updateExpense = async (
  id: string,
  organizationId: string,
  data: UpdateExpenseDTO
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current entry to ensure it exists and belongs to the org
    const currentEntry = await tx.expense.findFirst({
      where: { id, organizationId },
    });

    if (!currentEntry) {
      throw new NotFoundError('Expense record not found');
    }

    // 2. Verify ownership of new Client if provided
    if (data.clientId && data.clientId !== currentEntry.clientId) {
      const clientExists = await tx.client.findFirst({
        where: { id: data.clientId, organizationId },
      });
      if (!clientExists) {
        throw new NotFoundError('Client not found or does not belong to your organization');
      }
    }

    // 3. Verify ownership of new Funding Source if provided
    if (data.fundingSourceId && data.fundingSourceId !== currentEntry.fundingSourceId) {
      const fundingSourceExists = await tx.fundingSource.findFirst({
        where: { id: data.fundingSourceId, organizationId },
      });
      if (!fundingSourceExists) {
        throw new NotFoundError('Funding Source not found or does not belong to your organization');
      }
    }

    // 4. Prepare update payload
    const updates: Prisma.ExpenseUpdateInput = {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    };

    // Remove undefined values
    Object.keys(updates).forEach(
      (key) => updates[key as keyof Prisma.ExpenseUpdateInput] === undefined && delete updates[key as keyof Prisma.ExpenseUpdateInput]
    );

    // 5. Update the record
    const updatedEntry = await tx.expense.update({
      where: { id },
      data: updates,
    });

    return updatedEntry;
  });
};

export interface GetExpensesQuery {
  page: number;
  limit: number;
  clientId?: string;
  fundingSourceId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  isBillable?: boolean;
}

export const getExpenses = async (
  organizationId: string,
  query: GetExpensesQuery
) => {
  const { page, limit, clientId, fundingSourceId, userId, startDate, endDate, category, isBillable } = query;

  const where: Prisma.ExpenseWhereInput = {
    organizationId,
  };

  if (clientId) where.clientId = clientId;
  if (fundingSourceId) where.fundingSourceId = fundingSourceId;
  if (userId) where.userId = userId;
  if (category) where.category = category;
  if (isBillable !== undefined) where.isBillable = isBillable;

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [expenses, totalCount] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        fundingSource: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    data: expenses,
    meta: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};

export const getExpenseById = async (id: string, organizationId: string) => {
  const expense = await prisma.expense.findFirst({
    where: { id, organizationId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true } },
      fundingSource: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!expense) {
    throw new NotFoundError('Expense record not found');
  }

  return expense;
};

export const deleteExpense = async (id: string, organizationId: string) => {
  return await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.findFirst({
      where: { id, organizationId },
    });

    if (!expense) {
      throw new NotFoundError('Expense record not found');
    }

    await tx.expense.delete({
      where: { id },
    });

    return { message: 'Expense record deleted successfully' };
  });
};
