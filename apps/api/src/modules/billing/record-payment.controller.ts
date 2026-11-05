import { Request, Response, NextFunction } from 'express';
import { recordPaymentService } from './record-payment.service';

// Path fixed: schemas folder se import kiya gaya hai
import { RecordPaymentParams, RecordPaymentBody } from './schemas/record-payment.schema';

// TypeScript error (req.user) se bachne ke liye interface add kiya
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role?: string;
  };
}

export const recordPaymentController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const organizationId = req.user.organizationId;
    const userId = req.user.id;
    
    // Zod middleware validates and attaches to req.params and req.body
    const { id } = (req.params as unknown) as RecordPaymentParams;
    const payload = req.body as RecordPaymentBody;

    const result = await recordPaymentService(
      id,
      organizationId,
      userId,
      payload
    );

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
