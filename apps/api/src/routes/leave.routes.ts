import { Router } from 'express';
import {
  createLeave,
  getLeaves,
  updateLeave,
  deleteLeave,
  updateLeaveStatus
} from '../controllers/leave.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', createLeave);
router.get('/', getLeaves);
router.put('/:id', updateLeave);
router.delete('/:id', deleteLeave);

// Manager/Admin routes for approval workflow
router.patch(
  '/:id/status', 
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']), 
  updateLeaveStatus
);

export default router;
