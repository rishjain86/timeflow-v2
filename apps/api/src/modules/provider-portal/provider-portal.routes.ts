import { Router, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { getProviderAppointments, getProviderNotes } from './provider-portal.service';

const router = Router();

router.use(authenticate);
router.use(requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]));

router.get('/appointments', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await getProviderAppointments(req.user!, req.user!.organizationId!);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/notes', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const data = await getProviderNotes(req.user!, req.user!.organizationId!);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export default router;
