import { Request, Response, NextFunction } from 'express';
import {
  createBudgetSchema,
  updateBudgetSchema,
  getBudgetsQuerySchema,
  budgetIdParamSchema,
} from './budget.schema';
import * as budgetService from './budget.service';
import { CustomError } from '../../utils/errors';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export const createBudget = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createBudgetSchema.parse({ body: req.body });
    const { organizationId } = req.user;

    const budget = await budgetService.createBudget(
      organizationId,
      validatedData.body
    );

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: budget,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateBudget = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = updateBudgetSchema.parse({
      params: req.params,
      body: req.body,
    });
    const { id } = validatedData.params;
    
    const { organizationId, id: userId } = req.user; 

    const budget = await budgetService.updateBudget(
      id,
      organizationId,
      userId,
      validatedData.body
    );

    res.status(200).json({
      success: true,
      message: 'Budget updated successfully',
      data: budget,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getBudgets = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = getBudgetsQuerySchema.parse({ query: req.query });
    const { organizationId } = req.user;

    const result = await budgetService.getBudgets(
      organizationId,
      validatedQuery.query as budgetService.GetBudgetsQuery
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getBudgetById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = budgetIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const budget = await budgetService.getBudgetById(id, organizationId);

    res.status(200).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
