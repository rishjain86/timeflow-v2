import { z } from 'zod';

export const notificationSchema = z.object({});
export const createNotificationSchema = z.object({});
export const updateNotificationSchema = z.object({});
export const markAsReadSchema = z.object({});

export const getNotificationsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    isRead: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  }),
});

export const markNotificationReadSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid notification ID format' }),
  }),
});
