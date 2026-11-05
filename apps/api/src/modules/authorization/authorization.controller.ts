import { Request, Response, NextFunction } from 'express';
import {
  createAuthorizationSchema,
  updateAuthorizationSchema,
  getAuthorizationsQuerySchema,
  authorizationIdParamSchema,
  addAuthorizationLimitSchema, // SPRINT 3 ADDITION
} from './schemas/authorization.schema'; // Changed '../' to './'

import * as authorizationService from './services/authorization.service'; // Changed '../' to './'
import { AppError } from '../utils/errors';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export const createAuthorization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createAuthorizationSchema.parse({ body: req.body });
    const { organizationId } = req.user;
    
    const authorization = await authorizationService.createAuthorization(
      organizationId,
      validatedData.body
    );
    
    res.status(201).json({
      success: true,
      message: 'Authorization created successfully',
      data: authorization,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateAuthorization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = updateAuthorizationSchema.parse({
      params: req.params,
      body: req.body,
    });
    
    const { id } = validatedData.params;
    const { organizationId } = req.user;
    
    const authorization = await authorizationService.updateAuthorization(
      id,
      organizationId,
      validatedData.body
    );
    
    res.status(200).json({
      success: true,
      message: 'Authorization updated successfully',
      data: authorization,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getAuthorizations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = getAuthorizationsQuerySchema.parse({ query: req.query });
    const { organizationId } = req.user;
    
    const result = await authorizationService.getAuthorizations(
      organizationId,
      validatedQuery.query as authorizationService.GetAuthorizationsQuery
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

export const getAuthorizationById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = authorizationIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user;
    
    const authorization = await authorizationService.getAuthorizationById(id, organizationId);
    
    res.status(200).json({
      success: true,
      data: authorization,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

// ==========================================
// SPRINT 3 ADDITION: Add Limits Controller
// ==========================================

export const addAuthorizationLimit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = addAuthorizationLimitSchema.parse({
      params: req.params,
      body: req.body,
    });
    
    const { id } = validatedData.params;
    const { organizationId } = req.user;
    
    const limit = await authorizationService.addAuthorizationLimit(
      id,
      organizationId,
      validatedData.body
    );
    
    res.status(201).json({
      success: true,
      message: 'Authorization limit added successfully',
      data: limit,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
