import { z } from 'zod';
import { PayorType } from '@prisma/client';

// Safe pagination boundaries
const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(10);

export const createFundingSourceSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Funding source name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    payorType: z.nativeEnum(PayorType, {
      required_error: 'Payor type is required',
    }),
    authorizationId: z
      .string({ required_error: 'Authorization ID is required' })
      .uuid({ message: 'Authorization ID must be a valid UUID' }),
  }),
});

export const updateFundingSourceSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Funding Source ID format' }),
  }),
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters')
        .optional(),
      payorType: z.nativeEnum(PayorType).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const getFundingSourcesQuerySchema = z.object({
  query: z.object({
    page: pageSchema,
    limit: limitSchema,
    authorizationId: z.string().uuid().optional(),
    payorType: z.nativeEnum(PayorType).optional(),
    search: z.string().optional(),
  }),
});

export const fundingSourceIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Funding Source ID format' }),
  }),
});

// Type inferences
export type CreateFundingSourceInput = z.infer<typeof createFundingSourceSchema>['body'];
export type UpdateFundingSourceInput = z.infer<typeof updateFundingSourceSchema>['body'];
