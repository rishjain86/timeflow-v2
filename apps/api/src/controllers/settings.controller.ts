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

export const getSettings = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { organizationId } = req.user;

    let settings = await prisma.setting.findUnique({
      where: { organizationId },
    });

    // If settings don't exist for the organization, create default settings
    if (!settings) {
      settings = await prisma.setting.create({
        data: {
          organizationId,
        },
      });
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

    const existingSettings = await prisma.setting.findUnique({
      where: { organizationId },
    });

    const updatedSettings = await prisma.setting.upsert({
      where: { organizationId },
      update: validatedData.body,
      create: {
        organizationId,
        ...validatedData.body,
      },
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
