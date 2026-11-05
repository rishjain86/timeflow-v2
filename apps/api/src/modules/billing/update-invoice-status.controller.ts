import { Request, Response, NextFunction } from 'express';
import { updateInvoiceStatusService } from './update-invoice-status.service';

// Path fixed: schemas folder se import kiya gaya hai
import { UpdateInvoiceStatusParams, UpdateInvoiceStatusBody } from './schemas/update-invoice-status.schema';

// TypeScript error (req.user) se bachne ke liye interface add kiya
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role?: string;
  };
}

export const updateInvoiceStatusController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    
    // Zod middleware validates and attaches to req.params and req.body
    const { id } = (req.params as unknown) as UpdateInvoiceStatusParams;
    const payload = req.body as UpdateInvoiceStatusBody;

    const updatedInvoice = await updateInvoiceStatusService(
      id,
      organizationId,
      userId,
      payload
    );

    res.status(200).json({
      success: true,
      message: `Invoice status updated to ${updatedInvoice.status}.`,
      data: updatedInvoice,
    });
  } catch (error) {
    next(error);
  }
};
