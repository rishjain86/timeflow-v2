import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { 
  createExpenseSchema, 
  updateExpenseSchema, 
  getExpensesQuerySchema 
} from '../schemas/expense.schema';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

const validateTenantRelations = async (
  organizationId: string, 
  projectId?: string | null, 
  clientId?: string | null
): Promise<string | null> => {
  if (projectId !== undefined && projectId !== null) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) return 'Invalid project or access denied';
  }

  if (clientId !== undefined && clientId !== null) {
    const client = await prisma.client.findFirst({
      where: { id: clientId, organizationId },
    });
    if (!client) return 'Invalid client or access denied';
  }

  return null;
};

export const createExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = createExpenseSchema.parse({ body: req.body });
    const { 
      title, description, amount, currency, expenseDate, 
      category, paymentMethod, referenceNumber, projectId, 
      clientId, isBillable 
    } = validatedData.body;

    const { id: userId, organizationId } = req.user;

    const relationError = await validateTenantRelations(organizationId, projectId, clientId);
    if (relationError) {
      res.status(403).json({ success: false, message: relationError });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        description,
        amount,
        currency,
        expenseDate: new Date(expenseDate),
        category,
        paymentMethod,
        referenceNumber,
        projectId,
        clientId,
        isBillable,
        userId,
        organizationId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedQuery = getExpensesQuerySchema.parse({ query: req.query });
    const { page, limit, search, category, projectId, clientId, startDate, endDate } = validatedQuery.query;

    const { organizationId } = req.user;

    const where: Prisma.ExpenseWhereInput = {
      organizationId,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = category;
    if (projectId) where.projectId = projectId;
    if (clientId) where.clientId = clientId;
    
    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) where.expenseDate.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [expenses, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true } },
          client: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: expenses,
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

export const getExpenseById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { organizationId } = req.user;

    const expense = await prisma.expense.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
      },
    });

    if (!expense) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    res.status(200).json({ success: true, data: expense });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const validatedData = updateExpenseSchema.parse({ 
      params: req.params, 
      body: req.body 
    });
    const { id } = validatedData.params;
    const { projectId, clientId } = validatedData.body;
    
    const { id: userId, organizationId, role } = req.user;

    const existingExpense = await prisma.expense.findFirst({
      where: { id, organizationId }
    });

    if (!existingExpense) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    const hasPermission = existingExpense.userId === userId || ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);
    if (!hasPermission) {
      res.status(403).json({ success: false, message: 'You do not have permission to edit this expense' });
      return;
    }

    if (['APPROVED', 'REIMBURSED'].includes(existingExpense.status)) {
      res.status(403).json({ success: false, message: 'Cannot edit an approved or reimbursed expense' });
      return;
    }

    const relationError = await validateTenantRelations(organizationId, projectId, clientId);
    if (relationError) {
      res.status(403).json({ success: false, message: relationError });
      return;
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        ...validatedData.body,
        expenseDate: validatedData.body.expenseDate ? new Date(validatedData.body.expenseDate) : undefined,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: updatedExpense,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { id: userId, organizationId, role } = req.user;

    const existingExpense = await prisma.expense.findFirst({
      where: { id, organizationId }
    });

    if (!existingExpense) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    const hasPermission = existingExpense.userId === userId || ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role);
    if (!hasPermission) {
      res.status(403).json({ success: false, message: 'You do not have permission to delete this expense' });
      return;
    }

    if (['APPROVED', 'REIMBURSED'].includes(existingExpense.status)) {
      res.status(403).json({ success: false, message: 'Cannot delete an approved or reimbursed expense' });
      return;
    }

    await prisma.expense.delete({
      where: { id },
    });

    res.status(200).json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const approveExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { id: approverId, organizationId, role } = req.user;

    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
      res.status(403).json({ success: false, message: 'You do not have permission to approve expenses' });
      return;
    }

    const existingExpense = await prisma.expense.findFirst({
      where: { id, organizationId }
    });

    if (!existingExpense) {
      res.status(404).json({ success: false, message: 'Expense not found' });
      return;
    }

    if (existingExpense.userId === approverId) {
      res.status(403).json({ success: false, message: 'You cannot approve your own expense' });
      return;
    }

    if (['APPROVED', 'REJECTED', 'REIMBURSED'].includes(existingExpense.status)) {
      res.status(400).json({ 
        success: false, 
        message: `Expense cannot be approved from current state: ${existingExpense.status}` 
      });
      return;
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: approverId,
        approvedAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Expense approved successfully',
      data: updatedExpense,
    });
  } catch (error) {
    next(error);
  }
};
