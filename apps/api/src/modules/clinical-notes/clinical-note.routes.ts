import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import * as clinicalNoteController from './clinical-note.controller';
import { createClinicalNoteSchema, updateClinicalNoteSchema } from './schemas/clinical-note.schema';
import { Role } from '@prisma/client';

const router = Router();

// Require authentication for all clinical note routes
router.use(authenticate);

// Create clinical note review record
router.post(
  '/',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(createClinicalNoteSchema),
  clinicalNoteController.createClinicalNote
);

// Get specific clinical note review record
router.get(
  '/:id',
  clinicalNoteController.getClinicalNote
);

// Get clinical note by appointment ID
router.get(
  '/appointment/:appointmentId',
  clinicalNoteController.getClinicalNoteByAppointment
);

// Update clinical note review record
router.patch(
  '/:id',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(updateClinicalNoteSchema),
  clinicalNoteController.updateClinicalNote
);

// Verify compliance completeness
router.get(
  '/appointment/:appointmentId/verify',
  clinicalNoteController.verifyClinicalNote
);

export default router;
