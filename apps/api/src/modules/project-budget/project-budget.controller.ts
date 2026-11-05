import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import * as projectBudgetService from './project-budget.service';

// ==========================================
// FIX: Connected to Bulletproof Service Logic
// ==========================================
export const allocateProjectBudget = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // 🟢 FIX: Added 'tasks' here so it is extracted from the frontend payload!
    const { projectId, totalAllocatedHours, tasks, members } = req.body;
    const organizationId = req.user!.organizationId!;

    // 🟢 FIX: Passed 'tasks' into the sync service method
    const result = await projectBudgetService.syncProjectAllocations(
      organizationId,
      projectId,
      { totalAllocatedHours, tasks, members }
    );

    res.status(200).json({
      success: true,
      message: 'Budget allocated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXISTING FUNCTIONS (SAFE & UNTOUCHED)
// ==========================================

export const createProjectBudget = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const budget = await projectBudgetService.createProjectBudget(
      req.user!.organizationId!,
      req.body
    );
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

export const getProjectBudget = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const budget = await projectBudgetService.getProjectBudget(
      req.user!.organizationId!,
      projectId
    );
    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

export const updateProjectBudget = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const budget = await projectBudgetService.updateProjectBudget(
      req.user!.organizationId!,
      id,
      req.body
    );
    res.status(200).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
};

export const allocateMemberBudget = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { budgetId } = req.params;
    const allocation = await projectBudgetService.allocateMemberBudget(
      req.user!.organizationId!,
      budgetId,
      req.body
    );
    res.status(201).json({ success: true, data: allocation });
  } catch (error) {
    next(error);
  }
};

export const updateMemberBudget = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { memberBudgetId } = req.params;
    const allocation = await projectBudgetService.updateMemberBudget(
      req.user!.organizationId!,
      memberBudgetId,
      req.body
    );
    res.status(200).json({ success: true, data: allocation });
  } catch (error) {
    next(error);
  }
};

export const allocateTaskBudget = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { memberBudgetId } = req.params;
    const allocation = await projectBudgetService.allocateTaskBudget(
      req.user!.organizationId!,
      memberBudgetId,
      req.body
    );
    res.status(201).json({ success: true, data: allocation });
  } catch (error) {
    next(error);
  }
};

export const updateTaskBudget = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { taskBudgetId } = req.params;
    const allocation = await projectBudgetService.updateTaskBudget(
      req.user!.organizationId!,
      taskBudgetId,
      req.body
    );
    res.status(200).json({ success: true, data: allocation });
  } catch (error) {
    next(error);
  }
};
