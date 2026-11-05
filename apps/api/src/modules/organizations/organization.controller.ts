import { Request, Response, NextFunction } from 'express';
import * as organizationService from './organization.service';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const getOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user.organizationId;
    const organization = await organizationService.getOrganization(organizationId);
    
    res.status(200).json({ 
      success: true, 
      data: { organization } 
    });
  } catch (error) { 
    next(error); 
  }
};

export const getMyOrganizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizations = await organizationService.getMyOrganizations(req.user.id);
    
    res.status(200).json({ 
      success: true, 
      data: { organizations } 
    });
  } catch (error) { 
    next(error); 
  }
};

export const getOrganizationById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.params.id;
    const organization = await organizationService.getOrganization(organizationId);
    
    res.status(200).json({ 
      success: true, 
      data: { organization } 
    });
  } catch (error) { 
    next(error); 
  }
};

export const updateOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.params.id || req.user.organizationId;
    const organization = await organizationService.updateOrganization(organizationId, req.body);
    
    res.status(200).json({ 
      success: true, 
      message: 'Organization updated successfully', 
      data: { organization } 
    });
  } catch (error) { 
    next(error); 
  }
};

export const createOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const organization = await organizationService.createOrganization(userId, req.body);
    
    res.status(201).json({ 
      success: true, 
      message: 'Organization created successfully', 
      data: { organization } 
    });
  } catch (error) { 
    next(error); 
  }
};

export const switchOrganization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await organizationService.switchOrganization(req.user.id, req.body.organizationId);
    
    res.status(200).json({ 
      success: true, 
      message: 'Organization switched successfully' 
    });
  } catch (error) { 
    next(error); 
  }
};
