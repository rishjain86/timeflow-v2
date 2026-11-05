import { Response, NextFunction, Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { getNotificationsQuerySchema, markNotificationReadSchema } from '../schemas/notification.schema';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export const getNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedQuery = getNotificationsQuerySchema.parse({ query: req.query });
    const { page, limit, isRead } = validatedQuery.query;

    const { id: userId, organizationId } = req.user;

    const where: Prisma.NotificationWhereInput = {
      userId,
      organizationId,
    };

    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const skip = (page - 1) * limit;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, organizationId, isRead: false } }),
    ]);

    res.status(200).json({
      success: true,
      data: notifications,
      meta: {
        total: totalCount,
        unread: unreadCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = markNotificationReadSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { id: userId, organizationId } = req.user;

    const notification = await prisma.notification.findFirst({
      where: { id, userId, organizationId },
    });

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: userId, organizationId } = req.user;

    await prisma.notification.updateMany({
      where: {
        userId,
        organizationId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = markNotificationReadSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { id: userId, organizationId } = req.user;

    const notification = await prisma.notification.findFirst({
      where: { id, userId, organizationId },
    });

    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found' });
      return;
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
};
