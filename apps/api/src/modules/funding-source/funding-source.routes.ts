import { Router } from 'express';
import {
  createFundingSource,
  updateFundingSource,
  getFundingSources,
  getFundingSourceById,
} from './funding-source.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware'; // Adjust path if your middleware is located elsewhere

const router = Router();

// Require authentication for all routes
router.use(requireAuth);

// GET routes - Accessible to all authenticated users
router.get('/', getFundingSources);
router.get('/:id', getFundingSourceById);

// Mutations - Strictly for SUPER_ADMIN, ADMIN, and MANAGER
router.post(
  '/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  createFundingSource
);

router.put(
  '/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  updateFundingSource
);

export default router;
