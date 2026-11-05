import { z } from 'zod';
import { InvoiceStatus } from '@prisma/client';

export const listInvoicesSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1').optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10').optional(),
    
    search: z.string().optional(), // For searching invoiceNumber
    
    status: z.nativeEnum(InvoiceStatus).optional(),
    
    clientId: z.string().uuid("Invalid Client ID").optional(),
    fundingSourceId: z.string().uuid("Invalid Funding Source ID").optional(),
    
    fromDate: z.string().datetime({ message: "Invalid fromDate format (ISO expected)" }).optional(),
    toDate: z.string().datetime({ message: "Invalid toDate format (ISO expected)" }).optional(),
  }),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesSchema>['query'];
