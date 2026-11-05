import { Response, NextFunction, Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import {
  createCommentSchema,
  updateCommentSchema,
  getCommentsQuerySchema,
  deleteCommentSchema,
} from '../schemas/comment.schema';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

// Helper to verify that the entity exists and belongs to the user's organization
const validateCommentRelations = async (
  organizationId: string,
  relations: {
    projectId?: string;
    taskId?: string;
    clientId?: string;
    invoiceId?: string;
  }
): Promise<string | null> => {
  if (relations.projectId) {
    const project = await prisma.project.findFirst({ where: { id: relations.projectId, organizationId } });
    if (!project) return 'Invalid project or access denied';
  }
  if (relations.taskId) {
    const task = await prisma.task.findFirst({ where: { id: relations.taskId, organizationId } });
    if (!task) return 'Invalid task or access denied';
  }
  if (relations.clientId) {
    const client = await prisma.client.findFirst({ where: { id: relations.clientId, organizationId } });
    if (!client) return 'Invalid client or access denied';
  }
  if (relations.invoiceId) {
    const invoice = await prisma.invoice.findFirst({ where: { id: relations.invoiceId, organizationId } });
    if (!invoice) return 'Invalid invoice or access denied';
  }
  return null;
};

export const createComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = createCommentSchema.parse({ body: req.body });
    const { content, projectId, taskId, clientId, invoiceId } = validatedData.body;
    const { id: userId, organizationId } = req.user;

    const relationError = await validateCommentRelations(organizationId, {
      projectId,
      taskId,
      clientId,
      invoiceId,
    });

    if (relationError) {
      res.status(403).json({ success: false, message: relationError });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        projectId,
        taskId,
        clientId,
        invoiceId,
        userId,
        organizationId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

export const getComments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedQuery = getCommentsQuerySchema.parse({ query: req.query });
    const { page, limit, projectId, taskId, clientId, invoiceId } = validatedQuery.query;
    const { organizationId } = req.user;

    const where: Prisma.CommentWhereInput = {
      organizationId,
    };

    if (projectId) where.projectId = projectId;
    if (taskId) where.taskId = taskId;
    if (clientId) where.clientId = clientId;
    if (invoiceId) where.invoiceId = invoiceId;

    const skip = (page - 1) * limit;

    const [comments, totalCount] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // Latest comments first
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.comment.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: comments,
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

export const updateComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = updateCommentSchema.parse({ params: req.params, body: req.body });
    const { id } = validatedData.params;
    const { content } = validatedData.body;
    const { id: userId, organizationId } = req.user;

    const comment = await prisma.comment.findFirst({
      where: { id, organizationId },
    });

    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found' });
      return;
    }

    // Only the author can edit their own comment
    if (comment.userId !== userId) {
      res.status(403).json({ success: false, message: 'You can only edit your own comments' });
      return;
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { content },
    });

    res.status(200).json({
      success: true,
      message: 'Comment updated successfully',
      data: updatedComment,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = deleteCommentSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { id: userId, organizationId, role } = req.user;

    const comment = await prisma.comment.findFirst({
      where: { id, organizationId },
    });

    if (!comment) {
      res.status(404).json({ success: false, message: 'Comment not found' });
      return;
    }

    // Author can delete their own comment, OR Admins can delete any comment
    const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role);
    if (comment.userId !== userId && !isAdmin) {
      res.status(403).json({ success: false, message: 'Permission denied to delete this comment' });
      return;
    }

    await prisma.comment.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
};
