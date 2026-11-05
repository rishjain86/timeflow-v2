import { Request, Response, NextFunction } from 'express';
import { listInvoicesService } from './list-invoices.service';

// Path fixed: schemas folder se import kiya gaya hai
import { ListInvoicesQuery } from './schemas/list-invoices.schema';

// TypeScript error (req.user) se bachne ke liye interface add kiya
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role?: string;
  };
}

export const listInvoicesController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 🟢 FIX: Changed req.user to res.locals.user (Stops 500 Internal Server Crash)
    const organizationId = res.locals.user.organizationId;
    
    // Zod middleware processes and attaches the typed data to req.query
    const filters = req.query as unknown as ListInvoicesQuery;

    const result = await listInvoicesService(organizationId, filters);

    res.status(200).json({
      success: true,
      message: 'Invoices fetched successfully.',
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};
