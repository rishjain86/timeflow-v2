import { z } from 'zod';
import { BudgetStatus } from '@prisma/client';

const idParams = z.object({
  id: z.string().uuid({ message: 'Invalid budget ID format' }),
});

const hours = z.number().min(0, 'Hours cannot be negative');
const money = z.number().min(0, 'Amount cannot be negative');

export const createBudgetSchema = z.object({
  body: z.object({
    fundingSourceId: z.string().uuid({ message: 'Invalid funding source ID format' }),
    approvedHours: hours.optional(),
    approvedCost: money.optional(),
    internalCostBudget: money.optional(),
    autoAllocateOverage: z.boolean().optional(),
    status: z.nativeEnum(BudgetStatus).optional(),
  }),
});

export const updateBudgetSchema = z.object({
  params: idParams,
  body: z.object({
    approvedHours: hours.optional(),
    approvedCost: money.optional(),
    internalCostBudget: money.optional(),
    autoAllocateOverage: z.boolean().optional(),
    status: z.nativeEnum(BudgetStatus).optional(),
    reason: z.string().trim().optional(),
  }),
});

export const getBudgetsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    fundingSourceId: z.string().uuid().optional(),
    status: z.nativeEnum(BudgetStatus).optional(),
  }),
});

export const budgetIdParamSchema = z.object({ params: idParams });
