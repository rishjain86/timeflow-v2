import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from './auth.middleware';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const methodToAction = (method: string): string => {
  switch (method) {
    case 'GET':
    case 'HEAD':
      return 'PHI_VIEW';
    case 'POST':
      return 'PHI_CREATE';
    case 'DELETE':
      return 'PHI_DELETE';
    default:
      return 'PHI_UPDATE';
  }
};

/**
 * Guards routes that handle protected health information:
 *  - forbids caching of responses (browsers/proxies must not store PHI)
 *  - writes an audit record for EVERY access attempt (reads included, denied attempts included)
 * The audit entry never contains request bodies or query values - only the path and query key names.
 */
export const phiGuard = (entityType: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  res.on('finish', () => {
    const user = req.user;
    if (!user || !user.organizationId) return; // unauthenticated attempts are handled by rate limiting / auth logs

    const path = req.originalUrl.split('?')[0];
    const entityId = path.match(UUID_RE)?.[0] ?? '';

    prisma.auditLog
      .create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          action: methodToAction(req.method),
          entityType,
          entityId,
          details: {
            method: req.method,
            path,
            queryKeys: Object.keys(req.query ?? {}),
            statusCode: res.statusCode,
            outcome: res.statusCode < 400 ? 'GRANTED' : 'DENIED_OR_FAILED',
            role: user.role,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] ?? null,
          },
        },
      })
      .catch((err: unknown) => {
        console.error('[audit] failed to record PHI access', err);
      });
  });

  next();
};
