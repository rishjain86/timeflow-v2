import { Response, NextFunction, Request } from 'express';
import prisma from '../lib/prisma';
import { updateSettingsSchema } from '../schemas/settings.schema';
import { logAudit } from '../services/audit.service';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

// Settings are stored directly on the Organization row.
const SETTINGS_SELECT = {
  id: true,
  companyName: true,
  logoUrl: true,
  address: true,
  phone: true,
  email: true,
  website: true,
  defaultCurrency: true,
  taxRate: true,
  invoicePrefix: true,
  dueDays: true,
  invoiceNotes: true,
  footerText: true,
  defaultHourlyRate: true,
  timeZone: true,
  dateFormat: true,
  timeFormat: true,
  language: true,
  theme: true,
  notificationsOn: true,
} as const;

export const getSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId } = req.user;

    const settings = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: SETTINGS_SELECT,
    });

    if (!settings) {
      res.status(404).json({ success: false, message: 'Organization not found' });
      return;
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = updateSettingsSchema.parse({ body: req.body });
    const { id: userId, organizationId } = req.user;

    const existingSettings = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: SETTINGS_SELECT,
    });

    const updatedSettings = await prisma.organization.update({
      where: { id: organizationId },
      data: validatedData.body,
      select: SETTINGS_SELECT,
    });

    await logAudit({
      organizationId,
      userId,
      action: 'UPDATE',
      entity: 'SETTINGS',
      entityId: updatedSettings.id,
      oldValues: existingSettings || {},
      newValues: updatedSettings,
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: updatedSettings,
    });
  } catch (error) {
    next(error);
  }
};
