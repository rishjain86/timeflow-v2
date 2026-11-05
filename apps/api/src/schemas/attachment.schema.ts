import { z } from 'zod';

export const getAttachmentsQuerySchema = z.object({
  query: z.object({
    projectId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    expenseId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    invoiceId: z.string().uuid().optional(),
    attendanceId: z.string().uuid().optional(),
    clinicalNoteReviewId: z.string().uuid().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one entity ID must be provided to fetch attachments',
  }),
});

export const deleteAttachmentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attachment ID format'),
  }),
});
