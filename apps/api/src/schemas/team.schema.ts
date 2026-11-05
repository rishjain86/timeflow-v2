import { z } from 'zod';

export const createTeamSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Team name must be at least 2 characters').max(100),
    description: z.string().trim().max(1000).optional().nullable(),
    managerId: z.string().uuid('Invalid manager ID format').optional().nullable(),
  }),
});

export const updateTeamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid team ID format'),
  }),
  body: z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    managerId: z.string().uuid('Invalid manager ID format').optional().nullable(),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  }),
});

export const getTeamsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().trim().optional(),
  }),
});

export const teamIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid team ID format'),
  }),
});

export const addTeamMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid team ID format'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

export const removeTeamMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid team ID format'),
    userId: z.string().uuid('Invalid user ID format'),
  }),
});
