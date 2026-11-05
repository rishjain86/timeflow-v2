import { Router } from 'express';
import {
  createExpense,
  updateExpense,
  getExpenses,
  getExpenseById,
  deleteExpense,
} from './expense.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware'; // Adjust path if needed

const router = Router();

// Require authentication for all expense routes
router.use(requireAuth);

// GET routes - Accessible to authenticated users 
// (Organization scoping is already handled in the service layer)
router.get('/', getExpenses);
router.get('/:id', getExpenseById);

// Mutations - Restricted via RBAC to prevent unauthorized expense logging
router.post(
  '/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  createExpense
);

router.put(
  '/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  updateExpense
);

router.delete(
  '/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  deleteExpense
);

export default router;
