import { z } from 'zod';

export const getBillingReviewQuerySchema = z.object({
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    therapistId: z.string().uuid().optional(),
    // Optional filter to only show specific statuses
    statusFilter: z.enum(['ready', 'missing_attendance', 'cnr_pending']).optional(), 
  }),
});

export type GetBillingReviewQuery = z.infer<typeof getBillingReviewQuerySchema>['query'];
