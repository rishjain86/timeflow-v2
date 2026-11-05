import { Router } from 'express';
import {
  createAuthorization,
  updateAuthorization,
  getAuthorizations,
  getAuthorizationById,
} from './authorization.controller';

// Assuming you have these middlewares in a common folder. Adjust the import path if needed.
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// 1. Require authentication for all authorization routes
router.use(requireAuth);

// 2. GET routes - Available to all authenticated users (Therapists need to see active auths)
router.get('/', getAuthorizations);
router.get('/:id', getAuthorizationById);

// 3. Mutation routes - Strictly restricted to ADMIN and MANAGER roles
router.post(
  '/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  createAuthorization
);

router.put(
  '/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  updateAuthorization
);

export default router;
