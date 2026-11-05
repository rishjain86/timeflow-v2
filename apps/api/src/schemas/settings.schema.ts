import { z } from 'zod';

export const updateSettingsSchema = z.object({
  body: z.object({
    companyName: z.string().trim().max(100).optional().nullable(),
    logoUrl: z.string().url('Invalid URL').max(255).optional().nullable(),
    address: z.string().trim().max(255).optional().nullable(),
    phone: z.string().trim().max(50).optional().nullable(),
    email: z.string().email('Invalid email address').max(100).optional().nullable(),
    website: z.string().url('Invalid URL').max(255).optional().nullable(),
    
    defaultCurrency: z.string().trim().toUpperCase().length(3).optional(),
    taxRate: z.number().min(0).max(100).optional(),
    invoicePrefix: z.string().trim().max(20).optional(),
    dueDays: z.number().int().min(0).max(365).optional(),
    invoiceNotes: z.string().max(1000).optional().nullable(),
    footerText: z.string().max(500).optional().nullable(),
    
    defaultHourlyRate: z.number().min(0).optional().nullable(),
    timeZone: z.string().trim().max(50).optional(),
    dateFormat: z.string().trim().max(20).optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    
    language: z.string().trim().max(10).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    notificationsOn: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one setting must be provided to update',
  }),
});
