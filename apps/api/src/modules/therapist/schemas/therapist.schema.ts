import { z } from 'zod';
import { TherapistStatus } from '@prisma/client';

// Helper for parsing pagination query params with safe boundaries
const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(10);

export const createTherapistSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid User ID format'),
    credentialType: z.string().min(2, 'Credential Type must be at least 2 characters').optional(),
    licenseNumber: z.string().optional(),
    npiNumber: z.string().optional(),
    supervisorId: z.string().uuid('Invalid Supervisor ID format').optional(),
    status: z.nativeEnum(TherapistStatus).optional(),
  }),
});

export const updateTherapistSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Therapist Profile ID'),
  }),
  body: z.object({
    credentialType: z.string().min(2, 'Credential Type must be at least 2 characters').optional(),
    licenseNumber: z.string().optional(),
    npiNumber: z.string().optional(),
    supervisorId: z.string().uuid('Invalid Supervisor ID format').optional().nullable(),
    status: z.nativeEnum(TherapistStatus).optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  }),
});

export const getTherapistsQuerySchema = z.object({
  query: z.object({
    page: pageSchema,
    limit: limitSchema,
    status: z.nativeEnum(TherapistStatus).optional(),
    supervisorId: z.string().uuid().optional(),
    credentialType: z.string().optional(),
  }),
});

export const therapistIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Therapist Profile ID'),
  }),
});

// Infer types for use in services or controllers
export type CreateTherapistInput = z.infer<typeof createTherapistSchema>['body'];
export type UpdateTherapistInput = z.infer<typeof updateTherapistSchema>['body'];
