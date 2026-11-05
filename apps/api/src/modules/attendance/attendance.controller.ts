import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import * as attendanceService from './attendance.service';

export const createAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const attendance = await attendanceService.createAttendance(
      req.user!.organizationId,
      req.body
    );
    res.status(201).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

export const getAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const attendance = await attendanceService.getAttendance(
      req.user!.organizationId,
      id
    );
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceByAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;
    const attendance = await attendanceService.getAttendanceByAppointment(
      req.user!.organizationId,
      appointmentId
    );
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

export const updateAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const attendance = await attendanceService.updateAttendance(
      req.user!.organizationId,
      id,
      req.body
    );
    res.status(200).json({ success: true, data: attendance });
  } catch (error) {
    next(error);
  }
};

export const verifyAttendance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;
    const isComplete = await attendanceService.verifyAttendanceCompleteness(
      req.user!.organizationId,
      appointmentId
    );
    res.status(200).json({ success: true, data: { isComplete } });
  } catch (error) {
    next(error);
  }
};
