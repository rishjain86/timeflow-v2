import { Response, NextFunction, Request } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { getAttachmentsQuerySchema, deleteAttachmentSchema } from '../schemas/attachment.schema';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

const validateAttachmentRelations = async (
  organizationId: string,
  relations: {
    projectId?: string;
    taskId?: string;
    expenseId?: string;
    clientId?: string;
    invoiceId?: string;
    attendanceId?: string;
    clinicalNoteReviewId?: string;
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
  if (relations.expenseId) {
    const expense = await prisma.expense.findFirst({ where: { id: relations.expenseId, organizationId } });
    if (!expense) return 'Invalid expense or access denied';
  }
  if (relations.clientId) {
    const client = await prisma.client.findFirst({ where: { id: relations.clientId, organizationId } });
    if (!client) return 'Invalid client or access denied';
  }
  if (relations.invoiceId) {
    const invoice = await prisma.invoice.findFirst({ where: { id: relations.invoiceId, organizationId } });
    if (!invoice) return 'Invalid invoice or access denied';
  }
  if (relations.attendanceId) {
    const attendance = await prisma.attendance.findFirst({ where: { id: relations.attendanceId, organizationId } });
    if (!attendance) return 'Invalid attendance record or access denied';
  }
  if (relations.clinicalNoteReviewId) {
    const clinicalNote = await prisma.clinicalNoteReview.findFirst({ where: { id: relations.clinicalNoteReviewId, organizationId } });
    if (!clinicalNote) return 'Invalid clinical note review or access denied';
  }
  return null;
};

export const uploadAttachment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const { projectId, taskId, expenseId, clientId, invoiceId, attendanceId, clinicalNoteReviewId } = req.body;
    const { id: uploadedById, organizationId } = req.user;

    const relationError = await validateAttachmentRelations(organizationId, {
      projectId,
      taskId,
      expenseId,
      clientId,
      invoiceId,
      attendanceId,
      clinicalNoteReviewId,
    });

    if (relationError) {
      res.status(403).json({ success: false, message: relationError });
      return;
    }

    const attachment = await prisma.attachment.create({
      data: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`,
        projectId: projectId || null,
        taskId: taskId || null,
        expenseId: expenseId || null,
        clientId: clientId || null,
        invoiceId: invoiceId || null,
        attendanceId: attendanceId || null,
        clinicalNoteReviewId: clinicalNoteReviewId || null,
        uploadedById,
        organizationId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
};

export const getAttachments = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedQuery = getAttachmentsQuerySchema.parse({ query: req.query });
    const { projectId, taskId, expenseId, clientId, invoiceId, attendanceId, clinicalNoteReviewId } = validatedQuery.query;
    const { organizationId } = req.user;

    const where: Prisma.AttachmentWhereInput = {
      organizationId,
    };

    if (projectId) where.projectId = projectId;
    if (taskId) where.taskId = taskId;
    if (expenseId) where.expenseId = expenseId;
    if (clientId) where.clientId = clientId;
    if (invoiceId) where.invoiceId = invoiceId;
    if (attendanceId) where.attendanceId = attendanceId;
    if (clinicalNoteReviewId) where.clinicalNoteReviewId = clinicalNoteReviewId;

    const attachments = await prisma.attachment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.status(200).json({ success: true, data: attachments });
  } catch (error) {
    next(error);
  }
};

export const deleteAttachment = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = deleteAttachmentSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { id: userId, organizationId, role } = req.user;

    const attachment = await prisma.attachment.findFirst({
      where: { id, organizationId },
    });

    if (!attachment) {
      res.status(404).json({ success: false, message: 'Attachment not found' });
      return;
    }

    const hasPermission = attachment.uploadedById === userId || ['SUPER_ADMIN', 'ADMIN'].includes(role);
    if (!hasPermission) {
      res.status(403).json({ success: false, message: 'Permission denied to delete this attachment' });
      return;
    }

    await prisma.attachment.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Attachment deleted successfully' });
  } catch (error) {
    next(error);
  }
};
