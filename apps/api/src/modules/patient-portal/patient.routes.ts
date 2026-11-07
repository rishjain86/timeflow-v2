import { Router, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { getMyAppointments, getMyBilling, getMyProfile } from './patient.service';

const router = Router();

router.use(authenticate);
router.use(requireRole([Role.PATIENT]));

const handler =
  (fn: (userId: string, organizationId: string) => Promise<unknown>) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = await fn(req.user!.id, req.user!.organizationId!);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

router.get('/me', handler(getMyProfile));
router.get('/appointments', handler(getMyAppointments));
router.get('/billing', handler(getMyBilling));

export default router;
