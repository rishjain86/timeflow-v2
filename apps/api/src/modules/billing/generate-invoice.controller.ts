// apps/api/src/modules/billing/generate-invoice.controller.ts

import { Request, Response, NextFunction } from 'express';
import { generateInvoicesService } from './generate-invoice.service';

// Schema ko schemas folder se import kiya gaya hai
// (Agar export ka naam alag hai, toh 'generateInvoicesSchema' ko usse replace kar dena)
import { generateInvoicesSchema } from './schemas/generate-invoice.schema';

// TypeScript error se bachne ke liye AuthenticatedRequest interface add kar diya
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    organizationId: string;
    role?: string;
  };
}

export const generateInvoicesController = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Zod validation (Middleware ke sath-sath explicit parse karne se TS types bhi mil jaate hain)
    const validatedData = generateInvoicesSchema.parse({ body: req.body });
    
    // 🟢 FIX: Changed req.user to res.locals.user (Stops 500 Internal Server Crash)
    const organizationId = res.locals.user.organizationId;
    const userId = res.locals.user.id;
    
    // Ab validated body use hogi
    const filters = validatedData.body; 

    const result = await generateInvoicesService(
      organizationId,
      userId,
      filters
    );

    res.status(200).json(result);
  } catch (error) {
    // Passes any errors (like our AppError for concurrency) to global error handler
    next(error); 
  }
};
