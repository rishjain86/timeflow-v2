import { z } from 'zod';

// Safe pagination boundaries
const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(10);

export const createTimeEntrySchema = z.object({
  body: z
    .object({
      projectId: z
        .string({ required_error: 'Project ID is required' })
        .uuid({ message: 'Project ID must be a valid UUID' }),
      clientId: z
        .string()
        .uuid({ message: 'Client ID must be a valid UUID' })
        .optional(),
      fundingSourceId: z
        .string()
        .uuid({ message: 'Funding Source ID must be a valid UUID' })
        .optional(),
      taskId: z
        .string()
        .uuid({ message: 'Task ID must be a valid UUID' })
        .optional(),
      taskBudgetId: z
        .string()
        .uuid({ message: 'Task Budget ID must be a valid UUID' })
        .optional(),
      appointmentId: z
        .string()
        .uuid({ message: 'Appointment ID must be a valid UUID' })
        .optional(),
      date: z
        .string({ required_error: 'Date is required' })
        .datetime({ message: 'Invalid date format (must be ISO 8601)' }),
      startTime: z
        .string()
        .datetime({ message: 'Invalid start time format (must be ISO 8601)' })
        .optional(),
      endTime: z
        .string()
        .datetime({ message: 'Invalid end time format (must be ISO 8601)' })
        .optional(),
      duration: z.coerce
        .number()
        .positive('Duration must be a positive number'),
      serviceCodeId: z
        .string()
        .uuid({ message: 'Service Code ID must be a valid UUID' })
        .optional(),
      description: z.string().trim().optional(),
      // 🟢 FIX: Allow string "true"/"false" from FormData and automatically convert to boolean
      isBillable: z
        .union([z.boolean(), z.enum(['true', 'false']).transform((val) => val === 'true')])
        .default(true)
        .optional(),
    })
    .superRefine((data, ctx) => {
      // Ensure endTime is strictly after startTime ONLY if both are provided
      if (data.startTime && data.endTime) {
        const start = new Date(data.startTime).getTime();
        const end = new Date(data.endTime).getTime();

        if (end <= start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'End time must be after start time',
            path: ['endTime'],
          });
        }
      }
    }),
});

export const updateTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Time Entry ID format' }),
  }),
  body: z
    .object({
      projectId: z.string().uuid().optional(),
      clientId: z.string().uuid().nullable().optional(),
      fundingSourceId: z.string().uuid().nullable().optional(),
      taskId: z.string().uuid().nullable().optional(),
      appointmentId: z.string().uuid().nullable().optional(),
      date: z
        .string()
        .datetime({ message: 'Invalid date format (must be ISO 8601)' })
        .optional(),
      startTime: z
        .string()
        .datetime({ message: 'Invalid start time format (must be ISO 8601)' })
        .optional(),
      endTime: z
        .string()
        .datetime({ message: 'Invalid end time format (must be ISO 8601)' })
        .optional(),
      duration: z.coerce.number().positive().optional(),
      serviceCodeId: z.string().uuid().nullable().optional(),
      description: z.string().trim().optional(),
      // 🟢 FIX: Same bulletproof union for updates
      isBillable: z
        .union([z.boolean(), z.enum(['true', 'false']).transform((val) => val === 'true')])
        .optional(),
    })
    .superRefine((data, ctx) => {
      // Ensure at least one field is provided for update
      const hasUpdateableFields = Object.keys(data).length > 0;
      if (!hasUpdateableFields) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'At least one field must be provided for update',
          path: ['root'],
        });
        return;
      }

      // Enforce time consistency only if both startTime and endTime are in the payload
      if (data.startTime && data.endTime) {
        const start = new Date(data.startTime).getTime();
        const end = new Date(data.endTime).getTime();

        if (end <= start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'End time must be after start time',
            path: ['endTime'],
          });
        }
      }
    }),
});

export const getTimeEntriesQuerySchema = z.object({
  query: z.object({
    page: pageSchema,
    limit: limitSchema,
    projectId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    fundingSourceId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format (must be ISO 8601)' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format (must be ISO 8601)' })
      .optional(),
    isBillable: z
      .enum(['true', 'false'])
      .transform((val) => val === 'true')
      .optional(),
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  }),
});

export const timeEntryIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Time Entry ID format' }),
  }),
});

// 🟢 FIX: Added missing Review Schema for Approve/Reject requests
export const reviewTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Time Entry ID format' }),
  }),
  body: z.object({
    approvalStatus: z.enum(['APPROVED', 'REJECTED']),
    rejectionReason: z.string().trim().optional(),
  }).superRefine((data, ctx) => {
    if (data.approvalStatus === 'REJECTED' && !data.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rejection reason is required when rejecting an entry',
        path: ['rejectionReason'],
      });
    }
  }),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>['body'];
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>['body'];
