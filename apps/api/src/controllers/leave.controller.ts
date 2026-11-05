import { Response, NextFunction, Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { z } from 'zod';
import { createLeaveSchema, updateLeaveSchema, getLeavesQuerySchema } from '../schemas/leave.schema';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

// Reusable param validation schema
const leaveIdParamSchema = z.object({
  id: z.string().uuid('Invalid leave ID format'),
});

export const createLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = createLeaveSchema.parse({ body: req.body });
    const { id: userId, organizationId } = req.user;

    const leave = await prisma.leave.create({
      data: {
        ...validatedData.body,
        startDate: new Date(validatedData.body.startDate),
        endDate: new Date(validatedData.body.endDate),
        userId,
        organizationId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Leave request created successfully',
      data: leave,
    });
  } catch (error) {
    next(error);
  }
};

export const getLeaves = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedQuery = getLeavesQuerySchema.parse({ query: req.query });
    const { page, limit, status, type, userId: queryUserId, startDate, endDate } = validatedQuery.query;

    const { id: currentUserId, organizationId, role } = req.user;
    const isAdminOrManager = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);

    const where: Prisma.LeaveWhereInput = {
      organizationId,
    };

    if (!isAdminOrManager) {
      where.userId = currentUserId;
    } else if (queryUserId) {
      where.userId = queryUserId;
    }

    if (status) where.status = status;
    if (type) where.type = type;

    if (startDate || endDate) {
      where.startDate = {};
      if (startDate) where.startDate.gte = new Date(startDate);
      if (endDate) where.startDate.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [leaves, totalCount] = await Promise.all([
      prisma.leave.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.leave.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: leaves,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = updateLeaveSchema.parse({ params: req.params, body: req.body });
    const { id } = validatedData.params;
    const { id: userId, organizationId, role } = req.user;

    const existingLeave = await prisma.leave.findFirst({
      where: { id, organizationId },
    });

    if (!existingLeave) {
      res.status(404).json({ success: false, message: 'Leave request not found' });
      return;
    }

    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);
    if (existingLeave.userId !== userId && !isAdmin) {
      res.status(403).json({ success: false, message: 'You do not have permission to edit this leave request' });
      return;
    }

    if (existingLeave.status !== 'PENDING') {
      res.status(400).json({ success: false, message: 'Only pending leave requests can be updated' });
      return;
    }

    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: {
        ...validatedData.body,
        startDate: validatedData.body.startDate ? new Date(validatedData.body.startDate) : undefined,
        endDate: validatedData.body.endDate ? new Date(validatedData.body.endDate) : undefined,
      },
    });

    res.status(200).json({ success: true, message: 'Leave request updated successfully', data: updatedLeave });
  } catch (error) {
    next(error);
  }
};

export const deleteLeave = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // FIX: Validating UUID via Zod
    const { id } = leaveIdParamSchema.parse(req.params);
    const { id: userId, organizationId, role } = req.user;

    const existingLeave = await prisma.leave.findFirst({
      where: { id, organizationId },
    });

    if (!existingLeave) {
      res.status(404).json({ success: false, message: 'Leave request not found' });
      return;
    }

    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);
    if (existingLeave.userId !== userId && !isAdmin) {
      res.status(403).json({ success: false, message: 'You do not have permission to delete this leave request' });
      return;
    }

    if (existingLeave.status !== 'PENDING' && !isAdmin) {
      res.status(400).json({ success: false, message: 'Only pending leave requests can be deleted by the user' });
      return;
    }

    await prisma.leave.delete({ where: { id } });

    res.status(200).json({ success: true, message: 'Leave request deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const updateLeaveStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // FIX: Validating UUID via Zod
    const { id } = leaveIdParamSchema.parse(req.params);
    const { status } = req.body; 
    const { id: approverId, organizationId, role } = req.user;

    // FIX: Explicitly enforcing Role verification at Controller level
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
      res.status(403).json({ success: false, message: 'You do not have permission to approve or reject leave requests' });
      return;
    }

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status provided' });
      return;
    }

    const existingLeave = await prisma.leave.findFirst({
      where: { id, organizationId },
    });

    if (!existingLeave) {
      res.status(404).json({ success: false, message: 'Leave request not found' });
      return;
    }

    if (existingLeave.userId === approverId) {
      res.status(403).json({ success: false, message: 'You cannot approve/reject your own leave request' });
      return;
    }

    if (existingLeave.status !== 'PENDING') {
      res.status(400).json({ success: false, message: `Leave is already ${existingLeave.status.toLowerCase()}` });
      return;
    }

    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: {
        status,
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully`,
      data: updatedLeave,
    });
  } catch (error) {
    next(error);
  }
};
