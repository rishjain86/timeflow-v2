import { Router } from 'express';
import { allocateProjectBudget } from '../controllers/project-budget.controller';
import { allocateBudgetSchema } from '../schemas/project-budget.schema';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.use(requireAuth);

router.post('/allocate', validate(allocateBudgetSchema), allocateProjectBudget);

export default router;
