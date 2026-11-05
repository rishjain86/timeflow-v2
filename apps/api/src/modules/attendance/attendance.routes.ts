import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import * as attendanceController from './attendance.controller';
import { createAttendanceSchema, updateAttendanceSchema } from './schemas/attendance.schema';
import { Role } from '@prisma/client';

const router = Router();

// Require authentication for all attendance routes
router.use(authenticate);

// Create attendance record
router.post(
  '/',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(createAttendanceSchema),
  attendanceController.createAttendance
);

// Get specific attendance record
router.get(
  '/:id',
  attendanceController.getAttendance
);

// Get attendance by appointment ID
router.get(
  '/appointment/:appointmentId',
  attendanceController.getAttendanceByAppointment
);

// Update attendance record
router.patch(
  '/:id',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(updateAttendanceSchema),
  attendanceController.updateAttendance
);

// Verify compliance completeness
router.get(
  '/appointment/:appointmentId/verify',
  attendanceController.verifyAttendance
);

export default router;
