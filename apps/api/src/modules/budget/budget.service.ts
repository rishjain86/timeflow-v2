import { Prisma, BudgetStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors';

export interface CreateBudgetDTO {
  fundingSourceId: string;
  approvedHours?: number;
  approvedCost?: number;
  internalCostBudget?: number;
  autoAllocateOverage?: boolean;
  status?: BudgetStatus;
}

export const createBudget = async (
  organizationId: string,
  data: CreateBudgetDTO
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify Funding Source exists and belongs to the org
      const fundingSource = await tx.fundingSource.findFirst({
        where: { id: data.fundingSourceId, organizationId },
      });

      if (!fundingSource) {
        throw new NotFoundError('Funding Source not found or does not belong to your organization');
      }

      // 2. Check 1:1 relationship - A funding source can only have one budget
      const existingBudget = await tx.budget.findUnique({
        where: { fundingSourceId: data.fundingSourceId },
      });

      if (existingBudget) {
        throw new ConflictError('A budget already exists for this Funding Source');
      }

      // 3. Create the initial budget
      const budget = await tx.budget.create({
        data: {
          fundingSourceId: data.fundingSourceId,
          approvedHours: data.approvedHours || 0,
          approvedCost: data.approvedCost || 0,
          internalCostBudget: data.internalCostBudget || 0,
          autoAllocateOverage: data.autoAllocateOverage ?? true,
          status: data.status || 'HEALTHY',
          organizationId,
        },
      });

      return budget;
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('A budget already exists for this Funding Source');
    }
    throw error;
  }
};

export interface UpdateBudgetDTO {
  approvedHours?: number;
  approvedCost?: number;
  internalCostBudget?: number;
  autoAllocateOverage?: boolean;
  status?: BudgetStatus;
  reason?: string;
}

export const updateBudget = async (
  id: string,
  organizationId: string,
  userId: string, // Required for audit trail
  data: UpdateBudgetDTO
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current budget to check limits and ownership
    const currentBudget = await tx.budget.findFirst({
      where: { id, organizationId },
    });

    if (!currentBudget) {
      throw new NotFoundError('Budget not found');
    }

    const updates: Prisma.BudgetUpdateInput = {};
    let limitsChanged = false;

    // 2. Prepare limits update and check if they actually changed
    const newHours = data.approvedHours ?? Number(currentBudget.approvedHours);
    const newCost = data.approvedCost ?? Number(currentBudget.approvedCost);
    const newInternalCost = data.internalCostBudget ?? Number(currentBudget.internalCostBudget);

    if (
      newHours !== Number(currentBudget.approvedHours) ||
      newCost !== Number(currentBudget.approvedCost) ||
      newInternalCost !== Number(currentBudget.internalCostBudget)
    ) {
      limitsChanged = true;
      updates.approvedHours = newHours;
      updates.approvedCost = newCost;
      updates.internalCostBudget = newInternalCost;
    }

    if (data.autoAllocateOverage !== undefined) updates.autoAllocateOverage = data.autoAllocateOverage;
    if (data.status !== undefined) updates.status = data.status;

    // 3. Enforce Revision History if limits changed
    if (limitsChanged) {
      if (!data.reason || data.reason.trim().length < 5) {
        throw new BadRequestError('A valid reason is required to update budget limits.');
      }

      await tx.budgetRevisionHistory.create({
        data: {
          budgetId: currentBudget.id,
          previousHours: Number(currentBudget.approvedHours),
          newHours,
          previousCost: currentBudget.approvedCost,
          newCost,
          previousInternalCost: currentBudget.internalCostBudget,
          newInternalCost: newInternalCost,
          reason: data.reason,
          changedById: userId,
          organizationId,
        },
      });
    }

    // 4. Update the actual budget
    const updatedBudget = await tx.budget.update({
      where: { id },
      data: updates,
    });

    return updatedBudget;
  });
};

export interface GetBudgetsQuery {
  page: number;
  limit: number;
  fundingSourceId?: string;
  status?: BudgetStatus;
}

export const getBudgets = async (
  organizationId: string,
  query: GetBudgetsQuery
) => {
  const { page, limit, fundingSourceId, status } = query;

  const where: Prisma.BudgetWhereInput = {
    organizationId,
  };

  if (fundingSourceId) where.fundingSourceId = fundingSourceId;
  if (status) where.status = status;

  const skip = (page - 1) * limit;

  const [budgets, totalCount] = await Promise.all([
    prisma.budget.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fundingSource: { select: { id: true, name: true, payorType: true } },
      },
    }),
    prisma.budget.count({ where }),
  ]);

  return {
    data: budgets,
    meta: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};

export const getBudgetById = async (id: string, organizationId: string) => {
  const budget = await prisma.budget.findFirst({
    where: { id, organizationId },
    include: {
      fundingSource: true,
      revisions: {
        orderBy: { createdAt: 'desc' },
        include: {
          changedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  if (!budget) {
    throw new NotFoundError('Budget not found');
  }

  return budget;
};
