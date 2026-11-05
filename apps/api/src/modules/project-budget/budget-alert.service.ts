import { AlertThreshold, NotificationType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import * as emailService from '../../services/email.service';

const THRESHOLDS = [
  { key: AlertThreshold.FIFTY, value: 50 },
  { key: AlertThreshold.SEVENTY_FIVE, value: 75 },
  { key: AlertThreshold.NINETY, value: 90 },
  { key: AlertThreshold.ONE_HUNDRED, value: 100 },
];

interface BudgetAlertParams {
  organizationId: string;
  projectBudgetId: string;
  projectMemberBudgetId?: string | null;
  userId: string;
  previousPercentage: number;
  newPercentage: number;
  projectName: string;
  taskName?: string;
  allocatedHours: number;
  consumedHours: number;
}

export const dispatchBudgetThresholdAlerts = async (params: BudgetAlertParams) => {
  const {
    organizationId,
    projectBudgetId,
    projectMemberBudgetId,
    userId,
    previousPercentage,
    newPercentage,
  } = params;

  // Find all thresholds that were just crossed in this single update
  // Example: jump from 40% to 92% will catch 50, 75, and 90
  const crossedThresholds = THRESHOLDS.filter(
    (t) => previousPercentage < t.value && newPercentage >= t.value
  );

  if (crossedThresholds.length === 0) return;

  // Get user details for email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  if (!user) return;

  for (const threshold of crossedThresholds) {
    // 1. Prevent duplicate alerts for the exact same threshold in this budget lifecycle
    const existingAlert = await prisma.budgetAlertEvent.findFirst({
      where: {
        projectBudgetId,
        projectMemberBudgetId: projectMemberBudgetId || null,
        threshold: threshold.key,
      },
    });

    if (existingAlert) continue;

    // 2. Record the alert event to prevent future duplicates
    await prisma.budgetAlertEvent.create({
      data: {
        threshold: threshold.key,
        consumptionPercentage: newPercentage,
        projectBudgetId,
        projectMemberBudgetId,
        userId,
        organizationId,
      },
    });

    const remainingHours = params.allocatedHours - params.consumedHours;
    const alertMessage = newPercentage >= 100
      ? `Budget Exhausted: 100% of allocated hours have been consumed for project ${params.projectName}${params.taskName ? ` (Task: ${params.taskName})` : ''}.`
      : `Budget Alert: ${threshold.value}% consumed for project ${params.projectName}${params.taskName ? ` (Task: ${params.taskName})` : ''}. Only ${remainingHours.toFixed(2)} hours remain.`;

    const notificationType = newPercentage >= 100 ? NotificationType.ERROR : NotificationType.WARNING;

    // 3. Create In-App Notification
    await prisma.notification.create({
      data: {
        title: `Budget Alert - ${threshold.value}% Used`,
        message: alertMessage,
        type: notificationType,
        userId: userId,
        organizationId,
        link: `/projects/${projectBudgetId}`, // Directs user to the project detail/budget page
      },
    });

    // 4. Dispatch Email Alert
    try {
      await emailService.sendBudgetAlertEmail({
        to: user.email,
        subject: `TimeFlow Budget Alert — ${params.taskName || 'Project'} Budget ${threshold.value}% Used`,
        projectName: params.projectName,
        employeeName: `${user.firstName} ${user.lastName || ''}`.trim(),
        taskName: params.taskName,
        allocatedHours: params.allocatedHours,
        consumedHours: params.consumedHours,
        remainingHours: remainingHours,
        usagePercentage: newPercentage,
        threshold: threshold.value,
      });
    } catch (error) {
      console.error(`[BudgetAlertService] Failed to send email to ${user.email}:`, error);
      // We don't throw here to ensure the transaction/flow doesn't break just because of an email failure
    }
  }
};
