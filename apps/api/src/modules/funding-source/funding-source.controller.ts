import { Request, Response, NextFunction } from 'express';
import {
  createFundingSourceSchema,
  updateFundingSourceSchema,
  getFundingSourcesQuerySchema,
  fundingSourceIdParamSchema,
} from './schemas/funding-source.schema';
import * as fundingSourceService from './funding-source.service';
import { CustomError } from '../../utils/errors';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export const createFundingSource = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createFundingSourceSchema.parse({ body: req.body });
    const { organizationId } = req.user;

    const fundingSource = await fundingSourceService.createFundingSource(
      organizationId,
      validatedData.body
    );

    res.status(201).json({
      success: true,
      message: 'Funding Source created successfully',
      data: fundingSource,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateFundingSource = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = updateFundingSourceSchema.parse({
      params: req.params,
      body: req.body,
    });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const fundingSource = await fundingSourceService.updateFundingSource(
      id,
      organizationId,
      validatedData.body
    );

    res.status(200).json({
      success: true,
      message: 'Funding Source updated successfully',
      data: fundingSource,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getFundingSources = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = getFundingSourcesQuerySchema.parse({ query: req.query });
    const { organizationId } = req.user;

    const result = await fundingSourceService.getFundingSources(
      organizationId,
      validatedQuery.query as fundingSourceService.GetFundingSourcesQuery
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

export const getFundingSourceById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = fundingSourceIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const fundingSource = await fundingSourceService.getFundingSourceById(
      id,
      organizationId
    );

    res.status(200).json({
      success: true,
      data: fundingSource,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
