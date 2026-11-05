import prisma from '../../lib/prisma';
import { calculateBudgetConsumption } from '../budget-engine/budget-engine.service';
import { BadRequestError } from '../../utils/errors';

export interface ForecastResult {
  budgetId: string;
  daysElapsed: number;
  totalBudgetDays: number;
  averageDailyBurnRate: number;
  projectedExhaustionDate: Date | null;
  isOnTrack: boolean;
}

export const generateBudgetForecast = async (
  budgetId: string,
  organizationId: string
): Promise<ForecastResult> => {
  // Fetch budget with nested authorization dates (Sprint 3 structure)
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
    throw new BadRequestError('Budget not found for forecasting.');
  }

  const authorization = budget.fundingSource?.authorization;
  
  if (!authorization) {
    throw new BadRequestError('Cannot forecast: Budget is missing an active Authorization date range.');
  }

  const consumption = await calculateBudgetConsumption(budgetId, organizationId);
  
  const startDate = new Date(authorization.startDate);
  const today = new Date();
  const endDate = new Date(authorization.endDate);

  const msPerDay = 1000 * 60 * 60 * 24;
  const totalBudgetDays = Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay));

  // If authorization/budget hasn't started yet
  if (today < startDate) {
    return {
      budgetId,
      daysElapsed: 0,
      totalBudgetDays,
      averageDailyBurnRate: 0,
      projectedExhaustionDate: null,
      isOnTrack: true,
    };
  }

  const daysElapsed = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / msPerDay));
  
  // Update to use the new totalSpentCost property from BudgetConsumptionResult
  const averageDailyBurnRate = consumption.totalSpentCost / daysElapsed;

  let projectedExhaustionDate: Date | null = null;
  
  if (averageDailyBurnRate > 0) {
    const daysRemainingFunds = consumption.remainingBalance / averageDailyBurnRate;
    projectedExhaustionDate = new Date(today.getTime() + (daysRemainingFunds * msPerDay));
  }

  // Update to use totalAllocatedCost
  const expectedBurnRate = consumption.totalAllocatedCost / totalBudgetDays;
  const isOnTrack = averageDailyBurnRate <= expectedBurnRate;

  return {
    budgetId,
    daysElapsed,
    totalBudgetDays,
    averageDailyBurnRate: Number(averageDailyBurnRate.toFixed(2)),
    projectedExhaustionDate,
    isOnTrack,
  };
};
