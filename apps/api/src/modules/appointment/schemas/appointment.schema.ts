import { z } from 'zod';
import { AppointmentStatus, AttendanceStatus, AppointmentModality } from '@prisma/client';

// Helper for pagination
const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(10);

export const createAppointmentSchema = z.object({
  body: z
    .object({
      clientId: z.string().uuid('Invalid Client ID'),
      therapistId: z.string().uuid('Invalid Therapist ID'),
      serviceCodeId: z.string().uuid('Invalid Service Code ID'),
      authorizationId: z.string().uuid('Invalid Authorization ID').optional(),
      startTime: z.string().datetime({ message: 'Valid ISO datetime required for start time' }),
      endTime: z.string().datetime({ message: 'Valid ISO datetime required for end time' }),
      status: z.nativeEnum(AppointmentStatus).optional(),
      modality: z.nativeEnum(AppointmentModality).optional(),
      notes: z.string().optional(),
    })
    .refine((data) => new Date(data.startTime) < new Date(data.endTime), {
      message: 'End time must be after start time',
      path: ['endTime'],
    }),
});

export const updateAppointmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Appointment ID'),
  }),
  body: z
    .object({
      therapistId: z.string().uuid('Invalid Therapist ID').optional(),
      serviceCodeId: z.string().uuid('Invalid Service Code ID').optional(),
      authorizationId: z.string().uuid('Invalid Authorization ID').optional().nullable(),
      startTime: z.string().datetime().optional(),
      endTime: z.string().datetime().optional(),
      status: z.nativeEnum(AppointmentStatus).optional(),
      modality: z.nativeEnum(AppointmentModality).optional(),
      notes: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const hasUpdateableFields = Object.keys(data).length > 0;
      if (!hasUpdateableFields) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one field must be provided for update',
          path: ['root'],
        });
        return;
      }

      if (data.startTime && data.endTime) {
        if (new Date(data.startTime) >= new Date(data.endTime)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'End time must be after start time',
            path: ['endTime'],
          });
        }
      }
    }),
});

export const getAppointmentsQuerySchema = z.object({
  query: z.object({
    page: pageSchema,
    limit: limitSchema,
    clientId: z.string().uuid().optional(),
    therapistId: z.string().uuid().optional(),
    status: z.nativeEnum(AppointmentStatus).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});

export const appointmentIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Appointment ID'),
  }),
});

// ==========================================
// SPRINT 4: Digital Forms Validation Schemas
// ==========================================

export const attendanceSchema = z.object({
  body: z.object({
    sessionDate: z.string().datetime().optional(),
    status: z.nativeEnum(AttendanceStatus).optional(),
    therapistSigned: z.boolean().default(false),
    clientSigned: z.boolean().default(false),
  }),
});

export const cnrSchema = z.object({
  body: z.object({
    notes: z.string().optional(),
    therapistSigned: z.boolean().default(false),
    clientSigned: z.boolean().default(false),
  }),
});

export const cnrApprovalSchema = z.object({
  body: z.object({
    isApproved: z.boolean({ required_error: 'isApproved flag is required' }),
  }),
});

// Infer types
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>['body'];
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>['body'];
export type SubmitAttendanceInput = z.infer<typeof attendanceSchema>['body'];
export type SubmitCNRInput = z.infer<typeof cnrSchema>['body'];
export type ApproveCNRInput = z.infer<typeof cnrApprovalSchema>['body'];
