import { Request, Response, NextFunction } from 'express';
import {
  createTimeEntrySchema,
  updateTimeEntrySchema,
  getTimeEntriesQuerySchema,
  timeEntryIdParamSchema,
  reviewTimeEntrySchema,
} from './schemas/time-entry.schema';
import * as timeEntryService from './time-entry.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    role: string;
  };
  files?: any;
}

const handleSafeError = (res: Response, error: any) => {
  console.error('🔴 FULL ERROR DETAILS:', JSON.stringify(error, null, 2));

  if (error?.name === 'ZodError') {
    const issues = error.errors?.map((e: any) => `'${e.path?.join('.')}' - ${e.message}`).join(' | ') || 'Invalid data';
    return res.status(400).json({ success: false, message: `Validation Failed: ${issues}` });
  }
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ success: false, message: error.message });
  }
  return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
};

export const createTimeEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.body || !req.body.projectId) {
       res.status(400).json({ success: false, message: 'Invalid payload format. Missing project details.' });
       return;
    }

    const durationNum = parseFloat(req.body.duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      res.status(400).json({ success: false, message: `Invalid duration provided: ${req.body.duration}` });
      return;
    }

    const bodyData = {
      projectId: req.body.projectId,
      taskId: req.body.taskId || undefined,
      taskBudgetId: req.body.taskBudgetId || undefined,
      date: req.body.date,
      duration: durationNum,
      description: req.body.description || '',
      isBillable: req.body.isBillable === 'true' || req.body.isBillable === true,
    };

    const validatedData = createTimeEntrySchema.parse({ body: bodyData });
    const { organizationId, id: userId } = req.user!;

    const timeEntry = await timeEntryService.createTimeEntry(
      organizationId,
      userId,
      validatedData.body,
      req.files || {}
    );

    res.status(201).json({
      success: true,
      message: 'Time entry created successfully',
      data: timeEntry,
    });
  } catch (error: any) {
    handleSafeError(res, error);
  }
};

export const updateTimeEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bodyData = { ...req.body };
    if (bodyData.duration !== undefined) {
      bodyData.duration = parseFloat(bodyData.duration);
    }
    if (bodyData.isBillable !== undefined) {
      bodyData.isBillable = bodyData.isBillable === 'true' || bodyData.isBillable === true;
    }

    const validatedData = updateTimeEntrySchema.parse({
      params: req.params,
      body: bodyData,
    });
    const { id } = validatedData.params;
    const { organizationId, id: userId } = req.user!;

    const timeEntry = await timeEntryService.updateTimeEntry(
      id,
      organizationId,
      userId,
      validatedData.body
    );

    res.status(200).json({
      success: true,
      message: 'Time entry updated successfully',
      data: timeEntry,
    });
  } catch (error: any) {
    handleSafeError(res, error);
  }
};

export const reviewTimeEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = reviewTimeEntrySchema.parse({
      params: req.params,
      body: req.body,
    });
    const { id } = validatedData.params;
    const { organizationId, id: userId } = req.user!;

    const timeEntry = await timeEntryService.reviewTimeEntry(
      id,
      organizationId,
      userId,
      validatedData.body
    );

    res.status(200).json({
      success: true,
      message: `Time entry ${validatedData.body.approvalStatus.toLowerCase()} successfully`,
      data: timeEntry,
    });
  } catch (error: any) {
    handleSafeError(res, error);
  }
};

export const getTimeEntries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  try {
    const validatedQuery = getTimeEntriesQuerySchema.parse({ query: req.query });
    const { organizationId, id: currentUserId, role } = req.user!;

    const finalQuery = {
      ...validatedQuery.query,
      fetchLogs: req.query.fetchLogs,
      currentUserId: String(currentUserId),
      role: role
    };

    const result = await timeEntryService.getTimeEntries(
      organizationId,
      finalQuery as any
    );

    if ((result as any).logs) {
      res.status(200).json({
        success: true,
        data: { logs: (result as any).logs },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error: any) {
    handleSafeError(res, error);
  }
};

export const getTimeEntryById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = timeEntryIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user!;

    const timeEntry = await timeEntryService.getTimeEntryById(id, organizationId);

    res.status(200).json({
      success: true,
      data: timeEntry,
    });
  } catch (error: any) {
    handleSafeError(res, error);
  }
};

export const deleteTimeEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = timeEntryIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user!;

    const result = await timeEntryService.deleteTimeEntry(id, organizationId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error: any) {
    handleSafeError(res, error);
  }
};

// 🟢 NEW INDEPENDENT FEATURE: Move Time Entry Controller
export const moveTimeEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { newProjectId, newTaskId, reason } = req.body;
    
    if (!newProjectId) {
       res.status(400).json({ success: false, message: 'newProjectId is required to move a time entry' });
       return;
    }

    const { organizationId, id: userId } = req.user!;

    const timeEntry = await timeEntryService.moveTimeEntry(
      id,
      organizationId,
      userId,
      { newProjectId, newTaskId, reason }
    );

    res.status(200).json({
      success: true,
      message: 'Time entry moved successfully',
      data: timeEntry,
    });
  } catch (error: any) {
    handleSafeError(res, error);
  }
};
