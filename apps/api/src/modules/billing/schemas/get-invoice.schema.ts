import { z } from 'zod';

export const getInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Invoice ID format'),
  }),
});

export type GetInvoiceParams = z.infer<typeof getInvoiceSchema>['params'];
