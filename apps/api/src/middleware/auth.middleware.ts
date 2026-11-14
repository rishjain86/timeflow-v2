import { actorStorage } from '../utils/request-context';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: Role;
    organizationId: string | null;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is missing');
    }

    const token = authHeader.substring(7);

    // 1. Verify JWT signature & expiry
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      role: Role;
      organizationId: string | null;
    };

    // 2. Check session in DB AND fetch the absolute latest user data in one query
    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: {
        user: {
          select: {
            organizationId: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true, // 🟢 FIX: Fetch isActive
            isBanned: true,  // 🟢 FIX: Fetch isBanned
            requirePasswordChange: true,
            mfaEnabled: true
          }
        }
      }
    });

    if (!session || session.expires < new Date()) {
      throw new UnauthorizedError('Session expired or invalid. Please login again.');
    }

    // Idle timeout: protected health information must not stay reachable from an abandoned session.
    const idleLimitMs = (Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES) || 60) * 60 * 1000;
    const idleForMs = Date.now() - session.lastActivityAt.getTime();
    if (idleForMs > idleLimitMs) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
      throw new UnauthorizedError('Your session timed out due to inactivity. Please sign in again.');
    }
    if (idleForMs > 60 * 1000) {
      // Refresh at most once a minute to keep database writes low.
      prisma.session.update({ where: { id: session.id }, data: { lastActivityAt: new Date() } }).catch(() => undefined);
    }

    if (!session.user) {
      throw new UnauthorizedError('User account no longer exists.');
    }

    // 🟢 THE REAL SECURITY FIX: Instantly reject banned or inactive users!
    if (session.user.isBanned) {
      throw new UnauthorizedError('Your account has been banned by the administrator. Contact support.');
    }
    
    if (!session.user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated. Contact your administrator.');
    }

    // Accounts holding a temporary password may only change it (or sign out / read their own profile).
    if (session.user.requirePasswordChange) {
      const path = req.originalUrl.split('?')[0];
      const allowed = ['/api/v1/users/update-password', '/api/v1/auth/logout', '/api/v1/auth/me'];
      if (!allowed.includes(path)) {
        res.status(403).json({
          success: false,
          code: 'PASSWORD_CHANGE_REQUIRED',
          message: 'You must change your temporary password before continuing.',
        });
        return;
      }
    }

    // Mandatory MFA (opt-in via MFA_ENFORCE=true): affected roles must enrol before using anything else.
    if (process.env.MFA_ENFORCE === 'true' && !session.user.mfaEnabled) {
      const mfaRoles = (process.env.MFA_REQUIRED_ROLES || 'SUPER_ADMIN,ADMIN,MANAGER,THERAPIST').split(',').map((r) => r.trim());
      if (mfaRoles.includes(session.user.role)) {
        const path = req.originalUrl.split('?')[0];
        const allowed = [
          '/api/v1/auth/mfa/status',
          '/api/v1/auth/mfa/setup',
          '/api/v1/auth/mfa/enable',
          '/api/v1/auth/logout',
          '/api/v1/auth/me',
          '/api/v1/users/update-password',
        ];
        if (!allowed.includes(path)) {
          res.status(403).json({
            success: false,
            code: 'MFA_SETUP_REQUIRED',
            message: 'Multi-factor authentication must be set up before you can continue.',
          });
          return;
        }
      }
    }

    // Portal patients may ONLY use the patient API (plus sign-out / profile / password change).
    // Enforced here so that routes without their own role check can never leak data to a patient.
    if (session.user.role === 'PATIENT') {
      const path = req.originalUrl.split('?')[0];
      const allowed =
        path.startsWith('/api/v1/patient/') ||
        ['/api/v1/users/update-password', '/api/v1/auth/logout', '/api/v1/auth/me'].includes(path);
      if (!allowed) {
        res.status(403).json({ success: false, code: 'PATIENT_SCOPE', message: 'This area is not available for patient accounts.' });
        return;
      }
    }

    // 3. Attach FRESH user data to request (Overriding the stale JWT organizationId)
    const freshUserData = {
      id: decoded.id,
      role: session.user.role,
      organizationId: session.user.organizationId, // Real-time organization ID
    };

    req.user = freshUserData;
    res.locals.user = freshUserData; // Kept for downstream usage if needed

    // Make "who is acting" available to the time-entry change tracker for the rest of this request.
    actorStorage.enterWith({
      userId: decoded.id,
      name: `${session.user.firstName ?? ''} ${session.user.lastName ?? ''}`.trim() || null,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Invalid or expired authentication token'));
    } else {
      next(error);
    }
  }
};

export const authenticate = requireAuth; 

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // FIX: Use typed req.user instead of generic res.locals.user
      const user = req.user;
      
      if (!user || !user.role) {
        throw new UnauthorizedError('User identity not found');
      }

      if (!allowedRoles.includes(user.role)) {
        throw new ForbiddenError('You do not have permission to perform this action');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Alias used by the healthcare route modules
export const authorize = requireRole;
