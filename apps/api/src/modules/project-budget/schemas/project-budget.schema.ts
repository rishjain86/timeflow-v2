import { z } from 'zod';
import { ProjectBudgetStatus } from '@prisma/client';

// 🟢 FIX: Used z.any() to prevent Zod from silently stripping the arrays
export const allocateBudgetSchema = z.object({
  body: z.object({
    projectId: z.string().min(1, { message: 'Invalid project ID' }),
    totalAllocatedHours: z.coerce.number().min(0, { message: 'Total hours cannot be negative' }),
    tasks: z.array(z.any()).optional().default([]),
    members: z.array(z.any()).optional().default([]),
  }),
});

export const createProjectBudgetSchema = z.object({
  body: z.object({
    projectId: z.string().min(1, { message: 'Valid Project ID is required' }),
    totalAllocatedHours: z.coerce.number().min(0, { message: 'Total hours cannot be negative' }),
    alert50Enabled: z.boolean().optional(),
    alert75Enabled: z.boolean().optional(),
    alert90Enabled: z.boolean().optional(),
    alert100Enabled: z.boolean().optional(),
    allowOverBudget: z.boolean().optional(),
  }),
});

export const updateProjectBudgetSchema = z.object({
  body: z.object({
    totalAllocatedHours: z.coerce.number().min(0).optional(),
    status: z.nativeEnum(ProjectBudgetStatus).optional(),
    alert50Enabled: z.boolean().optional(),
    alert75Enabled: z.boolean().optional(),
    alert90Enabled: z.boolean().optional(),
    alert100Enabled: z.boolean().optional(),
    allowOverBudget: z.boolean().optional(),
  }),
});

export type AllocateBudgetInput = z.infer<typeof allocateBudgetSchema>['body'];
