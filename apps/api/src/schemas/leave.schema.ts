import { z } from 'zod';

export const LeaveTypeEnum = z.enum([
  'SICK', 'CASUAL', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER'
]);

export const LeaveStatusEnum = z.enum([
  'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
]);

export const createLeaveSchema = z.object({
  body: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    type: LeaveTypeEnum,
    reason: z.string().min(5).max(500),
  }).refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'End date must be greater than or equal to start date',
    path: ['endDate'],
  }),
});

export const updateLeaveSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid leave ID format'),
  }),
  body: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    type: LeaveTypeEnum.optional(),
    reason: z.string().min(5).max(500).optional(),
  }).refine((data) => {
    if (data.startDate && data.endDate) {
      return new Date(data.startDate) <= new Date(data.endDate);
    }
    return true;
  }, {
    message: 'End date must be greater than or equal to start date',
    path: ['endDate'],
  }),
});

export const getLeavesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: LeaveStatusEnum.optional(),
    type: LeaveTypeEnum.optional(),
    userId: z.string().uuid().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
});
