import { Router } from 'express';
import {
  createInvoice,
  updateInvoice,
  getInvoices,
  getInvoiceById,
  deleteInvoice,
} from './invoice.controller';
import { requireAuth, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// Require authentication for all invoice routes
router.use(requireAuth);

// GET routes - Accessible to authenticated users 
// (Organization scoping handled in the service layer)
router.get('/', getInvoices);
router.get('/:id', getInvoiceById);

// Mutations - Restricted via RBAC (Billing requires strict permissions)
router.post(
  '/',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  createInvoice
);

router.put(
  '/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']),
  updateInvoice
);

router.delete(
  '/:id',
  requireRole(['SUPER_ADMIN', 'ADMIN']), // Often, delete permissions for invoices are restricted to Admins only
  deleteInvoice
);

export default router;
