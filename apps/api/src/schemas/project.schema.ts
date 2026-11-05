import { z } from 'zod';
import { ProjectStatus } from '@prisma/client';

const ProjectStatusEnum = z.nativeEnum(ProjectStatus);

// Intercepts and cleans edge-case frontend payloads
const emptyToUndefined = (val: unknown) => {
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') return undefined;
  }
  if (val === null) return undefined;
  return val;
};

const optionalId = z.preprocess(emptyToUndefined, z.string().optional());

const optionalDate = z.preprocess(
  emptyToUndefined, 
  z.string()
   .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
   .transform((val) => new Date(val))
   .optional()
);

// 🟢 FIX: Added string-to-number parser for budget coming from frontend
const optionalNumber = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
  }
  if (typeof val === 'number') return val;
  return undefined;
}, z.number().optional());

export const createProjectSchema = z.object({
  body: z.object({
    // 🟢 FIX: Project Name limit increased from 100 to 500 characters
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(500, 'Name cannot exceed 500 characters'),
    description: z.preprocess(emptyToUndefined, z.string().optional()),
    clientId: optionalId,
    status: z.preprocess(emptyToUndefined, ProjectStatusEnum.optional().default(ProjectStatus.PLANNING)),
    startDate: optionalDate,
    endDate: optionalDate,
    budget: optionalNumber, // Allow budget
    deadline: optionalDate, // Allow deadline
  }).refine((data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  }, {
    message: 'End date cannot be earlier than start date',
    path: ['endDate'],
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Invalid project ID format', invalid_type_error: 'Invalid project ID format' }),
  }),
  body: z.object({
    // 🟢 FIX: Project Name limit increased from 100 to 500 characters
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(500, 'Name cannot exceed 500 characters').optional(),
    description: z.preprocess(emptyToUndefined, z.string().optional()),
    clientId: optionalId,
    status: z.preprocess(emptyToUndefined, ProjectStatusEnum.optional()),
    startDate: optionalDate,
    endDate: optionalDate,
    budget: optionalNumber, // 🟢 Allow budget
    deadline: optionalDate, // 🟢 Allow deadline
  })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required to update',
    })
    .refine((data) => {
      // Use deadline for comparison if endDate is not provided, since we map it in controller
      const end = data.endDate || data.deadline;
      if (data.startDate && end) {
        return data.startDate <= end;
      }
      return true;
    }, {
      message: 'End date/deadline cannot be earlier than start date',
      path: ['deadline'],
    }),
});

export const getProjectsQuerySchema = z.object({
  query: z.object({
    // 🟢 FIX: Forcibly converts numbers to strings to bypass strict schema checks for pagination limits
    page: z.preprocess((val) => (val !== undefined && val !== null ? String(val) : undefined), z.string().optional()),
    limit: z.preprocess((val) => (val !== undefined && val !== null ? String(val) : undefined), z.string().optional()),
    search: z.string().optional(),
    clientId: optionalId,
    status: z.preprocess(emptyToUndefined, ProjectStatusEnum.optional()),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>['body'];
