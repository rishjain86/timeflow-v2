import { Router } from 'express';
import { getBillingReviewDashboard } from './billing-review.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { getBillingReviewQuerySchema } from './billing-review.schema';

const router = Router();

router.get(
  '/dashboard',
  requireAuth, // Ensure only managers/admins can access
  validateRequest(getBillingReviewQuerySchema),
  getBillingReviewDashboard
);

export default router;
