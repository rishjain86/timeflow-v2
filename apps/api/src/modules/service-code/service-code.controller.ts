import { Request, Response, NextFunction } from 'express';
import * as serviceCodeService from './service-code.service';
import { GetServiceCodesFilters } from './service-code.service';

// Schemas ko schemas folder se import kiya gaya hai
import {
  createServiceCodeSchema,
  updateServiceCodeSchema,
  getServiceCodesQuerySchema,
  serviceCodeIdParamSchema,
} from './schemas/service-code.schema';

// TypeScript error (req.user) se bachne ke liye interface add kiya
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    role?: string;
  };
}

export const createServiceCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Zod validation add kiya
    const validatedData = createServiceCodeSchema.parse({ body: req.body });
    const organizationId = req.user!.organizationId; 
    
    const serviceCode = await serviceCodeService.createServiceCode(organizationId, validatedData.body);
    
    res.status(201).json({
      success: true,
      data: serviceCode,
    });
  } catch (error) {
    next(error);
  }
};

export const getServiceCodes = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Zod validation add kiya
    const validatedQuery = getServiceCodesQuerySchema.parse({ query: req.query });
    const organizationId = req.user!.organizationId;
    
    const filters: GetServiceCodesFilters = {
      page: validatedQuery.query.page as unknown as number,
      limit: validatedQuery.query.limit as unknown as number,
      isActive: validatedQuery.query.isActive as unknown as boolean,
      search: validatedQuery.query.search as string,
    };

    const result = await serviceCodeService.getServiceCodes(organizationId, filters);
    
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getServiceCodeById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Zod validation add kiya
    const validatedData = serviceCodeIdParamSchema.parse({ params: req.params });
    const organizationId = req.user!.organizationId;
    const { id } = validatedData.params;

    const serviceCode = await serviceCodeService.getServiceCodeById(id, organizationId);
    
    res.status(200).json({
      success: true,
      data: serviceCode,
    });
  } catch (error) {
    next(error);
  }
};

export const updateServiceCode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Zod validation add kiya
    const validatedData = updateServiceCodeSchema.parse({
      params: req.params,
      body: req.body,
    });
    const organizationId = req.user!.organizationId;
    const { id } = validatedData.params;

    const serviceCode = await serviceCodeService.updateServiceCode(id, organizationId, validatedData.body);
    
    res.status(200).json({
      success: true,
      data: serviceCode,
    });
  } catch (error) {
    next(error);
  }
};
