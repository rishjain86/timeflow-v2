import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getSettings);
router.put('/', requireRole(['SUPER_ADMIN', 'ADMIN']), updateSettings);

export default router;
