import { NotificationType } from '@prisma/client';
import prisma from '../lib/prisma';

interface CreateNotificationParams {
  userId: string;
  organizationId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

export const createNotification = async ({
  userId,
  organizationId,
  title,
  message,
  type = 'INFO',
  link,
}: CreateNotificationParams): Promise<void> => {
  try {
    // Optionally check if user has notificationsOn in settings
    const settings = await prisma.setting.findUnique({
      where: { organizationId },
      select: { notificationsOn: true }
    });

    if (settings && !settings.notificationsOn) {
      return; // Skip sending if globally disabled for the tenant (or check user-level preferences if implemented)
    }

    await prisma.notification.create({
      data: {
        userId,
        organizationId,
        title,
        message,
        type,
        link,
      },
    });
  } catch (error) {
    console.error('[NotificationService] Failed to create notification:', error);
  }
};
