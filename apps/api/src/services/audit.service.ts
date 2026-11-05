import { Request } from 'express';
import prisma from '../lib/prisma';
import { AuditAction, AuditEntity } from '@prisma/client';

interface LogAuditParams {
  organizationId: string;
  userId?: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  oldValues?: any;
  newValues?: any;
  req?: Request;
}

export const logAudit = async ({
  organizationId,
  userId,
  action,
  entity,
  entityId,
  oldValues,
  newValues,
  req,
}: LogAuditParams): Promise<void> => {
  try {
    const ipAddress = req?.ip || req?.headers['x-forwarded-for']?.toString() || null;
    const userAgent = req?.headers['user-agent'] || null;

    const sanitize = (data: any) => {
      if (!data || typeof data !== 'object') return data;
      const sanitized = { ...data };
      const sensitiveKeys = ['password', 'passwordHash', 'accessToken', 'refreshToken', 'token'];
      
      for (const key in sanitized) {
        if (sensitiveKeys.includes(key)) {
          sanitized[key] = '***MASKED***';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = sanitize(sanitized[key]); // recursive mask
        }
      }
      return sanitized;
    };

    await prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entity,
        entityId,
        oldValues: oldValues ? sanitize(oldValues) : undefined,
        newValues: newValues ? sanitize(newValues) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('[AuditService] Failed to create audit log:', error);
  }
};
