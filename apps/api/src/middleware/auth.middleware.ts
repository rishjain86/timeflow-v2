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
            role: true,
            isActive: true, // 🟢 FIX: Fetch isActive
            isBanned: true,  // 🟢 FIX: Fetch isBanned
            requirePasswordChange: true
          }
        }
      }
    });

    if (!session || session.expires < new Date()) {
      throw new UnauthorizedError('Session expired or invalid. Please login again.');
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

    // 3. Attach FRESH user data to request (Overriding the stale JWT organizationId)
    const freshUserData = {
      id: decoded.id,
      role: session.user.role,
      organizationId: session.user.organizationId, // Real-time organization ID
    };

    req.user = freshUserData;
    res.locals.user = freshUserData; // Kept for downstream usage if needed

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
