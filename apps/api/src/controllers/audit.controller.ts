import { Response, NextFunction, Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { getAuditLogsQuerySchema, getAuditLogByIdSchema } from '../schemas/audit.schema';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export const getAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedQuery = getAuditLogsQuerySchema.parse({ query: req.query });
    const { page, limit, search, userId, action, entity, startDate, endDate } = validatedQuery.query;

    const { organizationId } = req.user;

    const where: Prisma.AuditLogWhereInput = {
      organizationId,
    };

    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entity) where.entityType = entity;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      where.OR = [
        { entityId: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { details: { path: ['ipAddress'], string_contains: search } },
        { details: { path: ['userAgent'], string_contains: search } },
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: logs,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = getAuditLogByIdSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const log = await prisma.auditLog.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!log) {
      res.status(404).json({ success: false, message: 'Audit log not found' });
      return;
    }

    res.status(200).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
};
