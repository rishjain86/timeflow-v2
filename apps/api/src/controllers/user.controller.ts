import { Request, Response, NextFunction } from 'express';
import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { 
  NotFoundError, 
  UnauthorizedError, 
  ConflictError, 
  BadRequestError 
} from '../utils/errors';
import { CreateUserInput, UpdateUserInput } from '../schemas/user.schema';

// --- Strict SaaS Role Hierarchy ---
const RoleLevel: Record<string, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  MANAGER: 2,
  THERAPIST: 1,
  CONSULTANT: 1,
  EMPLOYEE: 1,
  BILLING: 1,
  FRONT_DESK: 1,
  USER: 1,
};

const canAssignRole = (currentRole: Role, targetRole: Role): boolean => {
  if (currentRole === Role.SUPER_ADMIN || currentRole === Role.ADMIN) return true;
  
  if (currentRole === Role.MANAGER) {
    const allowedForManager: Role[] = [Role.USER, Role.THERAPIST, Role.CONSULTANT, Role.EMPLOYEE, Role.BILLING, Role.FRONT_DESK];
    return allowedForManager.includes(targetRole);
  }
  
  return RoleLevel[currentRole] >= RoleLevel[targetRole] && targetRole !== Role.SUPER_ADMIN;
};

const canModifyUser = (currentRole: Role, targetUserRole: Role): boolean => {
  if (currentRole === Role.SUPER_ADMIN) return true;
  return RoleLevel[currentRole] >= RoleLevel[targetUserRole] && targetUserRole !== Role.SUPER_ADMIN;
};

