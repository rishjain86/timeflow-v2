import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../utils/errors';

export interface BudgetConsumptionResult {
  budgetId: string;
  totalAllocatedCost: number;
  totalAllocatedHours: number;
  totalSpentCost: number;
  totalSpentHours: number;
  remainingBalance: number;
  consumptionPercentage: number;
  breakdown: {
    timeEntriesCost: number;
    expensesCost: number;
  };
  isOverBudget: boolean;
}

/**
 * Core Engine calculation: Dynamically aggregates all approved time entries
 * and expenses tied to a specific budget's funding source and authorization date range.
 * Note: Operates in parallel with Sprint 6 Project Budgets.
 */
export const calculateBudgetConsumption = async (
  budgetId: string,
  organizationId: string
): Promise<BudgetConsumptionResult> => {
  // 1. Fetch the Budget and its associated authorization rules
  const budget = await prisma.budget.findFirst({
    where: { id: budgetId, organizationId },
    include: {
      fundingSource: {
        include: {
          authorization: true,
        },
      },
    },
  });

  if (!budget) {
    throw new NotFoundError('Budget not found or does not belong to your organization');
  }

  // Get date range from the Authorization (Sprint 3 mapping)
  const startDate = budget.fundingSource?.authorization?.startDate;
  const endDate = budget.fundingSource?.authorization?.endDate;

  // 2. Aggregate Expenses tied to this Funding Source within the Authorization's date range
  const expensesAggregation = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: {
      organizationId,
      fundingSourceId: budget.fundingSourceId,
      ...(startDate && endDate && {
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      }),
      isBillable: true,
    },
  });

  const totalExpenses = expensesAggregation._sum.amount?.toNumber() || 0;

  // 3. Aggregate Time Entries tied to this Funding Source within the date range
  const timeEntries = await prisma.timeEntry.findMany({
    where: {
      organizationId,
      fundingSourceId: budget.fundingSourceId,
      ...(startDate && endDate && {
        date: {
          gte: startDate,
          lte: endDate,
        },
      }),
      isBillable: true,
      billingStatus: { not: 'CANCELLED' }, // Ensure we don't count cancelled entries
    },
    include: {
      user: { select: { hourlyRate: true } },
      serviceCode: { select: { defaultRate: true } },
    },
  });

  // Calculate Time Entry costs dynamically based on Service Code or User Rate (Sprint 3 logic)
  let totalTimeEntryCost = 0;
  let totalTimeEntryHours = 0;

  timeEntries.forEach((entry) => {
    // Duration is stored in billable hours
    const hours = Number(entry.duration);
    totalTimeEntryHours += hours;
    
    // Rate Priority: Service Code Rate -> User Rate -> Default System Rate ($50)
    const rate = 
      entry.serviceCode?.defaultRate?.toNumber() || 
      entry.user?.hourlyRate?.toNumber() || 
      50; 
      
    totalTimeEntryCost += hours * rate;
  });

  // 4. Calculate final consumption logic
  const totalAllocatedCost = budget.approvedCost.toNumber();
  const totalAllocatedHours = Number(budget.approvedHours);
  const totalSpentCost = totalExpenses + totalTimeEntryCost;
  const remainingBalance = totalAllocatedCost - totalSpentCost;
  const consumptionPercentage = totalAllocatedCost > 0 ? (totalSpentCost / totalAllocatedCost) * 100 : 0;

  return {
    budgetId: budget.id,
    totalAllocatedCost,
    totalAllocatedHours,
    totalSpentCost,
    totalSpentHours: totalTimeEntryHours,
    remainingBalance: Number(remainingBalance.toFixed(2)),
    consumptionPercentage: Number(consumptionPercentage.toFixed(2)),
    breakdown: {
      timeEntriesCost: Number(totalTimeEntryCost.toFixed(2)),
      expensesCost: Number(totalExpenses.toFixed(2)),
    },
    isOverBudget: remainingBalance < 0,
  };
};
