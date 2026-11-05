import { Router } from 'express';
import {
  createOrganization,
  getOrganization,
  updateOrganization,
} from '../controllers/organization.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.post('/', createOrganization);
router.get('/', getOrganization);
router.patch('/', updateOrganization);

export default router;