export const createUser = async (
  req: Request<unknown, unknown, CreateUserInput>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, role: currentRole } = res.locals.user;
    
    if (RoleLevel[currentRole] < RoleLevel.MANAGER) {
      throw new UnauthorizedError('Only administrators and managers can create new users');
    }

    const { email, password, firstName, lastName, role } = req.body as any;
    const targetRole = role || Role.USER;

    if (!canAssignRole(currentRole, targetRole)) {
      throw new UnauthorizedError(`Your current role (${currentRole}) is not authorized to create a ${targetRole}`);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('Email is already in use');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: targetRole,
        organizationId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        canManageImports: true,
      }
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (
  req: Request<unknown, unknown, unknown, { page?: string; limit?: string; search?: string; role?: Role }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, role: currentRole } = res.locals.user;
    
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = req.query.search || '';
    const queryRole = req.query.role;
    
    const skip = (page - 1) * limit;

    const isAdminOrManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentRole);

    const whereClause: Prisma.UserWhereInput = {
      organizationId,
      ...(queryRole && { role: queryRole }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    if (!isAdminOrManager) {
      whereClause.role = {
        in: ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
      };
    }

    const today = new Date();
    const day = today.getDay() || 7; 
    const startOfWeek = new Date(today);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(today.getDate() - day + 1);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const [rawUsers, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isBanned: true,
          canManageImports: true,
          _count: {
            select: { assignedTasks: true }
          },
          timeEntries: {
            where: {
              date: { gte: startOfWeek, lte: endOfWeek }
            },
            select: {
              duration: true,
              isBillable: true,
              date: true
            }
          }
        }
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    const users = rawUsers.map((user) => {
      let trackedHours = 0;
      let billableHours = 0;
      let loggedToday = false;
      const todayDateString = new Date().toDateString();

      user.timeEntries.forEach((entry) => {
        const duration = Number(entry.duration) || 0;
        trackedHours += duration;
        
        if (entry.isBillable) {
          billableHours += duration;
        }
        
        if (new Date(entry.date).toDateString() === todayDateString && duration > 0) {
          loggedToday = true;
        }
      });

      const { timeEntries, ...userData } = user;

      return {
        ...userData,
        weeklyStats: {
          trackedHours: Number(trackedHours.toFixed(2)),
          billableHours: Number(billableHours.toFixed(2)),
          loggedToday
        }
      };
    });

    res.status(200).json({
      success: true,
      data: { 
        users,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { organizationId } = res.locals.user;

    const user = await prisma.user.findFirst({
      where: {
        id,
        organizationId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isBanned: true,
        canManageImports: true,
        createdAt: true,
        assignedTasks: {
          where: { isActive: true, status: { not: 'COMPLETED' } },
          select: { id: true, name: true, status: true, dueDate: true },
          take: 5
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request<{ id: string }, unknown, any>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { organizationId, id: currentUserId, role: currentRole } = res.locals.user;
    
    const { email, password, firstName, lastName, phone, role: targetRole, isActive, isBanned, canManageImports } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (id !== currentUserId) {
      if (RoleLevel[currentRole] < RoleLevel.MANAGER) {
        throw new UnauthorizedError('You are not authorized to update other users');
      }
      if (!canModifyUser(currentRole, existingUser.role)) {
        throw new UnauthorizedError(`You do not have permission to modify a ${existingUser.role} account`);
      }
    }

    if (targetRole && targetRole !== existingUser.role) {
      if (RoleLevel[currentRole] < RoleLevel.ADMIN) {
        throw new UnauthorizedError('Only administrators can change user roles');
      }
      if (!canAssignRole(currentRole, targetRole)) {
        throw new UnauthorizedError(`You do not have permission to assign the ${targetRole} role`);
      }
    }

    if (isActive !== undefined || isBanned !== undefined || canManageImports !== undefined) {
      if (RoleLevel[currentRole] < RoleLevel.MANAGER) {
         throw new UnauthorizedError('Only administrators and managers can change user permissions or status');
      }
    }

    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } });
      if (emailTaken) {
        throw new ConflictError('Email is already in use');
      }
    }

    let updatedPasswordHash;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updatedPasswordHash = await bcrypt.hash(password, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        firstName,
        lastName: lastName === undefined ? undefined : (lastName === null ? null : lastName),
        phone: phone === undefined ? undefined : (phone === null ? null : phone),
        ...(targetRole && { role: targetRole }),
        ...(updatedPasswordHash && { passwordHash: updatedPasswordHash }),
        ...(isActive !== undefined && { isActive }),
        ...(isBanned !== undefined && { isBanned }),
        ...(canManageImports !== undefined && { canManageImports: Boolean(canManageImports) }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true, 
        role: true,
        isActive: true,
        isBanned: true,
        canManageImports: true,
        updatedAt: true,
      }
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { organizationId, id: currentUserId, role: currentRole } = res.locals.user;

    if (RoleLevel[currentRole] < RoleLevel.ADMIN) {
      throw new UnauthorizedError('Only administrators can delete users');
    }

    if (id === currentUserId) {
      throw new BadRequestError('You cannot delete your own account');
    }

    const existingUser = await prisma.user.findFirst({
      where: { id, organizationId },
    });

    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    if (!canModifyUser(currentRole, existingUser.role)) {
      throw new UnauthorizedError(`You do not have permission to delete a ${existingUser.role} account`);
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false, isBanned: true }, 
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: userId } = res.locals.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Both current password and new password are required');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestError('Incorrect current password. Please try again.');
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: userId } = res.locals.user;

    if (!req.file) {
      throw new BadRequestError('No image file provided');
    }

    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const uploadedImageUrl = base64Image; 

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatarUrl: uploadedImageUrl,
      },
      select: {
      id: true,
        avatarUrl: true,
      }
    });

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        avatarUrl: updatedUser.avatarUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// 🟢 NEW FEATURE: GET INDIVIDUAL USER ACTIVITY TIMELINE & LOGS (BULLETPROOF)
// ============================================================================
export const getUserActivity = async (
  req: Request<{ id: string }, unknown, unknown, { range?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id: targetUserId } = req.params;
    const { organizationId, role: currentRole, id: currentUserId } = res.locals.user;
    const { range } = req.query;

    const isAdminOrManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentRole);
    if (!isAdminOrManager && currentUserId !== targetUserId) {
      throw new UnauthorizedError('You are not authorized to view this user\'s activity logs.');
    }

    let startDate: Date | undefined;
    const now = new Date();
    
    switch (range) {
      case '7d': startDate = new Date(now.setDate(now.getDate() - 7)); break;
      case '15d': startDate = new Date(now.setDate(now.getDate() - 15)); break;
      case '1m': startDate = new Date(now.setMonth(now.getMonth() - 1)); break;
      case '3m': startDate = new Date(now.setMonth(now.getMonth() - 3)); break;
      case '6m': startDate = new Date(now.setMonth(now.getMonth() - 6)); break;
      case '1y': startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
      case 'all': 
      default: startDate = undefined; break;
    }

    const dateFilter = startDate ? { gte: startDate } : undefined;

    // 1. Fetch Time Entries Safely 🟢
    let timeEntries: any[] = [];
    try {
      timeEntries = await prisma.timeEntry.findMany({
        where: { userId: targetUserId, organizationId, ...(dateFilter && { date: dateFilter }) },
        include: { project: { select: { id: true, name: true } }, task: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      });
    } catch (err) {
      console.error("TimeEntry Query Failed:", err);
    }

    // 2. Fetch Budget Requests Safely 🟢
    let budgetRequests: any[] = [];
    try {
      budgetRequests = await prisma.budgetRequest.findMany({
        where: { userId: targetUserId, organizationId, ...(dateFilter && { createdAt: dateFilter }) },
        include: { project: { select: { id: true, name: true } }, task: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err) {
      console.error("BudgetRequest Query Failed:", err);
    }

    let totalHours = 0;
    let billableAmount = 0;
    
    timeEntries.forEach(entry => {
      totalHours += Number(entry.duration) || 0;
      billableAmount += Number(entry.billableAmount) || 0;
    });

    res.status(200).json({
      success: true,
      data: {
        timeEntries,
        budgetRequests,
        stats: {
          totalHours: Number(totalHours.toFixed(2)),
          billableAmount: Number(billableAmount.toFixed(2)),
          totalEntries: timeEntries.length,
          totalBudgetReqs: budgetRequests.length
        }
      }
    });

  } catch (error) {
    next(error);
  }
};
