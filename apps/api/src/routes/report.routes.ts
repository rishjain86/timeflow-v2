import { Router } from 'express';
import { z } from 'zod';
import { 
  getProjectReport, 
  getUserReport, 
  getAdvancedTimeReport, 
  getBudgetReport,
  getOverageReport,
  getClinicalComplianceReport
} from '../controllers/report.controller';
import { getReportQuerySchema } from '../schemas/report.schema';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const projectIdParamSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID format'),
  }),
});

const userIdParamSchema = z.object({
  params: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

// =========================================================================
// 🟢 NEWLY ADDED VALIDATION SCHEMAS FOR REPORTS
// =========================================================================

const advancedTimeReportQuerySchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    projectId: z.string().uuid('Invalid project ID format').optional(),
    userId: z.string().uuid('Invalid user ID format').optional(),
  }),
});

const budgetReportQuerySchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid project ID format').optional(),
  }),
});

const overageReportQuerySchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid project ID format').optional(),
    userId: z.string().uuid('Invalid user ID format').optional(),
    status: z.string().optional(),
  }),
});

const complianceReportQuerySchema = z.object({
  query: z.object({
    projectId: z.string().uuid('Invalid project ID format').optional(),
    userId: z.string().uuid('Invalid user ID format').optional(),
    complianceStatus: z.enum(['COMPLIANT', 'NON_COMPLIANT']).optional(),
  }),
});

// Protect all report routes
router.use(requireAuth);

// =========================================================================
// EXISTING ROUTES (Intact)
// =========================================================================

router.get(
  '/project/:projectId',
  validate(projectIdParamSchema.merge(getReportQuerySchema)),
  getProjectReport
);

router.get(
  '/user/:userId',
  validate(userIdParamSchema.merge(getReportQuerySchema)),
  getUserReport
);

// =========================================================================
// 🟢 NEWLY ADDED ROUTES FOR ADVANCED REPORTS
// =========================================================================

router.get(
  '/time-advanced',
  validate(advancedTimeReportQuerySchema),
  getAdvancedTimeReport
);

router.get(
  '/budget-status',
  validate(budgetReportQuerySchema),
  getBudgetReport
);

router.get(
  '/overage-requests',
  validate(overageReportQuerySchema),
  getOverageReport
);

router.get(
  '/clinical-compliance',
  validate(complianceReportQuerySchema),
  getClinicalComplianceReport
);

export default router;
