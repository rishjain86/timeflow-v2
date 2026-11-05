import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import authRoutes from './auth'; 
import projectRoutes from './project.routes';
import clientRoutes from './client.routes'; 
import billingRoutes from '../modules/billing/billing.routes'; 
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 🛡️ Extra Auth Rate Limiter Guard for Router-Level Entry
const authIpTracker = new Map<string, { count: number; resetAt: number }>();
const routerAuthLimiter = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') return next();
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = authIpTracker.get(ip);
  if (!entry || now > entry.resetAt) {
    authIpTracker.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return next();
  }
  if (entry.count >= 30) {
    return res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
    });
  }
  entry.count += 1;
  return next();
};

// Health Check Route 
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'API is running smoothly! 🚀' });
});

// ============================================================================
// 🔑 EMERGENCY SUPER ADMIN RECOVERY ROUTE (Open in Browser to Reset & View ID)
// ============================================================================
router.get('/emergency-super-admin', async (req: Request, res: Response) => {
  try {
    const newPlainPassword = 'Admin@12345';
    const hashedPassword = await bcrypt.hash(newPlainPassword, 10);

    // Step 1: Find existing SUPER_ADMIN or ADMIN user in DB
    let adminUser = await prisma.user.findFirst({
      where: {
        role: { in: ['SUPER_ADMIN', 'ADMIN'] as any },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Step 2: Fallback to any user if no admin role matched
    if (!adminUser) {
      adminUser = await prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
      });
    }

    if (adminUser) {
      // Update existing user to SUPER_ADMIN and set known password
      const updated = await prisma.user.update({
        where: { id: adminUser.id },
        data: {
          password: hashedPassword,
          role: 'SUPER_ADMIN' as any,
          isActive: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: '✅ Super Admin credentials recovered and password reset successfully!',
        loginCredentials: {
          email: updated.email,
          password: newPlainPassword,
          role: updated.role,
          name: `${updated.firstName || ''} ${updated.lastName || ''}`.trim(),
        },
      });
    } else {
      // Step 3: If DB has zero users, create a default Organization & Super Admin
      let org = await prisma.organization.findFirst();
      if (!org) {
        org = await prisma.organization.create({
          data: {
            name: 'TimeFlow Enterprise',
            industryType: 'HEALTHCARE' as any,
          },
        });
      }

      const created = await prisma.user.create({
        data: {
          firstName: 'Super',
          lastName: 'Admin',
          email: 'admin@timeflow.io',
          password: hashedPassword,
          role: 'SUPER_ADMIN' as any,
          organizationId: org.id,
          isActive: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: '✅ Fresh Super Admin account created successfully!',
        loginCredentials: {
          email: created.email,
          password: newPlainPassword,
          role: created.role,
        },
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to recover Super Admin',
      error: error?.message || 'Unknown error',
    });
  }
});

// ==========================================
// Public Routes (Protected with Brute-Force Rate Limiting)
// ==========================================
router.use('/auth', routerAuthLimiter, authRoutes);

// ==========================================
// Protected Routes (JWT Token Required)
// ==========================================
router.use(authenticate);

// Projects Route Activated
router.use('/projects', projectRoutes);

// Clients Route Activated
router.use('/clients', clientRoutes); 

// Billing module registered
router.use('/billing', billingRoutes);

export default router;
