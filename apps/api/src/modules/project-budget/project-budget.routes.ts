import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import * as projectBudgetController from './project-budget.controller';
import { createProjectBudgetSchema, updateProjectBudgetSchema } from './schemas/project-budget.schema';
import { allocateMemberBudgetSchema, updateMemberBudgetSchema } from './schemas/project-member-budget.schema';
import { allocateTaskBudgetSchema, updateTaskBudgetSchema } from './schemas/project-task-budget.schema';
import { Role } from '@prisma/client';

const router = Router();

// Require authentication for all budget routes
router.use(authenticate);

// ==========================================
// Project Budget & Allocation Routes
// ==========================================

// Naya endpoint jo Frontend modal ke liye required hai
router.post(
  '/allocate',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  projectBudgetController.allocateProjectBudget
);

router.post(
  '/',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validate(createProjectBudgetSchema),
  projectBudgetController.createProjectBudget
);

router.get(
  '/project/:projectId',
  projectBudgetController.getProjectBudget
);

router.patch(
  '/:id',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validate(updateProjectBudgetSchema),
  projectBudgetController.updateProjectBudget
);

// ==========================================
// Member Budget Allocation Routes
// ==========================================

router.post(
  '/:budgetId/members',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validate(allocateMemberBudgetSchema),
  projectBudgetController.allocateMemberBudget
);

router.patch(
  '/members/:memberBudgetId',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validate(updateMemberBudgetSchema),
  projectBudgetController.updateMemberBudget
);

// ==========================================
// Task Budget Allocation Routes
// ==========================================

router.post(
  '/members/:memberBudgetId/tasks',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validate(allocateTaskBudgetSchema),
  projectBudgetController.allocateTaskBudget
);

router.patch(
  '/tasks/:taskBudgetId',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validate(updateTaskBudgetSchema),
  projectBudgetController.updateTaskBudget
);

export default router;
