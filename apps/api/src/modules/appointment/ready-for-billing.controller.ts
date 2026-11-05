import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../types/express';
import { markReadyForBilling } from './ready-for-billing.service';

// Schema ko schemas folder se import kiya gaya hai
// (Agar schema export ka naam alag hai, toh 'readyForBillingParamSchema' ko usse replace kar dena)
import { readyForBillingParamSchema } from './schemas/ready-for-billing.schema';

export const markReadyForBillingController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Zod ke through params validation
    const validatedData = readyForBillingParamSchema.parse({ params: req.params });
    const appointmentId = validatedData.params.id;
    
    // Multi-tenant security context
    const organizationId = req.user!.organizationId;
    const userId = req.user!.id;

    const timeEntry = await markReadyForBilling(
      appointmentId, 
      organizationId, 
      userId
    );

    return res.status(200).json({
      success: true,
      message: 'Session successfully marked ready for billing',
      data: timeEntry,
    });
  } catch (error) {
    next(error);
  }
};
