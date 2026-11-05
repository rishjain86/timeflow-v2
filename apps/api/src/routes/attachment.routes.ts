import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import {
  uploadAttachment,
  getAttachments,
  deleteAttachment
} from '../controllers/attachment.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Basic local storage setup (Replace with multer-s3 or similar for production)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

router.use(requireAuth);

router.post('/', upload.single('file'), uploadAttachment);
router.get('/', getAttachments);
router.delete('/:id', deleteAttachment);

export default router;
