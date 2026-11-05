import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Protect all dashboard routes
router.use(requireAuth);

router.get('/', getDashboardStats);

export default router;
