// apps/api/src/modules/billing/generate-invoice.schema.ts

import { z } from 'zod';

export const generateInvoicesSchema = z.object({
  body: z.object({
    clientId: z.string().uuid("Invalid Client ID").optional(),
    payerId: z.string().uuid("Invalid Payer/Funding Source ID").optional(),
    
    // Using ISO date strings (e.g., "2026-07-26T00:00:00Z")
    fromDate: z.string().datetime({ message: "Invalid fromDate format" }).optional(),
    toDate: z.string().datetime({ message: "Invalid toDate format" }).optional(),
    
    dryRun: z.boolean().default(false).optional(),
  }),
});

// Infer the TypeScript type to be used in the service
export type GenerateInvoicesBody = z.infer<typeof generateInvoicesSchema>['body'];
