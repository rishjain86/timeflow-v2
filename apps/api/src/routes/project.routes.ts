import { Router } from 'express';
import { z } from 'zod';
import {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  updateProjectStatus,
  toggleArchiveProject,
  updateProjectTaskRates,
  importProjects,
  requestExtraBudget,
  getAllBudgetRequests,
  approveBudgetRequest,
  rejectBudgetRequest,
  duplicateProject // 🟢 Imported Duplicate Project
} from '../controllers/project.controller';
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectsQuerySchema,
} from '../schemas/project.schema';
import { validate } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/auth'; 

const router = Router();

// Zod validation strictly for ID
const idParamSchema = z.object({
  params: z.object({
    id: z.string({ required_error: 'Project ID is required' }),
  }),
});

router.use(requireAuth);

router.post(
  '/import',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), 
  importProjects
);

router.post(
  '/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  validate(createProjectSchema),
  createProject
);

// 🟢 NEW DUPLICATE ROUTE
router.post(
  '/:id/duplicate',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  duplicateProject
);

router.get(
  '/',
  validate(getProjectsQuerySchema),
  getProjects
);

// ======================================================================
// 🟢 BUDGET APPROVAL ROUTES
// ======================================================================
router.get(
  '/budget-requests/all',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  getAllBudgetRequests
);

// 🟢 FIX: Removed validate(idParamSchema) to ensure req.body passes safely
router.patch(
  '/budget-requests/:id/approve',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  approveBudgetRequest
);

// 🟢 FIX: Removed validate(idParamSchema) to ensure rejectionReason passes safely
router.patch(
  '/budget-requests/:id/reject',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  rejectBudgetRequest
);

// ======================================================================

// 🟢 FIX: Removed validate(idParamSchema) so hoursRequested & reason reach backend
router.post(
  '/:id/request-budget',
  requestExtraBudget
);

router.get(
  '/:id',
  validate(idParamSchema),
  getProjectById
);

router.patch(
  '/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  validate(updateProjectSchema),
  updateProject
);

// 🟢 FIX: Removed validate(idParamSchema) to ensure status passes safely
router.patch(
  '/:id/status',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  updateProjectStatus
);

// 🟢 FIX: Removed validate(idParamSchema) to ensure archive flag passes safely
router.patch(
  '/:id/archive',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  toggleArchiveProject
);

router.put(
  '/:id/rates',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  updateProjectTaskRates
);

router.delete(
  '/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  validate(idParamSchema),
  deleteProject
);

export default router;
