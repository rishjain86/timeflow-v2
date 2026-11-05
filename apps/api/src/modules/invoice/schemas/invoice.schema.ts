import { z } from 'zod';

// Safe pagination boundaries
const pageSchema = z.coerce.number().int().min(1).default(1);
const limitSchema = z.coerce.number().int().min(1).max(100).default(10);

// Invoice status enum based on standard billing workflows
export const InvoiceStatusEnum = z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']);

export const createInvoiceSchema = z.object({
  body: z
    .object({
      clientId: z
        .string({ required_error: 'Client ID is required' })
        .uuid({ message: 'Client ID must be a valid UUID' }),
      fundingSourceId: z
        .string({ required_error: 'Funding Source ID is required' })
        .uuid({ message: 'Funding Source ID must be a valid UUID' })
        .optional(), // Sometimes invoices are billed directly to the client without a specific funding source
      issueDate: z
        .string({ required_error: 'Issue date is required' })
        .datetime({ message: 'Invalid issue date format (must be ISO 8601)' }),
      dueDate: z
        .string({ required_error: 'Due date is required' })
        .datetime({ message: 'Invalid due date format (must be ISO 8601)' }),
      status: InvoiceStatusEnum.default('DRAFT'),
      totalAmount: z.coerce
        .number({ required_error: 'Total amount is required' })
        .nonnegative({ message: 'Total amount cannot be negative' }),
      notes: z.string().trim().optional(),
    })
    .superRefine((data, ctx) => {
      // Ensure dueDate is not before issueDate
      const issue = new Date(data.issueDate).getTime();
      const due = new Date(data.dueDate).getTime();

      if (due < issue) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Due date cannot be earlier than the issue date',
          path: ['dueDate'],
        });
      }
    }),
});

export const updateInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Invoice ID format' }),
  }),
  body: z
    .object({
      clientId: z.string().uuid().optional(),
      fundingSourceId: z.string().uuid().optional(),
      issueDate: z
        .string()
        .datetime({ message: 'Invalid issue date format (must be ISO 8601)' })
        .optional(),
      dueDate: z
        .string()
        .datetime({ message: 'Invalid due date format (must be ISO 8601)' })
        .optional(),
      status: InvoiceStatusEnum.optional(),
      totalAmount: z.coerce.number().nonnegative().optional(),
      notes: z.string().trim().optional(),
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

      // Enforce time consistency only if both issueDate and dueDate are in the payload
      if (data.issueDate && data.dueDate) {
        const issue = new Date(data.issueDate).getTime();
        const due = new Date(data.dueDate).getTime();

        if (due < issue) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Due date cannot be earlier than the issue date',
            path: ['dueDate'],
          });
        }
      }
    }),
});

export const getInvoicesQuerySchema = z.object({
  query: z.object({
    page: pageSchema,
    limit: limitSchema,
    clientId: z.string().uuid().optional(),
    fundingSourceId: z.string().uuid().optional(),
    status: InvoiceStatusEnum.optional(),
    startDate: z
      .string()
      .datetime({ message: 'Invalid start date format (must be ISO 8601)' })
      .optional(),
    endDate: z
      .string()
      .datetime({ message: 'Invalid end date format (must be ISO 8601)' })
      .optional(),
  }),
});

export const invoiceIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid Invoice ID format' }),
  }),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>['body'];
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>['body'];
