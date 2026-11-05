import { Response, NextFunction } from 'express';
import { getBillingDashboardStats } from './billing-review.service';
import { AuthenticatedRequest } from '../../types/express'; // Adjust path based on your setup

// Schema ko schemas folder se import kiya gaya hai
// (Agar aapke schema mein export ka naam kuch aur hai, toh 'billingReviewQuerySchema' ko usse replace kar dena)
import { billingReviewQuerySchema } from './schemas/billing-review.schema'; 

export const getBillingReviewDashboard = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Multi-tenant security: Strict tenant isolation
    const organizationId = req.user!.organizationId;
    
    // Zod ke through schema validation
    const validatedData = billingReviewQuerySchema.parse({ query: req.query }); 
    const filters = validatedData.query;

    // Pass organizationId along with filters to the service
    const dashboardData = await getBillingDashboardStats(organizationId, filters);

    return res.status(200).json({
      success: true,
      message: 'Billing review dashboard fetched successfully',
      data: dashboardData,
    });
  } catch (error) {
    next(error);
  }
};
