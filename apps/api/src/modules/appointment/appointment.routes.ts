import { Router } from 'express';
import * as appointmentController from './appointment.controller';
import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  getAppointmentsQuerySchema,
  appointmentIdParamSchema,
  attendanceSchema, 
  cnrSchema,        
  cnrApprovalSchema,       
} from './schemas/appointment.schema';

const router = Router();

// Apply authentication middleware to all appointment routes
router.use(authenticate);

// Create a new appointment
router.post(
  '/',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(createAppointmentSchema),
  appointmentController.createAppointment
);

// Get all appointments with pagination and filters
router.get(
  '/',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(getAppointmentsQuerySchema),
  appointmentController.getAppointments
);

// ==========================================
// SPRINT 4: Session Card & Digital Forms Endpoints
// ==========================================

// Get the complete clinical and billing verification summary for a session
router.get(
  '/:id/session-card',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(appointmentIdParamSchema),
  appointmentController.getSessionCard
);

// Submit Attendance for a session
router.post(
  '/:id/attendance',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(attendanceSchema),
  appointmentController.submitAttendance
);

// Submit Clinical Notes (CNR) for a session
router.post(
  '/:id/cnr',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(cnrSchema),
  appointmentController.submitCNR
);

// Read Clinical Notes (own caseload for therapists; every access is audited)
router.get(
  '/:id/cnr',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(appointmentIdParamSchema),
  appointmentController.getCNR
);

// Approve Clinical Notes (Manager/Admin only)
router.patch(
  '/:id/cnr/approve',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validate(cnrApprovalSchema),
  appointmentController.approveCNR
);

// ==========================================
// Base CRUD Endpoints
// ==========================================

// Get a specific appointment by ID
router.get(
  '/:id',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(appointmentIdParamSchema),
  appointmentController.getAppointmentById
);

// Update an appointment (e.g., changing status, rescheduling)
router.patch(
  '/:id',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.THERAPIST]),
  validate(updateAppointmentSchema),
  appointmentController.updateAppointment
);

export default router;
