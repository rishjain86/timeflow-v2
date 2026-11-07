import { Router, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { grantPortalAccess, revokePortalAccess } from './portal-access.service';

const router = Router();
const idSchema = z.string().uuid({ message: 'Invalid client ID format' });

router.use(authenticate);
router.use(requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]));

router.post('/:clientId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = idSchema.parse(req.params.clientId);
    const data = await grantPortalAccess(clientId, req.user!.organizationId!, req.user!.id);
    res.status(201).json({
      success: true,
      message: 'Portal access granted. Share the temporary password securely - it is shown only once.',
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:clientId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const clientId = idSchema.parse(req.params.clientId);
    const data = await revokePortalAccess(clientId, req.user!.organizationId!, req.user!.id);
    res.status(200).json({ success: true, message: 'Portal access revoked', data });
  } catch (error) {
    next(error);
  }
});

export default router;
