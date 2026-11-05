import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Role, Prisma, TokenType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ConflictError, UnauthorizedError, NotFoundError, BadRequestError } from '../utils/errors';
import { RegisterInput, LoginInput, InviteUserInput, AcceptInviteInput, ManageUserInput } from '../schemas/auth.schema';

// 🟢 NEW: Import Email Services for OTP & Forgot Password
import { sendOTPVerificationEmail, sendPasswordResetEmail } from '../services/email.service';

// Helper for Manager/Admin checks
const hasAdminOrManagerAccess = (role: Role) => role === Role.SUPER_ADMIN || role === Role.ADMIN || role === Role.MANAGER;

const generateToken = (userId: string, role: Role, organizationId: string) => {
  return jwt.sign(
    { id: userId, role, organizationId },
    env.JWT_SECRET,
    {
      expiresIn: '1d',
      algorithm: 'HS256',
      issuer: 'timeflow-api',
      audience: 'timeflow-web'
    }
  );
};

// Helper: Generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const register = async (
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { firstName, lastName, email, password, organizationName, phone, industryType } = req.body;

    const hashedPassword = await bcrypt.hash(password, 12);
    
    // 🟢 Generate OTP & Expiry (15 mins)
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const user = await prisma.$transaction(async (tx) => {
      
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      const newOrg = await tx.organization.create({
        data: { 
          name: organizationName,
          industryType: industryType,
          plan: 'FREE_TRIAL',
          subscriptionStatus: 'TRIALING',
          trialEndsAt: trialEndDate
        },
      });

      const newUser = await tx.user.create({
        data: {
          firstName,
          lastName, 
          email,
          phone, 
          passwordHash: hashedPassword,
          role: Role.SUPER_ADMIN, 
          organizationId: newOrg.id,
          isActive: true,
          // 🟢 Setup Verification Fields
          isVerified: false,
          verificationCode: otp,
          verificationCodeExpiry: otpExpiry
        },
        include: {
          organization: true,
        },
      });

      return newUser;
    });

    // 🟢 Send OTP Email asynchronously (don't block the request)
    sendOTPVerificationEmail(user.email, user.firstName, otp).catch(err => console.error(err));

    const token = generateToken(user.id, user.role, user.organizationId);

    await prisma.session.create({
      data: {
        sessionToken: token,
        userId: user.id,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), 
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      }
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email for the OTP verification code.',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes('email')) {
          return next(new ConflictError('User with this email already exists'));
        }
        return next(new ConflictError('A unique constraint failed'));
      }
    }
    next(error);
  }
};

export const login = async (
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { organization: true } 
    });
    
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // 🟢 QUICK FIX: Commenting this out temporarily until Frontend OTP UI is built
    /*
    if (!user.isVerified) {
      throw new UnauthorizedError('Please verify your email to log in. Check your inbox for the OTP.');
    }
    */

    if (user.isBanned) {
      throw new UnauthorizedError('Your account has been banned by the Administrator.');
    }
    if (!user.isActive) {
      throw new UnauthorizedError('Your account has been deactivated. Please check your email for an invitation.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = generateToken(user.id, user.role, user.organizationId);

    await prisma.session.create({
      data: {
        sessionToken: token,
        userId: user.id,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 Day
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
      }
    });

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 🟢 NEW: OTP VERIFICATION METHODS
// ==========================================

export const verifyOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundError('User not found.');
    if (user.isVerified) throw new BadRequestError('Email is already verified.');

    if (!user.verificationCode || user.verificationCode !== otp) {
      throw new BadRequestError('Invalid OTP code.');
    }

    if (!user.verificationCodeExpiry || user.verificationCodeExpiry < new Date()) {
      throw new BadRequestError('OTP has expired. Please request a new one.');
    }

    // Mark as verified and clear OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        emailVerified: new Date(),
        verificationCode: null,
        verificationCodeExpiry: null,
      }
    });

    res.status(200).json({ success: true, message: 'Email verified successfully!' });
  } catch (error) {
    next(error);
  }
};

