import { Router } from 'express';
import * as serviceCodeController from './service-code.controller';
import { validateRequest } from '../../middleware/validation.middleware';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';
import {
  createServiceCodeSchema,
  updateServiceCodeSchema,
  getServiceCodesQuerySchema,
  serviceCodeIdParamSchema,
} from './schemas/service-code.schema';

const router = Router();

// Secure all service code routes
router.use(authenticate);

// Create a new service code (Only Admins and Managers)
router.post(
  '/',
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validateRequest(createServiceCodeSchema),
  serviceCodeController.createServiceCode
);

// Get all service codes (Users can view codes for billing/time entry purposes)
router.get(
  '/',
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.USER]),
  validateRequest(getServiceCodesQuerySchema),
  serviceCodeController.getServiceCodes
);

// Get a specific service code by ID
router.get(
  '/:id',
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER, Role.USER]),
  validateRequest(serviceCodeIdParamSchema),
  serviceCodeController.getServiceCodeById
);

// Update a service code (Only Admins and Managers)
router.put(
  '/:id',
  authorize([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validateRequest(updateServiceCodeSchema),
  serviceCodeController.updateServiceCode
);

export default router;
