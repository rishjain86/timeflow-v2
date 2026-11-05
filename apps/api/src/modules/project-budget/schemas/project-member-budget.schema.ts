import { z } from 'zod';
import { ProjectBudgetStatus } from '@prisma/client';

export const allocateMemberBudgetSchema = z.object({
  body: z.object({
    userId: z.string().uuid({ message: 'Valid User ID is required' }),
    allocatedHours: z.number().positive({ message: 'Allocated hours must be greater than 0' }),
  }),
});

export const updateMemberBudgetSchema = z.object({
  body: z.object({
    allocatedHours: z.number().positive({ message: 'Allocated hours must be greater than 0' }).optional(),
    status: z.nativeEnum(ProjectBudgetStatus).optional(),
  }),
});
