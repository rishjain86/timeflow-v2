import { z } from 'zod';

// Safe pagination boundaries
const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(10);

export const createExpenseSchema = z.object({
  body: z.object({
    clientId: z
      .string({ required_error: 'Client ID is required' })
      .uuid({ message: 'Client ID must be a valid UUID' }),
    fundingSourceId: z
      .string({ required_error: 'Funding Source ID is required' })
      .uuid({ message: 'Funding Source ID must be a valid UUID' }),
    date: z
      .string({ required_error: 'Date is required' })
      .datetime({ message: 'Invalid date format (must be ISO 8601)' }),
    amount: z.coerce
      .number({ required_error: 'Amount is required' })
      .positive({ message: 'Amount must be strictly greater than zero' }),
    category: z
      .string({ required_error: 'Category is required' })
      .trim()
      .min(2, 'Category must be at least 2 characters long'),
    description: z.string().trim().optional(),
    receiptUrl: z.string().url({ message: 'Invalid receipt URL format' }).optional(),
    isBillable: z.boolean().default(true),
  }),
});

export const updateExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Expense ID format' }),
  }),
  body: z
    .object({
      clientId: z.string().uuid().optional(),
      fundingSourceId: z.string().uuid().optional(),
      date: z
        .string()
        .datetime({ message: 'Invalid date format (must be ISO 8601)' })
        .optional(),
      amount: z.coerce.number().positive().optional(),
      category: z.string().trim().min(2).optional(),
      description: z.string().trim().optional(),
      receiptUrl: z.string().url().optional(),
      isBillable: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
      path: ['root'],
    }),
});

export const getExpensesQuerySchema = z.object({
  query: z.object({
    page: pageSchema,
    limit: limitSchema,
    clientId: z.string().uuid().optional(),
    fundingSourceId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format (must be ISO 8601)' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format (must be ISO 8601)' })
      .optional(),
    category: z.string().optional(),
    isBillable: z
      .enum(['true', 'false'])
      .transform((val) => val === 'true')
      .optional(),
  }),
});

export const expenseIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Expense ID format' }),
  }),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>['body'];
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>['body'];
