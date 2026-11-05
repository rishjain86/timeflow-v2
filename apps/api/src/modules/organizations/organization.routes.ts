import { Router } from 'express';
import { 
  getOrganization, 
  getOrganizationById, 
  updateOrganization, 
  createOrganization,
  getMyOrganizations,
  switchOrganization
} from './organization.controller';
import { requireAuth } from '../../middleware/auth.middleware';

const router = Router();
router.use(requireAuth);

router.get('/my-orgs', getMyOrganizations); // Ye sabse upar rakhna zaroori hai
router.post('/switch', switchOrganization);
router.get('/', getOrganization);
router.get('/:id', getOrganizationById);
router.patch('/', updateOrganization);
router.patch('/:id', updateOrganization);
router.post('/', createOrganization);

export default router;
