import { z } from 'zod';
import { TaskStatus } from '@prisma/client';

const TaskStatusEnum = z.nativeEnum(TaskStatus);

export const createTaskSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Task name must be at least 2 characters').max(255, 'Task name cannot exceed 255 characters'),
    description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional(),
    projectId: z.string().uuid('Invalid project ID format'),
    assignedToId: z.string().uuid('Invalid assigned user ID format').optional().nullable(),
    // 🟢 FIX: Allow array of user IDs for granular assignments so Zod doesn't strip it
    assignedUsers: z.array(z.string().uuid('Invalid user ID format')).optional().nullable(),
    status: TaskStatusEnum.optional().default(TaskStatus.TODO),
    dueDate: z.string().datetime({ message: 'Invalid due date format (must be ISO 8601)' }).optional().nullable(),
    isBillable: z.boolean().optional().default(true),
    requiresClinicalCompliance: z.boolean().optional().default(false),
    // 🟢 FIX: Strictly coerce to number, even if it's an empty string or undefined
    hourlyRate: z.union([z.string(), z.number()]).optional().nullable().transform(val => val === '' ? null : Number(val)),
  }),
});

export const assignTasksSchema = z.object({
  body: z.object({
    projectId: z.string().uuid('Invalid project ID format'),
    taskNames: z.array(z.string().min(1, 'Task name cannot be empty')).min(1, 'Select at least one task'),
    tasksConfig: z.array(
      z.object({
        name: z.string(),
        requiresClinicalCompliance: z.boolean().optional(),
      })
    ).optional(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    name: z.string().trim().min(2, 'Task name must be at least 2 characters').max(255, 'Task name cannot exceed 255 characters').optional(),
    description: z.string().trim().max(2000, 'Description cannot exceed 2000 characters').optional().nullable(),
    projectId: z.string().uuid('Invalid project ID format').optional(),
    assignedToId: z.string().uuid('Invalid assigned user ID format').optional().nullable(),
    // 🟢 FIX: Allow array of user IDs during task update (Bypasses Schema Stripping)
    assignedUsers: z.array(z.string().uuid('Invalid user ID format')).optional().nullable(),
    dueDate: z.string().datetime({ message: 'Invalid due date format (must be ISO 8601)' }).optional().nullable(),
    status: TaskStatusEnum.optional(),
    isBillable: z.boolean().optional(),
    requiresClinicalCompliance: z.boolean().optional(),
    // 🟢 FIX: Strictly coerce to number during update
    hourlyRate: z.union([z.string(), z.number()]).optional().nullable().transform(val => val === '' ? null : Number(val)),
  }).refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required to update',
  }),
});

export const getTasksQuerySchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/, 'Page must be a positive integer').optional(),
    limit: z.string().regex(/^\d+$/, 'Limit must be a positive integer').optional(),
    search: z.string().optional(),
    projectId: z.string().uuid('Invalid project ID format').optional(),
    assignedToId: z.string().uuid('Invalid assigned user ID format').optional(),
    status: TaskStatusEnum.optional(),
  }),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>['body'];
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>['body'];
export type AssignTasksInput = z.infer<typeof assignTasksSchema>['body'];
