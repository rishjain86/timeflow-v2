import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import * as clinicalNoteService from './clinical-note.service';

export const createClinicalNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const note = await clinicalNoteService.createClinicalNote(
      req.user!.organizationId,
      req.body
    );
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const getClinicalNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const note = await clinicalNoteService.getClinicalNote(
      req.user!.organizationId,
      id
    );
    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const getClinicalNoteByAppointment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;
    const note = await clinicalNoteService.getClinicalNoteByAppointment(
      req.user!.organizationId,
      appointmentId
    );
    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const updateClinicalNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const note = await clinicalNoteService.updateClinicalNote(
      req.user!.organizationId,
      id,
      req.body
    );
    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

export const verifyClinicalNote = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { appointmentId } = req.params;
    const isComplete = await clinicalNoteService.verifyClinicalNoteCompleteness(
      req.user!.organizationId,
      appointmentId
    );
    res.status(200).json({ success: true, data: { isComplete } });
  } catch (error) {
    next(error);
  }
};
