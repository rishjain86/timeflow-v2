import { Router } from 'express';
import { z } from 'zod';
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
} from '../controllers/client.controller';
import { createClientSchema, updateClientSchema } from '../schemas/client.schema';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid client ID format'),
  }),
});

// Protect all client routes
router.use(requireAuth);

router.post(
  '/',
  validate(createClientSchema),
  createClient
);

router.get(
  '/',
  getClients
);

router.get(
  '/:id',
  validate(idParamSchema),
  getClientById
);

router.patch(
  '/:id',
  validate(updateClientSchema),
  updateClient
);

router.delete(
  '/:id',
  validate(idParamSchema),
  deleteClient
);

export default router;
