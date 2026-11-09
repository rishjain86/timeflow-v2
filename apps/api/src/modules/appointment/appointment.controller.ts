import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CustomError, ForbiddenError } from '../../utils/errors';
import { assertAppointmentAccess, resolveTherapistScope } from './appointment.access';
import * as appointmentService from './appointment.service';
import { GetAppointmentsFilters } from './appointment.service';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  getAppointmentsQuerySchema,
  appointmentIdParamSchema,
  attendanceSchema,
  cnrSchema,
  cnrApprovalSchema,
} from './schemas/appointment.schema';

export const createAppointment = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createAppointmentSchema.parse({ body: req.body });
    const organizationId = req.user!.organizationId!;
    const scope = await resolveTherapistScope(req.user!, organizationId);
    if (scope && validatedData.body.therapistId !== scope) {
      throw new ForbiddenError('You can only schedule appointments for yourself');
    }

    const appointment = await appointmentService.createAppointment(
      organizationId, 
      validatedData.body
    );  
      
    res.status(201).json({  
      success: true,  
      message: 'Appointment created successfully',  
      data: appointment,  
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateAppointment = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = updateAppointmentSchema.parse({
      params: req.params,
      body: req.body,
    });
    const organizationId = req.user!.organizationId!;
    const { id } = validatedData.params;
    const scope = await assertAppointmentAccess(req.user!, organizationId, id);
    if (scope && validatedData.body.therapistId && validatedData.body.therapistId !== scope) {
      throw new ForbiddenError('You cannot reassign an appointment to another therapist');
    }

    const appointment = await appointmentService.updateAppointment(
      id, 
      organizationId, 
      validatedData.body
    );  
      
    res.status(200).json({  
      success: true,  
      message: 'Appointment updated successfully',  
      data: appointment,  
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getAppointments = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = getAppointmentsQuerySchema.parse({ query: req.query });
    const organizationId = req.user!.organizationId!;

    const filters: GetAppointmentsFilters = {  
      page: validatedQuery.query.page as unknown as number,  
      limit: validatedQuery.query.limit as unknown as number,  
      clientId: validatedQuery.query.clientId as string | undefined,
      projectId: validatedQuery.query.projectId as string | undefined,  
      therapistId: validatedQuery.query.therapistId as string | undefined,  
      status: validatedQuery.query.status as any,  
      startDate: validatedQuery.query.startDate as string | undefined,  
      endDate: validatedQuery.query.endDate as string | undefined,  
    };  

    const scope = await resolveTherapistScope(req.user!, organizationId);
    if (scope) filters.therapistId = scope; // therapists only ever see their own caseload
    const result = await appointmentService.getAppointments(organizationId, filters);  
      
    res.status(200).json({  
      success: true,  
      ...result,  
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getAppointmentById = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = appointmentIdParamSchema.parse({ params: req.params });
    const organizationId = req.user!.organizationId!;
    const { id } = validatedData.params;
    await assertAppointmentAccess(req.user!, organizationId, id);

    const appointment = await appointmentService.getAppointmentById(id, organizationId);  
      
    res.status(200).json({  
      success: true,  
      data: appointment,  
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

// ==========================================
// SPRINT 4: Session Card Endpoint
// ==========================================

export const getSessionCard = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = appointmentIdParamSchema.parse({ params: req.params });
    const organizationId = req.user!.organizationId!;
    const { id } = validatedData.params;
    await assertAppointmentAccess(req.user!, organizationId, id);

    const sessionCardData = await appointmentService.getSessionCardSummary(id, organizationId);  
      
    res.status(200).json({  
      success: true,  
      data: sessionCardData,  
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

// ==========================================
// SPRINT 4: Digital Forms Submission Endpoints
// ==========================================

export const submitAttendance = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = appointmentIdParamSchema.parse({ params: req.params });
    const validatedBody = attendanceSchema.parse({ body: req.body });
    const organizationId = req.user!.organizationId!;
    const { id } = validatedData.params;
    await assertAppointmentAccess(req.user!, organizationId, id);

    const attendance = await appointmentService.submitAttendance(
      id, 
      organizationId, 
      validatedBody.body
    );
    
    res.status(200).json({
      success: true,
      message: 'Attendance submitted successfully',
      data: attendance,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const submitCNR = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = appointmentIdParamSchema.parse({ params: req.params });
    const validatedBody = cnrSchema.parse({ body: req.body });
    const organizationId = req.user!.organizationId!;
    const { id } = validatedData.params;
    await assertAppointmentAccess(req.user!, organizationId, id);

    const cnr = await appointmentService.submitCNR(
      id, 
      organizationId, 
      validatedBody.body
    );
    
    res.status(200).json({
      success: true,
      message: 'Clinical notes submitted successfully',
      data: cnr,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const approveCNR = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = appointmentIdParamSchema.parse({ params: req.params });
    const validatedBody = cnrApprovalSchema.parse({ body: req.body });
    const organizationId = req.user!.organizationId!;
    const { id } = validatedData.params;
    await assertAppointmentAccess(req.user!, organizationId, id);

    const cnr = await appointmentService.approveCNR(
      id, 
      organizationId, 
      validatedBody.body
    );
    
    res.status(200).json({
      success: true,
      message: 'Clinical notes approval status updated',
      data: cnr,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getCNR = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = appointmentIdParamSchema.parse({ params: req.params });
    const organizationId = req.user!.organizationId!;
    const { id } = validatedData.params;
    await assertAppointmentAccess(req.user!, organizationId, id);

    const cnr = await appointmentService.getCNR(id, organizationId);

    res.status(200).json({ success: true, data: cnr });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
