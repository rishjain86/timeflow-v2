import { Request, Response, NextFunction } from 'express';
import {
  createExpenseSchema,
  updateExpenseSchema,
  getExpensesQuerySchema,
  expenseIdParamSchema,
} from './schemas/expense.schema';
import * as expenseService from './expense.service';
import { CustomError } from '../../utils/errors';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export const createExpense = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createExpenseSchema.parse({ body: req.body });
    const { organizationId, id: userId } = req.user;

    const expense = await expenseService.createExpense(
      organizationId,
      userId,
      validatedData.body
    );

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateExpense = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = updateExpenseSchema.parse({
      params: req.params,
      body: req.body,
    });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const expense = await expenseService.updateExpense(
      id,
      organizationId,
      validatedData.body
    );

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully',
      data: expense,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getExpenses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = getExpensesQuerySchema.parse({ query: req.query });
    const { organizationId } = req.user;

    const result = await expenseService.getExpenses(
      organizationId,
      validatedQuery.query as expenseService.GetExpensesQuery
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getExpenseById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = expenseIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const expense = await expenseService.getExpenseById(id, organizationId);

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const deleteExpense = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = expenseIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const result = await expenseService.deleteExpense(id, organizationId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
