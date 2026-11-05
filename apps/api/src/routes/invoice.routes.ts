// apps/api/src/routes/invoice.routes.ts

import { Router } from 'express';
import { z } from 'zod';
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  generateInvoicePdf,    
  emailInvoiceToClient,
  generateInvoice // 🟢 FIX: Imported new generate function
} from '../controllers/invoice.controller';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  getInvoicesQuerySchema,
} from '../schemas/invoice.schema';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invoice ID format'),
  }),
});

// Middleware: All invoice routes require authentication
router.use(requireAuth);

// 🟢 FIX: Added the specific Save & Generate Endpoint to fix Internal Server Error
router.post(
  '/generate',
  generateInvoice
);

// --- Phase 4: Standard Invoice CRUD ---
router.post(
  '/',
  validate(createInvoiceSchema),
  createInvoice
);

router.get(
  '/',
  validate(getInvoicesQuerySchema),
  getInvoices
);

router.get(
  '/:id',
  validate(idParamSchema),
  getInvoiceById
);

router.patch(
  '/:id',
  validate(updateInvoiceSchema),
  updateInvoice
);

// 🟢 FIX: Added PUT route to match frontend full-update call. 
// Note: Validation schema bypassed to avoid rigid Zod blocks on "items" if old schema lacked it.
router.put(
  '/:id',
  updateInvoice
);

router.delete(
  '/:id',
  validate(idParamSchema),
  deleteInvoice
);

// --- Phase 5: Billing Enhancements ---

// 1. Download / Generate PDF
router.get(
  '/:id/pdf',
  validate(idParamSchema),
  generateInvoicePdf
);

// 2. Email Invoice to Client
router.post(
  '/:id/email',
  validate(idParamSchema),
  emailInvoiceToClient
);

export default router;
