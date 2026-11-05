import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import {
  createTimeEntry,
  getTimeEntries,
  getTimeEntryById,
  updateTimeEntry,
  deleteTimeEntry,
  reviewTimeEntry,
  moveTimeEntry,
} from './time-entry.controller';

// 🟢 NEW: Imported timer functions from your legacy controller where they actually exist
import {
  getActiveTimer,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer
} from '../../controllers/time-entry.controller';

import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  getTimeEntriesQuerySchema,
} from './schemas/time-entry.schema';
import { authenticate } from '../../middleware/auth.middleware'; // Ensure correct auth middleware path

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
});

const idParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid time entry ID format'),
  }),
});

// 🟢 BULLETPROOF FIX: Dedicated API route to serve files directly from disk
router.get('/file/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  return res.status(404).json({ success: false, message: 'File not found on server disk.' });
});

// Require authentication for all time entry operations
router.use(authenticate);

// 🟢 MASTER FIX 1: Strip frontend-only fields from the body so Zod doesn't throw 400 Bad Request
router.use((req: Request, res: Response, next: NextFunction) => {
    if (req.body && req.body.taskBudgetId) {
        delete req.body.taskBudgetId;
    }
    next();
});

// =====================================================================
// 🟢 TIMER ROUTES (FINALLY MOUNTED IN THE CORRECT ACTIVE ROUTER!)
// =====================================================================
router.get('/timer/active', getActiveTimer);
router.post('/timer/start', startTimer);
router.post('/timer/:id/pause', pauseTimer);
router.post('/timer/:id/resume', resumeTimer);
router.post('/timer/:id/stop', stopTimer);

// GET routes
router.get('/', (req: Request, res: Response, next: NextFunction) => {
    if (req.query.fetchLogs === 'true') {
        return getTimeEntries(req, res, next);
    }
    next();
}, getTimeEntries);

router.get('/:id', getTimeEntryById);

// 🟢 CRITICAL: /review/:id MUST be placed before /:id to prevent route shadowing
router.patch('/review/:id', reviewTimeEntry);

// 🟢 NEW FEATURE ROUTE: Moving Overage (Independent Route)
// 🟢 FIX: Added multer upload fields to handle FormData and file uploads during move
router.post(
  '/:id/move', 
  upload.fields([
    { name: 'cnrDocument', maxCount: 1 },
    { name: 'attendanceDocument', maxCount: 1 }
  ]),
  moveTimeEntry
);

// Mutations (Allowed for Admin, Manager, and Assigned Employees/Therapists)
router.post(
  '/',
  upload.fields([
    { name: 'cnrDocument', maxCount: 1 },
    { name: 'attendanceDocument', maxCount: 1 }
  ]),
  createTimeEntry
);

router.patch('/:id', updateTimeEntry);
router.delete('/:id', deleteTimeEntry);

export default router;
