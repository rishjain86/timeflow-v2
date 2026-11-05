import { Router } from 'express';
import { generateInvoicesController } from './generate-invoice.controller';
import { listInvoicesController } from './list-invoices.controller';
import { getInvoiceController } from './get-invoice.controller';
import { updateInvoiceStatusController } from './update-invoice-status.controller';
import { recordPaymentController } from './record-payment.controller';

import { validate } from '../../middleware/validation.middleware';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@prisma/client';

// 🟢 FIX: Added '/schemas' to the paths because the files are inside the schemas folder
import { generateInvoicesSchema } from './schemas/generate-invoice.schema';
import { listInvoicesSchema } from './schemas/list-invoices.schema';
import { getInvoiceSchema } from './schemas/get-invoice.schema';
import { updateInvoiceStatusSchema } from './schemas/update-invoice-status.schema';
import { recordPaymentSchema } from './schemas/record-payment.schema';

const router = Router();

// Apply authentication middleware to all billing routes
router.use(authenticate);

// Endpoint: POST /api/billing/generate-invoices
router.post(
  '/generate-invoices',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]), 
  validate(generateInvoicesSchema),
  generateInvoicesController
);

// Endpoint: GET /api/billing/invoices
router.get(
  '/invoices',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]), 
  validate(listInvoicesSchema),
  listInvoicesController
);

// Endpoint: GET /api/billing/invoices/:id
router.get(
  '/invoices/:id',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]), 
  validate(getInvoiceSchema),
  getInvoiceController
);

// Endpoint: PATCH /api/billing/invoices/:id/status
router.patch(
  '/invoices/:id/status',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]), 
  validate(updateInvoiceStatusSchema),
  updateInvoiceStatusController
);

// Endpoint: POST /api/billing/invoices/:id/payments
router.post(
  '/invoices/:id/payments',
  requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]),
  validate(recordPaymentSchema),
  recordPaymentController
);

export default router;
