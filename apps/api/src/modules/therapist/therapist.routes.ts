import { Router } from 'express';
import * as therapistController from './therapist.controller';
import { validateRequest } from '../../middleware/validation.middleware';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';
import {
  createTherapistSchema,
  updateTherapistSchema,
  getTherapistsQuerySchema,
  therapistIdParamSchema,
} from './schemas/therapist.schema';

const router = Router();

// Apply authentication middleware to all therapist routes
router.use(authenticate);

// Create a new therapist profile (Only Admins and Managers)
router.post(
  '/',
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validateRequest(createTherapistSchema),
  therapistController.createTherapistProfile
);

// Get all therapist profiles with pagination and filters
router.get(
  '/',
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.USER]),
  validateRequest(getTherapistsQuerySchema),
  therapistController.getTherapistProfiles
);

// Get a specific therapist profile by ID
router.get(
  '/:id',
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.USER]),
  validateRequest(therapistIdParamSchema),
  therapistController.getTherapistProfileById
);

// Update a therapist profile (Only Admins and Managers)
router.put(
  '/:id',
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validateRequest(updateTherapistSchema),
  therapistController.updateTherapistProfile
);

export default router;
