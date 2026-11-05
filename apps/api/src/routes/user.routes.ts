import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';

import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  uploadAvatar,
  updatePassword,
  getUserActivity, // 🟢 Controller automatically imported
} from '../controllers/user.controller';
import {
  createUserSchema,
  updateUserSchema,
  getUsersQuerySchema,
} from '../schemas/user.schema';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ID Validation for parameterized routes
const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

// Protect all user routes
router.use(requireAuth);

router.post(
  '/',
  validate(createUserSchema),
  createUser
);

router.get(
  '/',
  validate(getUsersQuerySchema),
  getUsers
);

// 🟢 EXTREMELY IMPORTANT: These non-ID routes must come BEFORE the `/:id` routes
router.post(
  '/avatar',
  upload.single('file'), 
  uploadAvatar
);

router.patch(
  '/update-password',
  updatePassword
);

// ======================================================================
// 🟢 Parameterized routes (Order is extremely important!)
// ======================================================================

// 🟢 FIX: Activity route MUST be above standard /:id route!
// 🟢 FIX: Removed validate(idParamSchema) to allow ?range to pass safely
router.get(
  '/:id/activity',
  getUserActivity
);

router.get(
  '/:id',
  validate(idParamSchema),
  getUserById
);

router.patch(
  '/:id',
  validate(updateUserSchema),
  updateUser
);

router.delete(
  '/:id',
  validate(idParamSchema),
  deleteUser
);

export default router;
