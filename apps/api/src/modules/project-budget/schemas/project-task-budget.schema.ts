import { z } from 'zod';
import { ProjectBudgetStatus } from '@prisma/client';

export const allocateTaskBudgetSchema = z.object({
  body: z.object({
    taskId: z.string().uuid({ message: 'Valid Task ID is required' }),
    allocatedHours: z.number().positive({ message: 'Allocated hours must be greater than 0' }),
    sessionLimitHours: z.number().positive({ message: 'Session limit hours must be greater than 0' }).optional(),
  }),
});

export const updateTaskBudgetSchema = z.object({
  body: z.object({
    allocatedHours: z.number().positive({ message: 'Allocated hours must be greater than 0' }).optional(),
    sessionLimitHours: z.number().positive({ message: 'Session limit hours must be greater than 0' }).optional().nullable(),
    status: z.nativeEnum(ProjectBudgetStatus).optional(),
  }),
});
