import { z } from 'zod';

export const AuditActionEnum = z.enum([
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 
  'APPROVE', 'REJECT', 'EXPORT', 'IMPORT', 'RESTORE'
]);

export const AuditEntityEnum = z.enum([
  'USER', 'CLIENT', 'PROJECT', 'TASK', 'TIME_ENTRY', 
  'INVOICE', 'PAYMENT', 'EXPENSE', 'SETTINGS', 'ORGANIZATION'
]);

export const getAuditLogsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    search: z.string().trim().max(100).optional(),
    userId: z.string().uuid().optional(),
    action: AuditActionEnum.optional(),
    entity: AuditEntityEnum.optional(),
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

export const getAuditLogByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid audit log ID format'),
  }),
});
