import { z } from 'zod';
import { Role } from '@prisma/client';

const RoleEnum = z.nativeEnum(Role);

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50, 'First name cannot exceed 50 characters'),
    lastName: z.string().trim().max(50, 'Last name cannot exceed 50 characters').optional().nullable(),
    role: RoleEnum.optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    email: z.string().email('Invalid email format').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters').optional(),
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters').max(50, 'First name cannot exceed 50 characters').optional(),
    lastName: z.string().trim().max(50, 'Last name cannot exceed 50 characters').optional().nullable(),
    
    // 🟢 FIX: Phone field added so backend accepts it without throwing 400 Bad Request
    phone: z.string().trim().max(20, 'Phone number cannot exceed 20 characters').optional().nullable(),
    
    role: RoleEnum.optional(),
    // 🟢 FIX: Added missing Status fields to validation so backend doesn't reject them
    isActive: z.boolean().optional(),
    isBanned: z.boolean().optional(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  }),
});

export const getUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').optional(),
    search: z.string().optional(),
    role: RoleEnum.optional(),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
