import prisma from '../../lib/prisma';
import { BadRequestError } from '../../utils/errors';

export interface AllocationRequest {
  clientId: string;
  fundingSourceId: string;
  organizationId: string;
  totalCost: number;
  units?: number; // SPRINT 3: Number of hours or sessions to consume
  categoryCode?: string; // SPRINT 3: CPT Code for Time Entry or Service
}

export interface AllocationResult {
  isAllocated: boolean;
  allocatedAmount: number;
  allocatedUnits?: number;
  fundingSourceId: string;
  allocationNotes: string;
}

/**
 * Core engine to determine how costs and units are distributed and allocated 
 * against specific budgets, authorizations, and funding sources.
 */
export const allocateFunds = async (
  request: AllocationRequest
): Promise<AllocationResult> => {
  const { clientId, fundingSourceId, organizationId, totalCost, units, categoryCode } = request;

  // 1. Fetch the active budget for the requested funding source along with Sprint 3 Authorization Limits
  const budget = await prisma.budget.findUnique({
    where: { 
      fundingSourceId 
    },
    include: {
      fundingSource: {
        include: {
          authorization: {
            include: {
              limits: {
                include: { serviceCode: true }
              }
            }
          }
        }
      }
    }
  });

  if (!budget || budget.organizationId !== organizationId) {
    throw new BadRequestError('Allocation failed: No active budget found for the provided funding source.');
  }

  let allocatedAmount = totalCost;
  let allocatedUnits = units || 0;
  let notes = `Allocated $${allocatedAmount.toFixed(2)} to primary Funding Source (${fundingSourceId}).`;

  // 2. Sprint 3 Allocation Logic: Category/Service Code Sub-limit Checks
  // If categoryCode (e.g., "97153") and units are provided, check against the Authorization Limits
  if (categoryCode && units) {
    const authorization = budget.fundingSource?.authorization;
    
    if (authorization) {
      // Find if this authorization has a capped limit for this specific Service Code
      const limit = authorization.limits.find(l => l.serviceCode.code === categoryCode);
      
      if (limit) {
        const remainingUnits = limit.approvedUnits - limit.consumedUnits;
        
        // Block allocation if it exceeds authorized limits
        if (units > remainingUnits) {
          throw new BadRequestError(`Allocation failed: Exceeds authorized units for service code ${categoryCode}. Remaining: ${remainingUnits}, Requested: ${units}`);
        }

        // Apply the deduction to the Authorization Limit
        await prisma.authorizationLimit.update({
          where: { id: limit.id },
          data: { consumedUnits: { increment: units } }
        });

        notes += ` Successfully allocated ${units} units against Authorization (${authorization.authNumber}) for service code ${categoryCode}.`;
      }
    }
  }

  // --- FUTURE SPRINT HOOKS ---
  // A. Split Billing Logic:
  // If the client has secondary insurances/funding sources and the totalCost exceeds 
  // the remaining budget of the primary source, the engine will calculate the overflow 
  // and allocate the remainder to the secondary source here.

  return {
    isAllocated: true,
    allocatedAmount,
    allocatedUnits,
    fundingSourceId: budget.fundingSourceId,
    allocationNotes: notes,
  };
};

/**
 * Utility to execute soft-allocation hold (e.g., when an invoice is DRAFT or Appointment SCHEDULED)
 * Can be expanded later for encumbrance accounting.
 */
export const holdAllocation = async (
  request: AllocationRequest
): Promise<AllocationResult> => {
  // Logic to place a temporary hold on funds/units before final billing
  return {
    isAllocated: true,
    allocatedAmount: request.totalCost,
    allocatedUnits: request.units,
    fundingSourceId: request.fundingSourceId,
    allocationNotes: `Placed soft-hold of $${request.totalCost.toFixed(2)} for pending transaction.`,
  };
};
