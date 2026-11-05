import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead); // Must be placed before /:id/read to avoid parameter collision
router.patch('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

export default router;
