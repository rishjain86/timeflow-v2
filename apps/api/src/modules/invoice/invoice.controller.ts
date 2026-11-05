import { Request, Response, NextFunction } from 'express';
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  getInvoicesQuerySchema,
  invoiceIdParamSchema,
} from './schemas/invoice.schema';
import * as invoiceService from './invoice.service';
import { CustomError } from '../../utils/errors';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export const createInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = createInvoiceSchema.parse({ body: req.body });
    const { organizationId, id: userId } = req.user;

    const invoice = await invoiceService.createInvoice(
      organizationId,
      userId,
      validatedData.body
    );

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = updateInvoiceSchema.parse({
      params: req.params,
      body: req.body,
    });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const invoice = await invoiceService.updateInvoice(
      id,
      organizationId,
      validatedData.body
    );

    res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getInvoices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedQuery = getInvoicesQuerySchema.parse({ query: req.query });
    const { organizationId } = req.user;

    const result = await invoiceService.getInvoices(
      organizationId,
      validatedQuery.query as invoiceService.GetInvoicesQuery
    );

    res.status(200).json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const getInvoiceById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = invoiceIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const invoice = await invoiceService.getInvoiceById(id, organizationId);

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const deleteInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validatedData = invoiceIdParamSchema.parse({ params: req.params });
    const { id } = validatedData.params;
    const { organizationId } = req.user;

    const result = await invoiceService.deleteInvoice(id, organizationId);

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