export const resendOTP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundError('User not found.');
    if (user.isVerified) throw new BadRequestError('Email is already verified.');

    const newOtp = generateOTP();
    const newExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: newOtp, verificationCodeExpiry: newExpiry }
    });

    sendOTPVerificationEmail(user.email, user.firstName, newOtp).catch(err => console.error(err));

    res.status(200).json({ success: true, message: 'A new OTP has been sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 🟢 NEW: FORGOT & RESET PASSWORD
// ==========================================

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Always return success to prevent email enumeration attacks
    if (!user) {
      return res.status(200).json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: resetToken, resetPasswordTokenExpiry: resetExpiry }
    });

    sendPasswordResetEmail(user.email, user.firstName, resetToken).catch(err => console.error(err));

    res.status(200).json({ success: true, message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordTokenExpiry: { gt: new Date() } // Ensure token is not expired
      }
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
      }
    });

    // Optionally terminate all existing sessions so they have to login with new password
    await prisma.session.deleteMany({ where: { userId: user.id } });

    res.status(200).json({ success: true, message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      await prisma.session.deleteMany({
        where: { sessionToken: token }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = res.locals.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ENTERPRISE INVITE & BAN SYSTEM
// ==========================================

export const inviteUser = async (req: Request<unknown, unknown, InviteUserInput>, res: Response, next: NextFunction) => {
  try {
    const { email, firstName, lastName, role } = req.body;
    const { organizationId, role: requesterRole } = res.locals.user;

    if (!hasAdminOrManagerAccess(requesterRole)) {
      throw new UnauthorizedError('Only Administrators or Managers can invite team members.');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('A user with this email already exists in the system.');
    }

    const inviteToken = crypto.randomBytes(32).toString('hex');

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          role: role as Role,
          organizationId,
          passwordHash: 'INVITED_PENDING_SETUP', 
          phone: 'PENDING',
          isActive: false,
          isVerified: false,
        }
      });

      await tx.verificationToken.create({
        data: {
          identifier: email,
          token: inviteToken,
          type: TokenType.INVITATION,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Valid for 7 days
        }
      });

      return user;
    });

    res.status(201).json({
      success: true,
      message: 'User invited successfully. They will receive an email to join the organization.',
      data: { 
        userId: newUser.id,
        inviteToken 
      }
    });
  } catch (error) {
    next(error);
  }
};

export const acceptInvite = async (req: Request<unknown, unknown, AcceptInviteInput>, res: Response, next: NextFunction) => {
  try {
    const { token, password, phone } = req.body;

    const verificationRecord = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!verificationRecord || verificationRecord.type !== TokenType.INVITATION) {
      throw new BadRequestError('Invalid or expired invitation token.');
    }

    if (verificationRecord.expires < new Date()) {
      throw new BadRequestError('Invitation token has expired. Please ask your administrator to resend the invite.');
    }

    const userToUpdate = await prisma.user.findUnique({
      where: { email: verificationRecord.identifier }
    });

    if (!userToUpdate) {
      throw new NotFoundError('User associated with this invite no longer exists.');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userToUpdate.id },
        data: {
          passwordHash: hashedPassword,
          phone, 
          isActive: true, 
          isVerified: true, // Auto verify email since they accepted an invite
          emailVerified: new Date()
        }
      }),
      prisma.verificationToken.delete({
        where: { id: verificationRecord.id }
      })
    ]);

    res.status(200).json({
      success: true,
      message: 'Account setup successfully. You can now login.'
    });
  } catch (error) {
    next(error);
  }
};

export const manageUserStatus = async (req: Request<{ id: string }, unknown, ManageUserInput>, res: Response, next: NextFunction) => {
  try {
    const targetUserId = req.params.id;
    const { isBanned, isActive, role, hourlyRate } = req.body;
    const { organizationId, role: requesterRole } = res.locals.user;

    if (!hasAdminOrManagerAccess(requesterRole)) {
      throw new UnauthorizedError('Only Administrators or Managers can modify user access.');
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, organizationId }
    });

    if (!targetUser) {
      throw new NotFoundError('User not found in your organization.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBanned: isBanned !== undefined ? Boolean(isBanned) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        role: role !== undefined ? (role as Role) : undefined,
        hourlyRate: hourlyRate !== undefined ? Number(hourlyRate) : undefined,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        isBanned: true,
        isActive: true,
        hourlyRate: true
      }
    });

    if (updatedUser.isBanned || !updatedUser.isActive) {
      await prisma.session.deleteMany({
        where: { userId: targetUser.id }
      });
    }

    res.status(200).json({
      success: true,
      message: 'User access settings updated successfully.',
      data: { user: updatedUser }
    });
  } catch (error) {
    next(error);
  }
};
