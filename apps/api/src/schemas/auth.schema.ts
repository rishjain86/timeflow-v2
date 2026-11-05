import { z } from 'zod';
import { Role, IndustryType } from '@prisma/client'; // 🟢 Added IndustryType for SaaS

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').optional(),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    organizationName: z.string().trim().min(2, 'Organization name must be at least 2 characters'),
    // 🟢 NEW: Mandatory Phone Number for Owner
    phone: z.string().min(10, 'Valid phone number is required'),
    // 🟢 NEW: Industry Type for SaaS Toggling (Frontend se aayega)
    industryType: z.nativeEnum(IndustryType).optional().default(IndustryType.GENERAL),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// 🟢 NEW: Schema for Admins to invite users
export const inviteUserSchema = z.object({
  body: z.object({
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    firstName: z.string().trim().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().trim().min(2, 'Last name must be at least 2 characters').optional(),
    role: z.nativeEnum(Role).optional().default(Role.USER),
  }),
});

// 🟢 NEW: Schema for Users to accept invites and set their mandatory phone/password
export const acceptInviteSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Invitation token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    phone: z.string().min(10, 'Valid phone number is required'),
  }),
});

// 🟢 NEW: Schema for Admins to Manage users (Ban, lock hours, etc.)
export const manageUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    isBanned: z.boolean().optional(),
    isActive: z.boolean().optional(),
    role: z.nativeEnum(Role).optional(),
    hourlyRate: z.number().min(0).optional(),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type InviteUserInput = z.infer<typeof inviteUserSchema>['body'];
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>['body'];
export type ManageUserInput = z.infer<typeof manageUserSchema>['body'];
