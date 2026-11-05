import { Router } from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/audit.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN', 'ADMIN']));

router.get('/', getAuditLogs);
router.get('/:id', getAuditLogById);

export default router;
