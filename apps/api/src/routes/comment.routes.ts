import { Router } from 'express';
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All comment routes require authentication
router.use(requireAuth);

router.post('/', createComment);
router.get('/', getComments);
router.put('/:id', updateComment);
router.delete('/:id', deleteComment);

export default router;
