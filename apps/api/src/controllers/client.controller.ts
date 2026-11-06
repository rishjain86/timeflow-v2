import { Request, Response, NextFunction } from 'express';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { NotFoundError, UnauthorizedError, ConflictError, ForbiddenError } from '../utils/errors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// 🟢 THE FIX: Added SUPER_ADMIN to the access permissions to prevent 401 Unauthorized logouts
const hasManagerAccess = (role: string | Role) => ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(String(role));

// Which roles an actor may hand out. Prevents a manager from minting admins / super admins.
const MANAGER_ASSIGNABLE: Role[] = [Role.USER, Role.THERAPIST, Role.BILLING, Role.FRONT_DESK, Role.EMPLOYEE, Role.CONSULTANT];
const canAssignRole = (actor: string | Role, target: Role): boolean => {
  if (actor === Role.SUPER_ADMIN) return true;
  if (actor === Role.ADMIN) return target !== Role.SUPER_ADMIN;
  if (actor === Role.MANAGER) return MANAGER_ASSIGNABLE.includes(target);
  return false;
};

export const createClient = async (
  req: Request<unknown, unknown, any>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { organizationId, role } = res.locals.user;
    
    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only administrators and managers can create clients');
    }

    const { firstName, lastName, displayName, email, phone, role: assignRole } = req.body;

    const targetRole = (assignRole || 'THERAPIST') as Role;
    if (!Object.values(Role).includes(targetRole)) {
      res.status(400).json({ success: false, message: 'Invalid role.' });
      return;
    }
    if (!canAssignRole(role, targetRole)) {
      throw new ForbiddenError('You are not allowed to assign this role.');
    }

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required to create a team account.' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ success: false, message: 'A team member with this email already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    // Random one-time password (returned once in the response) instead of a shared, guessable default.
    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, salt);
    const clientName = displayName || `${firstName} ${lastName}`.trim();

    // Create both Client and User simultaneously
    const newClient = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          name: clientName,
          email,
          phone,
          organizationId,
        },
      });

      await tx.user.create({
        data: {
          firstName,
          lastName: lastName || null,
          email,
          phone: phone || "0000000000",
          passwordHash,
          role: targetRole,
          requirePasswordChange: true,
          organizationId,
        },
      });

      return client;
    });

    res.status(201).json({
      success: true,
      message: 'Client and Team Account created successfully',
      data: { client: newClient, temporaryPassword },
    });
  } catch (error) {
    next(error);
  }
};

export const getClients = async (
  req: Request<unknown, unknown, unknown, { page?: string; limit?: string; search?: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const organizationId = res.locals.user?.organizationId;
    
    if (!organizationId) {
      res.status(200).json({
        success: true,
        data: { clients: [], meta: { total: 0, page: 1, limit: 25000, totalPages: 0 } }
      });
      return;
    }
    
    const page = Math.max(1, Number(req.query.page) || 1);
    // Adjust max limit to 25000 to return all rows 
    const limit = Math.min(25000, Math.max(1, Number(req.query.limit) || 25000));
    const search = req.query.search || '';
    const skip = (page - 1) * limit;

    const whereClause: Prisma.ClientWhereInput = {
      organizationId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where: whereClause }),
    ]);

    res.status(200).json({
      success: true,
      data: { 
        clients,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
      },
    });
  } catch (error) {
    console.error('GET_CLIENTS_ERROR:', error);
    next(error);
  }
};

export const getClientById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { organizationId } = res.locals.user;

    const client = await prisma.client.findFirst({
      where: { id, organizationId, isActive: true },
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    res.status(200).json({ success: true, data: { client } });
  } catch (error) {
    next(error);
  }
};

export const updateClient = async (
  req: Request<{ id: string }, unknown, any>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { organizationId, role } = res.locals.user;

    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only administrators and managers can update clients');
    }
    
    // 🟢 FIX: Check for both 'name' and 'displayName' to prevent silent Zod stripping failures
    const { displayName, name, email, phone } = req.body;
    const finalName = name !== undefined ? name : displayName;

    const existingClient = await prisma.client.findFirst({
      where: { id, organizationId, isActive: true },
    });

    if (!existingClient) {
      throw new NotFoundError('Client not found');
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: {
        name: finalName === undefined ? undefined : finalName,
        email: email === undefined ? undefined : (email === null ? null : email),
        phone: phone === undefined ? undefined : (phone === null ? null : phone),
      },
    });

    // Optionally update user info if emails match (Safe sync)
    if (existingClient.email && existingClient.email === email) {
       await prisma.user.updateMany({
         where: { email: existingClient.email, organizationId },
         data: { 
            phone: phone,
            firstName: finalName // Keep user's first name synced with display name
         }
       });
    }

    res.status(200).json({
      success: true,
      message: 'Client updated successfully',
      data: { client: updatedClient },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteClient = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { organizationId, role } = res.locals.user;

    if (!hasManagerAccess(role)) {
      throw new UnauthorizedError('Only administrators and managers can delete clients');
    }

    const existingClient = await prisma.client.findFirst({
      where: { id, organizationId, isActive: true },
    });

    if (!existingClient) {
      throw new NotFoundError('Client not found');
    }

    await prisma.client.update({
      where: { id },
      data: { isActive: false },
    });

    res.status(200).json({
      success: true,
      message: 'Client deleted successfully',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
