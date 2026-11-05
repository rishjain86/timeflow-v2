import { z } from 'zod';
import { AuthorizationStatus } from '@prisma/client';

const idParams = z.object({
  id: z.string().uuid({ message: 'Invalid authorization ID format' }),
});

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), { message: 'Invalid date format' });

const limitBody = z.object({
  serviceCodeId: z.string().uuid({ message: 'Invalid service code ID format' }),
  approvedUnits: z.number().positive('Approved units must be greater than 0'),
});

export const createAuthorizationSchema = z.object({
  body: z
    .object({
      authNumber: z.string().trim().min(1, 'Authorization number is required').max(100),
      startDate: isoDate,
      endDate: isoDate,
      projectId: z.string().uuid({ message: 'Invalid project ID format' }),
      status: z.nativeEnum(AuthorizationStatus).optional(),
      limits: z.array(limitBody).optional(),
    })
    .refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }),
});

export const updateAuthorizationSchema = z.object({
  params: idParams,
  body: z.object({
    authNumber: z.string().trim().min(1).max(100).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    status: z.nativeEnum(AuthorizationStatus).optional(),
  }),
});

export const getAuthorizationsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    projectId: z.string().uuid().optional(),
    status: z.nativeEnum(AuthorizationStatus).optional(),
    search: z.string().trim().optional(),
  }),
});

export const authorizationIdParamSchema = z.object({ params: idParams });
export const deleteAuthorizationSchema = authorizationIdParamSchema;
export const authorizationSchema = authorizationIdParamSchema;

export const addAuthorizationLimitSchema = z.object({
  params: idParams,
  body: limitBody,
});
