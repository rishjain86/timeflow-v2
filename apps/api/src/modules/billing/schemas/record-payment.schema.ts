import { z } from 'zod';

export const recordPaymentSchema = z.object({
params: z.object({
id: z.string().uuid('Invalid Invoice ID format'),
}),
body: z.object({
amount: z.number().positive('Payment amount must be greater than zero'),
paymentDate: z.string().datetime({ message: 'Invalid payment date format (ISO expected)' }),
paymentMethod: z.enum(['CREDIT_CARD', 'BANK_TRANSFER', 'CHECK', 'CASH', 'ONLINE', 'OTHER'], {
required_error: 'Payment method is required',
invalid_type_error: 'Invalid payment method',
}),
referenceNumber: z.string().optional(),
notes: z.string().optional(),
}),
});

export type RecordPaymentParams = z.infer<typeof recordPaymentSchema>['params'];
export type RecordPaymentBody = z.infer<typeof recordPaymentSchema>['body'];
