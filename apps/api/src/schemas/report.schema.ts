import { z } from 'zod';

export const getReportQuerySchema = z.object({
  query: z.object({
    startDate: z.string().datetime({ message: 'Invalid start date format (must be ISO 8601)' }).optional(),
    endDate: z.string().datetime({ message: 'Invalid end date format (must be ISO 8601)' }).optional(),
  }),
});
