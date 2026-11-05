import { z } from 'zod';
import { InvoiceStatus } from '@prisma/client';

export const updateInvoiceStatusSchema = z.object({
params: z.object({
id: z.string().uuid('Invalid Invoice ID format'),
}),
body: z.object({
status: z.nativeEnum(InvoiceStatus, {
required_error: 'Invoice status is required',
invalid_type_error: 'Invalid invoice status',
}),
notes: z.string().optional(),
}),
});

export type UpdateInvoiceStatusParams = z.infer<typeof updateInvoiceStatusSchema>['params'];
export type UpdateInvoiceStatusBody = z.infer<typeof updateInvoiceStatusSchema>['body'];
