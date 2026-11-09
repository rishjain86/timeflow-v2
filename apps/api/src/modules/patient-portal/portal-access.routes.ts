import { Router, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { grantPortalAccess, revokePortalAccess } from './portal-access.service';

const router = Router();
const idSchema = z.string().uuid({ message: 'Invalid case ID format' });
const grantBodySchema = z.object({ email: z.string().trim().email('A valid patient email is required') });

router.use(authenticate);
router.use(requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]));

// Grant the patient of a case (project) portal access. Body: { email }
router.post('/:projectId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = idSchema.parse(req.params.projectId);
    const { email } = grantBodySchema.parse(req.body);
    const data = await grantPortalAccess(projectId, req.user!.organizationId!, req.user!.id, email);
    res.status(201).json({
      success: true,
      message: data.temporaryPassword
        ? 'Portal access granted. Share the temporary password securely - it is shown only once.'
        : 'Portal access granted. This patient already has a login, so the case was linked to it.',
      data,
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:projectId', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = idSchema.parse(req.params.projectId);
    const data = await revokePortalAccess(projectId, req.user!.organizationId!, req.user!.id);
    res.status(200).json({ success: true, message: 'Portal access revoked', data });
  } catch (error) {
    next(error);
  }
});

export default router;
