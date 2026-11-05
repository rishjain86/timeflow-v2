import { z } from 'zod';

export const createClientSchema = z.object({
  body: z.object({
    // 🟢 Naye fields jo frontend se aa rahe hain
    firstName: z.string().trim().min(1, 'First name is required').max(255, 'First name cannot exceed 255 characters'),
    lastName: z.string().trim().max(255).optional().nullable(),
    displayName: z.string().trim().min(2, 'Display name must be at least 2 characters').max(255, 'Display name cannot exceed 255 characters'),
    role: z.string().min(1, 'Role is required').optional(),
    
    // 🟢 Email ab mandatory hai automatic account banane ke liye
    email: z.string().email('Invalid email format'),
    phone: z.string().trim().max(50, 'Phone cannot exceed 50 characters').optional().nullable(),
    
    // Legacy fields (Pichle data compatibility ke liye optional rakhe hain)
    name: z.string().trim().max(255).optional().nullable(),
    address: z.string().trim().max(1000, 'Address cannot exceed 1000 characters').optional().nullable(),
    companyName: z.string().trim().max(255, 'Company name cannot exceed 255 characters').optional().nullable(),
  }),
});

export const updateClientSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid client ID format'),
  }),
  body: z.object({
    // 🟢 Edit form me hum displayName bhej rahe hain
    displayName: z.string().trim().min(2, 'Name must be at least 2 characters').max(255).optional(),
    
    name: z.string().trim().max(255).optional(), // Legacy support
    email: z.string().email('Invalid email format').optional().nullable(),
    phone: z.string().trim().max(50).optional().nullable(),
    address: z.string().trim().max(1000).optional().nullable(),
    companyName: z.string().trim().max(255).optional().nullable(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  }),
});

export const getClientsQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').optional(),
    search: z.string().optional(),
  }),
});

export type CreateClientInput = z.infer<typeof createClientSchema>['body'];
export type UpdateClientInput = z.infer<typeof updateClientSchema>['body'];
