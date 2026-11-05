import { z } from 'zod';
import { InvoiceStatus } from '@prisma/client';

const InvoiceStatusEnum = z.nativeEnum(InvoiceStatus);

export const createInvoiceSchema = z.object({
  body: z.object({
    invoiceNumber: z.string().trim().min(1, 'Invoice number is required').max(50, 'Invoice number is too long'),
    clientId: z.string().uuid('Invalid client ID format'),
    projectId: z.string().uuid('Invalid project ID format').optional().nullable(),
    issueDate: z.string().datetime({ message: 'Invalid issue date format (must be ISO 8601)' }),
    dueDate: z.string().datetime({ message: 'Invalid due date format (must be ISO 8601)' }).optional().nullable(),
    subtotal: z.number().min(0, 'Subtotal cannot be negative'),
    taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100').optional().default(0),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  }),
});

export const updateInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID format'),
  }),
  body: z.object({
    status: InvoiceStatusEnum.optional(),
    dueDate: z.string().datetime({ message: 'Invalid due date format (must be ISO 8601)' }).optional().nullable(),
    subtotal: z.number().min(0, 'Subtotal cannot be negative').optional(),
    taxRate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100').optional(),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  }),
});

export const getInvoicesQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').optional(),
    search: z.string().optional(),
    status: InvoiceStatusEnum.optional(),
    clientId: z.string().uuid('Invalid client ID format').optional(),
  }),
});
