import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from '../controllers/team.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// GET routes can be accessible to all authenticated users so they can see company structure
router.get('/', getTeams);
router.get('/:id', getTeamById);

// Admin / Super Admin restriction for mutations
router.post('/', requireRole(['SUPER_ADMIN', 'ADMIN']), createTeam);
router.put('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), updateTeam);
router.delete('/:id', requireRole(['SUPER_ADMIN', 'ADMIN']), deleteTeam);

// Manage Team Members (Admins only)
router.post('/:id/members', requireRole(['SUPER_ADMIN', 'ADMIN']), addTeamMember);
router.delete('/:id/members/:userId', requireRole(['SUPER_ADMIN', 'ADMIN']), removeTeamMember);

export default router;
