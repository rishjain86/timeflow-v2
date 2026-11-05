import { z } from 'zod';

const PaymentMethodEnum = z.enum([
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'PAYPAL',
  'STRIPE',
  'CASH',
  'OTHER',
]);

export const createExpenseSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, 'Expense title is required').max(100, 'Title is too long'),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional().nullable(),
    amount: z.number().positive('Expense amount must be greater than zero'),
    currency: z.string().trim().toUpperCase().length(3, 'Currency must be a valid 3-letter ISO code').default('USD'),
    expenseDate: z.string().datetime({ message: 'Invalid expense date format (must be ISO 8601)' }),
    category: z.string().trim().min(1, 'Category is required').max(50, 'Category name is too long'),
    paymentMethod: PaymentMethodEnum.default('BANK_TRANSFER'),
    referenceNumber: z.string().trim().max(100, 'Reference number is too long').optional().nullable(),
    
    // Optional relations scoped within the organization
    projectId: z.string().uuid('Invalid project ID format').optional().nullable(),
    clientId: z.string().uuid('Invalid client ID format').optional().nullable(),
    
    isBillable: z.boolean().default(false),
  }),
});

export const updateExpenseSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid expense ID format'),
  }),
  body: z.object({
    title: z.string().trim().min(1).max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    amount: z.number().positive('Expense amount must be greater than zero').optional(),
    currency: z.string().trim().toUpperCase().length(3).optional(),
    expenseDate: z.string().datetime().optional(),
    category: z.string().trim().min(1).max(50).optional(),
    paymentMethod: PaymentMethodEnum.optional(),
    referenceNumber: z.string().trim().max(100).optional().nullable(),
    projectId: z.string().uuid().optional().nullable(),
    clientId: z.string().uuid().optional().nullable(),
    isBillable: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  }),
});

export const getExpensesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1, 'Page must be at least 1').optional().default(1),
    limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100').optional().default(20),
    search: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().max(50).optional(),
    projectId: z.string().uuid('Invalid project ID format').optional(),
    clientId: z.string().uuid('Invalid client ID format').optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'Start date must be earlier than or equal to end date',
    path: ['startDate'],
  }),
});
