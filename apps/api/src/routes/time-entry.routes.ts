import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';

import {
  createTimeEntry,
  getTimeEntries,
  getTimeEntryById,
  updateTimeEntry,
  deleteTimeEntry,
  reviewTimeEntry,
  moveTimeEntry,
  createBudgetRequest, 
  getActiveTimer,      
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer
} from '../controllers/time-entry.controller';

import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  getTimeEntriesQuerySchema,
  requestBudgetSchema
} from '../schemas/time-entry.schema';

import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// 🟢 Diagnostic Log - Render logs me check karna jab server restart ho!
console.log("🚀 Time Entry Router & Timer Routes Loaded Successfully!");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid time entry ID format') }),
});

const moveRouteSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid time entry ID format') }),
  body: z.any().optional(),
});

router.use(requireAuth);

router.use((req: Request, res: Response, next: NextFunction) => {
    if (req.body) delete req.body.taskBudgetId;
    next();
});

// =====================================================================
// 🟢 TIMER ROUTES (MUST BE AT THE TOP TO PREVENT 404 WILDCARD CONFLICTS)
// =====================================================================
router.get('/timer/active', getActiveTimer);
router.post('/timer/start', startTimer);
router.post('/timer/:id/pause', pauseTimer);
router.post('/timer/:id/resume', resumeTimer);
router.post('/timer/:id/stop', stopTimer);

// =====================================================================
// 🔵 STANDARD TIME ENTRY ROUTES
// =====================================================================
router.post('/', upload.fields([{ name: 'cnrDocument', maxCount: 1 }, { name: 'attendanceDocument', maxCount: 1 }]), validate(createTimeEntrySchema), createTimeEntry);

router.get('/', (req: Request, res: Response, next: NextFunction) => {
    if (req.query.fetchLogs === 'true') return getTimeEntries(req, res, next);
    next();
}, validate(getTimeEntriesQuerySchema), getTimeEntries);

router.patch('/review/:id', reviewTimeEntry);

router.post('/budget-request', validate(requestBudgetSchema), createBudgetRequest);

router.post(
  '/:id/move', 
  upload.fields([{ name: 'cnrDocument', maxCount: 1 }, { name: 'attendanceDocument', maxCount: 1 }]), 
  validate(moveRouteSchema), 
  moveTimeEntry
);

// 🔴 WILD CARD PARAMS MUST REMAIN AT THE BOTTOM
router.get('/:id', validate(idParamSchema), getTimeEntryById);
router.patch('/:id', validate(updateTimeEntrySchema), updateTimeEntry);
router.delete('/:id', validate(idParamSchema), deleteTimeEntry);

export default router;
