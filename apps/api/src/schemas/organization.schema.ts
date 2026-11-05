import { z } from 'zod';

export const createOrganizationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Organization name is required' }).min(2, 'Name must be at least 2 characters'),
    domain: z.string().optional(),
    companyName: z.string().optional(),
    defaultCurrency: z.string().length(3, 'Currency code must be exactly 3 characters').optional(),
    timeZone: z.string().optional(),
  }),
});

export const updateOrganizationSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    domain: z.string().optional(),
    companyName: z.string().optional(),
    logoUrl: z.string().url('Invalid logo URL').optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    website: z.string().url('Invalid website URL').optional(),
    defaultCurrency: z.string().length(3, 'Currency code must be exactly 3 characters').optional(),
    taxRate: z.number().min(0, 'Tax rate cannot be negative').optional(),
    invoicePrefix: z.string().optional(),
    dueDays: z.number().int().min(0, 'Due days cannot be negative').optional(),
    invoiceNotes: z.string().optional(),
    footerText: z.string().optional(),
    defaultHourlyRate: z.number().min(0, 'Hourly rate cannot be negative').optional(),
    timeZone: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.string().optional(),
    language: z.string().optional(),
    theme: z.string().optional(),
    notificationsOn: z.boolean().optional(),
  }),
});
