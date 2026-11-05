import { Request, Response, NextFunction } from 'express';
import { getInvoiceService } from './get-invoice.service';

// Path fixed: schemas folder se import kiya gaya hai
import { GetInvoiceParams } from './schemas/get-invoice.schema';

// TypeScript error (req.user) se bachne ke liye interface add kiya
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role?: string;
  };
}

export const getInvoiceController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user.organizationId;
    
    // Zod middleware validates and attaches to req.params
    const { id } = req.params as GetInvoiceParams;

    const invoice = await getInvoiceService(id, organizationId);

    res.status(200).json({
      success: true,
      message: 'Invoice retrieved successfully.',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};
