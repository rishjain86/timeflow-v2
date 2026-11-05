import { z } from 'zod';

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1, 'Comment cannot be empty').max(5000, 'Comment is too long'),
    projectId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    invoiceId: z.string().uuid().optional(),
  }).refine(
    (data) => {
      // Ensure exactly one entity ID is provided
      const entities = [data.projectId, data.taskId, data.clientId, data.invoiceId].filter(Boolean);
      return entities.length === 1;
    },
    {
      message: 'A comment must be linked to exactly one entity (projectId, taskId, clientId, or invoiceId)',
    }
  ),
});

export const updateCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid comment ID format'),
  }),
  body: z.object({
    content: z.string().trim().min(1, 'Comment cannot be empty').max(5000, 'Comment is too long'),
  }),
});

export const getCommentsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    projectId: z.string().uuid().optional(),
    taskId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    invoiceId: z.string().uuid().optional(),
  }).refine(
    (data) => !!(data.projectId || data.taskId || data.clientId || data.invoiceId),
    {
      message: 'At least one entity ID must be provided to fetch comments',
    }
  ),
});

export const deleteCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid comment ID format'),
  }),
});
