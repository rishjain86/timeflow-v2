import { z } from 'zod';

export const AuthorizationStatusEnum = z.enum([
  'ACTIVE',
  'EXPIRED',
  'REVOKED',
  'EXHAUSTED'
]);

export const createAuthorizationSchema = z.object({
  body: z.object({
    authNumber: z.string().trim().min(1, 'Authorization number is required').max(150, 'Authorization number is too long'),
    startDate: z.string().datetime({ message: 'Invalid start date format, must be ISO 8601' }),
    endDate: z.string().datetime({ message: 'Invalid end date format, must be ISO 8601' }),
    projectId: z.string().uuid({ message: 'Invalid project ID format' }),
    status: AuthorizationStatusEnum.optional().default('ACTIVE'),
  }).strict().refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'End date must be greater than or equal to start date',
    path: ['endDate'],
  }),
});

export const updateAuthorizationSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid authorization ID format' }),
  }),
  body: z.object({
    authNumber: z.string().trim().min(1, 'Authorization number cannot be empty').max(150).optional(),
    startDate: z.string().datetime({ message: 'Invalid start date format' }).optional(),
    endDate: z.string().datetime({ message: 'Invalid end date format' }).optional(),
    status: AuthorizationStatusEnum.optional(),
  }).strict().refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'End date must be greater than or equal to start date',
    path: ['endDate'],
  }),
});

export const getAuthorizationsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    projectId: z.string().uuid({ message: 'Invalid project ID format' }).optional(),
    status: AuthorizationStatusEnum.optional(),
    search: z.string().trim().optional(),
  }),
});

export const authorizationIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid authorization ID format' }),
  }),
});
