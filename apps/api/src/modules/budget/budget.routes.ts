import { Router } from 'express';
import {
  createBudget,
  updateBudget,
  getBudgets,
  getBudgetById,
} from './budget.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware'; // Adjust path if needed

const router = Router();

// Require authentication for all budget routes
router.use(requireAuth);

// GET routes - Accessible to all authenticated users
router.get('/', getBudgets);
router.get('/:id', getBudgetById);

// Mutations - Strictly restricted to SUPER_ADMIN, ADMIN, and MANAGER
router.post(
  '/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  createBudget
);

router.put(
  '/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  updateBudget
);

export default router;
