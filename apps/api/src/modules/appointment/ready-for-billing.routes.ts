import { Router } from 'express';
import { markReadyForBillingController } from './ready-for-billing.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { markReadyForBillingSchema } from './ready-for-billing.schema';
import { Role } from '@prisma/client';

const router = Router();

// Endpoint: POST /appointments/:id/ready-for-billing
router.post(
  '/:id/ready-for-billing',
  authenticate, 
  authorize([Role.ADMIN, Role.MANAGER]), 
  validateRequest(markReadyForBillingSchema),
  markReadyForBillingController
);

export default router;
