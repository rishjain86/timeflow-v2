import { Request, Response, NextFunction } from 'express';
import * as therapistService from './therapist.service';
import { GetTherapistsFilters } from './therapist.service';

// Schemas ko schemas folder se import kiya gaya hai
import {
  createTherapistSchema as createTherapistProfileSchema,
  updateTherapistSchema as updateTherapistProfileSchema,
  getTherapistsQuerySchema as getTherapistProfilesQuerySchema,
  therapistIdParamSchema,
} from './schemas/therapist.schema';

// TypeScript error (req.user) se bachne ke liye interface add kiya
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    role?: string;
  };
}

export const createTherapistProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Zod validation apply kiya
    const validatedData = createTherapistProfileSchema.parse({ body: req.body });
    
    // Assuming authentication middleware attaches the user object
    const organizationId = req.user!.organizationId; 
    
    const profile = await therapistService.createTherapistProfile(organizationId, validatedData.body);
    
    res.status(201).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getTherapistProfiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Zod validation apply kiya
    const validatedQuery = getTherapistProfilesQuerySchema.parse({ query: req.query });
    const organizationId = req.user!.organizationId;
    
    // Ab validated query se filters banayenge
    const filters: GetTherapistsFilters = {
      page: validatedQuery.query.page as unknown as number,
      limit: validatedQuery.query.limit as unknown as number,
      status: validatedQuery.query.status as any,
      supervisorId: validatedQuery.query.supervisorId as string,
      credentialType: validatedQuery.query.credentialType as string,
    };

    const result = await therapistService.getTherapistProfiles(organizationId, filters);
    
    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getTherapistProfileById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Zod validation apply kiya
    const validatedData = therapistIdParamSchema.parse({ params: req.params });
    const organizationId = req.user!.organizationId;
    const { id } = validatedData.params;

    const profile = await therapistService.getTherapistProfileById(id, organizationId);
    
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTherapistProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Zod validation apply kiya (params aur body dono ke liye)
    const validatedData = updateTherapistProfileSchema.parse({
      params: req.params,
      body: req.body,
    });
    
    const organizationId = req.user!.organizationId;
    const { id } = validatedData.params;

    const profile = await therapistService.updateTherapistProfile(id, organizationId, validatedData.body);
    
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};
