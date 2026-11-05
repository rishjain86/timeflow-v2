import { z } from 'zod';

export const createTimeEntrySchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID format'),
    taskId: z.string().uuid('Invalid task ID format').optional().nullable(),
    // 🟢 FIX: Allowed taskBudgetId which is sent by the frontend
    taskBudgetId: z.string().uuid().optional().nullable(),
    date: z.string().datetime({ message: 'Invalid date format (must be ISO 8601)' }),
    // 🟢 FIX: Replaced .int() with .coerce.number() to allow decimal hours (like 2.5) and string parsing from FormData
    duration: z.coerce.number().positive('Duration must be a positive number'),
    description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
    // 🟢 FIX: Preprocess string "true"/"false" from FormData into boolean
    isBillable: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional().default(true)),
  }),
});

export const updateTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid time entry ID format'),
  }),
  body: z.object({
    projectId: z.string().uuid('Invalid project ID format').optional(),
    taskId: z.string().uuid('Invalid task ID format').optional().nullable(),
    taskBudgetId: z.string().uuid().optional().nullable(),
    date: z.string().datetime({ message: 'Invalid date format (must be ISO 8601)' }).optional().nullable(),
    // 🟢 FIX: Replaced .int() with .coerce.number() for decimals
    duration: z.coerce.number().positive('Duration must be a positive number').optional(),
    description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().nullable(),
    isBillable: z.preprocess((val) => val === 'true' || val === true, z.boolean().optional()),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  }),
});

export const getTimeEntriesQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').optional(),
    projectId: z.string().uuid('Invalid project ID format').optional(),
    userId: z.string().uuid('Invalid user ID format').optional(),
    startDate: z.string().datetime({ message: 'Invalid start date format (must be ISO 8601)' }).optional(),
    endDate: z.string().datetime({ message: 'Invalid end date format (must be ISO 8601)' }).optional(),
    // 🟢 FIX: Added Approval Status filter for Manager Dashboard
    approvalStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  }).refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  }),
});

// 🟢 NEW: Schema for Managers to Review/Approve/Reject entries
export const reviewTimeEntrySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid time entry ID format'),
  }),
  body: z.object({
    approvalStatus: z.enum(['APPROVED', 'REJECTED'], {
      errorMap: () => ({ message: 'Status must be either APPROVED or REJECTED' })
    }),
    rejectionReason: z.string().trim().max(1000, 'Reason cannot exceed 1000 characters').optional().nullable(),
  }).refine((data) => {
    // If status is REJECTED, rejectionReason is mandatory
    if (data.approvalStatus === 'REJECTED' && (!data.rejectionReason || data.rejectionReason.trim() === '')) {
      return false;
    }
    return true;
  }, {
    message: 'A rejection reason is required when rejecting a time entry',
    path: ['rejectionReason'],
  }),
});

// 🟢 NEW: Schema for Requesting Budget (Flexible with both key variations)
export const requestBudgetSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID format').optional(),
    taskId: z.string().uuid('Invalid task ID format').optional().nullable(),
    hoursRequested: z.coerce.number().positive('Hours must be positive').optional(),
    requestedHours: z.coerce.number().positive('Hours must be positive').optional(),
    reason: z.string().trim().max(1000, 'Reason cannot exceed 1000 characters').optional().nullable()
  }).refine((data) => data.hoursRequested !== undefined || data.requestedHours !== undefined, {
    message: 'Valid requested hours are required.',
    path: ['hoursRequested']
  })
});

// 🟢 NEW: Timer Validation Schemas
export const startTimerSchema = z.object({
  body: z.object({
    projectId: z.string().uuid({ message: "Valid Project ID is required" }),
    taskId: z.string().uuid({ message: "Valid Task ID is required" }),
    notes: z.string().optional(),
  }),
});

export const pauseResumeTimerSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: "Valid Timer ID is required" }),
  }),
});

export const stopTimerSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: "Valid Timer ID is required" }),
  }),
  body: z.object({
    notes: z.string().optional(),
  }),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>['body'];
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>['body'];
export type ReviewTimeEntryInput = z.infer<typeof reviewTimeEntrySchema>['body'];
export type RequestBudgetInput = z.infer<typeof requestBudgetSchema>['body'];
export type StartTimerInput = z.infer<typeof startTimerSchema>['body'];
export type StopTimerInput = z.infer<typeof stopTimerSchema>['body'];
