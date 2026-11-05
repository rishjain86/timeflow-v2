import { NotificationType } from '@prisma/client';
import prisma from '../../lib/prisma';
import { sendBudgetAlertEmail } from '../../services/email.service';

export interface NotificationPayload {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Core Engine dispatcher for all system notifications.
 * Handles in-app database logging and external delivery (Email/SMS).
 */
export const dispatchNotification = async (payload: NotificationPayload) => {
  const inAppNotification = await prisma.notification.create({
    data: {
      userId: payload.userId,
      organizationId: payload.organizationId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      link: payload.link,
      isRead: false,
    },
  });

  console.log(`[NOTIFICATION DISPATCHED] [${payload.type}] to User ${payload.userId}: ${payload.title}`);

  return inAppNotification;
};

export interface BudgetThresholdAlertPayload {
  organizationId: string;
  organizationName: string;
  userIds: string[];
  userEmails: string[];
  threshold: number;
  projectId: string;
  projectName: string;
  therapistName: string;
  taskName?: string;
  allocatedHours: number;
  consumedHours: number;
  remainingHours: number;
  consumptionPercentage: number;
}

/**
 * SPRINT 6 Business Logic: Project/Employee Budget Threshold Monitor
 * Replaces the old single-budget monitor to support 50/75/90/100 thresholds across multi-levels.
 */
export const dispatchBudgetThresholdAlerts = async (payload: BudgetThresholdAlertPayload): Promise<void> => {
  const isError = payload.threshold >= 100;
  const type = isError ? NotificationType.ERROR : NotificationType.WARNING;
  
  const title = isError 
    ? `Budget Exhausted: 100% Consumed` 
    : `Budget Alert: ${payload.threshold}% Consumed`;
    
  const contextName = payload.taskName ? `Task (${payload.taskName})` : `Project Allocation`;
  
  const message = isError
    ? `The allocated budget for ${contextName} has been fully exhausted. 0 hours remain.`
    : `${contextName} has reached ${payload.threshold}% of its allocation. Only ${payload.remainingHours} hours remain.`;

  const link = `/projects/${payload.projectId}/budget`;

  for (let i = 0; i < payload.userIds.length; i++) {
    const userId = payload.userIds[i];
    const userEmail = payload.userEmails[i];

    // 1. Dispatch In-App Notification
    await dispatchNotification({
      userId,
      organizationId: payload.organizationId,
      type,
      title,
      message,
      link,
    });

    // 2. Dispatch Email Notification
    if (userEmail) {
      await sendBudgetAlertEmail({
        to: userEmail,
        organizationName: payload.organizationName,
        projectName: payload.projectName,
        therapistName: payload.therapistName,
        taskName: payload.taskName,
        allocatedHours: payload.allocatedHours,
        consumedHours: payload.consumedHours,
        remainingHours: payload.remainingHours,
        percentage: payload.consumptionPercentage,
        threshold: payload.threshold,
      }).catch(err => console.error(`[EMAIL FAILED] Failed to send budget alert to ${userEmail}:`, err));
    }
  }
};

/**
 * SPRINT 3 Business Logic: Authorization Limit Monitor
 * Evaluates specific Service Code (CPT) unit consumption for a client's prior authorization.
 */
export const checkAndTriggerAuthLimitAlerts = async (
  organizationId: string,
  authorizationId: string,
  serviceCode: string,
  managerUserId: string,
  consumedUnits: number,
  approvedUnits: number
): Promise<void> => {
  const consumptionPercentage = approvedUnits > 0 ? (consumedUnits / approvedUnits) * 100 : 100;

  if (consumptionPercentage >= 100) {
    await dispatchNotification({
      userId: managerUserId,
      organizationId,
      type: NotificationType.ERROR,
      title: 'Authorization Limit Exhausted',
      message: `Service Code ${serviceCode} has reached its authorized limit of ${approvedUnits} units.`,
      link: `/authorizations/${authorizationId}`,
    });
  } else if (consumptionPercentage >= 80) {
    await dispatchNotification({
      userId: managerUserId,
      organizationId,
      type: NotificationType.WARNING,
      title: 'Authorization Limit Warning',
      message: `Service Code ${serviceCode} has consumed ${consumptionPercentage.toFixed(1)}% of its authorized units.`,
      link: `/authorizations/${authorizationId}`,
    });
  }
};
