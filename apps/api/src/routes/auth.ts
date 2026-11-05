import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate'; 
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  validateRequest(registerSchema),
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  validateRequest(loginSchema),
  authController.login
);

// ==========================================
// 🟢 NEW: OTP & Password Reset Routes
// ==========================================
router.post('/verify-otp', authController.verifyOTP);
router.post('/resend-otp', authController.resendOTP);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// ==========================================
// Existing Protected Routes
// ==========================================

// POST /api/auth/logout (Protected Route)
router.post(
  '/logout',
  authenticate,
  authController.logout
);

// GET /api/auth/me (Protected Route)
router.get(
  '/me',
  authenticate,
  authController.getCurrentUser
);

// 🟢 NEW: Invite System Routes (Jo humne controller me banaye the)
router.post('/invite', authenticate, authController.inviteUser);
router.post('/accept-invite', authController.acceptInvite);
router.patch('/manage-status/:id', authenticate, authController.manageUserStatus);

export default router;
