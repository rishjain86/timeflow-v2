import { z } from 'zod';

export const markReadyForBillingSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid appointment ID' }),
  }),
});
