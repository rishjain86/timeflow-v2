import { Prisma, AuthorizationStatus } from '@prisma/client';
import prisma from '../../lib/prisma';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/errors';

// ==========================================
// Helper Functions
// ==========================================

/**
 * Normalizes an authorization number to ensure consistency.
 * Example: " auth-001 " -> "AUTH-001"
 */
const normalizeAuthNumber = (authNumber: string): string => {
  return authNumber.trim().toUpperCase().replace(/\s+/g, ' ');
};

// ==========================================
// Service Methods
// ==========================================

export interface CreateAuthorizationDTO {
  authNumber: string;
  startDate: string;
  endDate: string;
  projectId: string;
  status?: AuthorizationStatus;
  limits?: { serviceCodeId: string; approvedUnits: number }[]; // SPRINT 3 ADDITION
}

export const createAuthorization = async (
  organizationId: string,
  data: CreateAuthorizationDTO
) => {
  const normalizedAuthNumber = normalizeAuthNumber(data.authNumber);

  try {
    // Use Transaction for complete ACID compliance
    return await prisma.$transaction(async (tx) => {
      // 1. Verify Project belongs to the organization
      const project = await tx.project.findFirst({
        where: { id: data.projectId, organizationId },
      });
      
      if (!project) {
        throw new NotFoundError('Project not found or does not belong to your organization');
      }

      // SPRINT 3: Verify Service Codes if limits are provided
      if (data.limits && data.limits.length > 0) {
        const serviceCodeIds = data.limits.map((l) => l.serviceCodeId);
        const serviceCodes = await tx.serviceCode.findMany({
          where: { id: { in: serviceCodeIds }, organizationId },
        });

        if (serviceCodes.length !== serviceCodeIds.length) {
          throw new ValidationError('One or more Service Codes are invalid or do not belong to your organization');
        }
      }

      // 2. Enforce Composite Uniqueness (authNumber + organizationId) - Soft check
      const existingAuth = await tx.authorization.findUnique({
        where: {
          organizationId_authNumber: {
            organizationId,
            authNumber: normalizedAuthNumber,
          },
        },
      });
      
      if (existingAuth) {
        throw new ConflictError(`Authorization number '${normalizedAuthNumber}' already exists in your organization`);
      }

      // 3. Create Authorization securely within the transaction
      const authorization = await tx.authorization.create({
        data: {
          authNumber: normalizedAuthNumber,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          status: data.status || 'ACTIVE',
          projectId: data.projectId,
          organizationId,
          // SPRINT 3 ADDITION
          limits: {
            create: data.limits?.map((limit) => ({
              serviceCodeId: limit.serviceCodeId,
              approvedUnits: limit.approvedUnits,
            })) || [],
          },
        },
        include: {
          limits: {
            include: { serviceCode: true },
          },
        },
      });
      
      return authorization;
    });
  } catch (error) {
    // P2002: Hard database unique constraint violation (Race condition fallback)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(`Authorization number '${normalizedAuthNumber}' already exists in your organization`);
    }
    throw error;
  }
};

export interface UpdateAuthorizationDTO {
  authNumber?: string;
  startDate?: string;
  endDate?: string;
  status?: AuthorizationStatus;
}

export const updateAuthorization = async (
  id: string,
  organizationId: string,
  data: UpdateAuthorizationDTO
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current authorization to ensure it exists and belongs to the org
      const existingAuth = await tx.authorization.findFirst({
        where: { id, organizationId },
      });
      
      if (!existingAuth) {
        throw new NotFoundError('Authorization not found');
      }
      
      const updates: Prisma.AuthorizationUpdateInput = {};
      
      // 2. Handle Auth Number Normalization & Uniqueness Check
      if (data.authNumber) {
        const normalizedAuthNumber = normalizeAuthNumber(data.authNumber);
        
        if (normalizedAuthNumber !== existingAuth.authNumber) {
          const duplicateCheck = await tx.authorization.findUnique({
            where: {
              organizationId_authNumber: {
                organizationId,
                authNumber: normalizedAuthNumber,
              },
            },
          });
          
          if (duplicateCheck) {
            throw new ConflictError(`Authorization number '${normalizedAuthNumber}' already exists in your organization`);
          }
          updates.authNumber = normalizedAuthNumber;
        }
      }
      
      // 3. Handle Date Cross-Validation against existing state
      const newStartDate = data.startDate ? new Date(data.startDate) : existingAuth.startDate;
      const newEndDate = data.endDate ? new Date(data.endDate) : existingAuth.endDate;
      
      if (newStartDate > newEndDate) {
        throw new ValidationError('End date must be greater than or equal to start date');
      }
      
      if (data.startDate) updates.startDate = newStartDate;
      if (data.endDate) updates.endDate = newEndDate;
      if (data.status) updates.status = data.status;
      
      // 4. Update the record within the transaction
      const updatedAuthorization = await tx.authorization.update({
        where: { id },
        data: updates,
      });
      
      return updatedAuthorization;
    });
  } catch (error) {
    // P2002: Hard database unique constraint violation (Race condition fallback)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('This authorization number is already in use in your organization');
    }
    throw error;
  }
};

export interface GetAuthorizationsQuery {
  page: number;
  limit: number;
  projectId?: string;
  status?: AuthorizationStatus;
  search?: string;
}

export const getAuthorizations = async (
  organizationId: string,
  query: GetAuthorizationsQuery
) => {
  const { page, limit, projectId, status, search } = query;
  
  const where: Prisma.AuthorizationWhereInput = {
    organizationId,
  };
  
  if (projectId) where.projectId = projectId;
  if (status) where.status = status;
  
  if (search) {
    const normalizedSearch = normalizeAuthNumber(search);
    where.OR = [
      { authNumber: { contains: normalizedSearch, mode: 'insensitive' } },
      { project: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  
  const skip = (page - 1) * limit;
  
  const [authorizations, totalCount] = await Promise.all([
    prisma.authorization.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
        _count: { select: { fundingSources: true } },
        limits: { include: { serviceCode: true } }, // SPRINT 3 ADDITION
      },
    }),
    prisma.authorization.count({ where }),
  ]);
  
  return {
    data: authorizations,
    meta: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};

export const getAuthorizationById = async (id: string, organizationId: string) => {
  const authorization = await prisma.authorization.findFirst({
    where: { id, organizationId },
    include: {
      project: {
        select: { id: true, name: true, client: { select: { id: true, name: true } } },
      },
      fundingSources: {
        include: { budget: true }, // Bring in the budget limits for each funding source
      },
      limits: { include: { serviceCode: true } }, // SPRINT 3 ADDITION
    },
  });
  
  if (!authorization) {
    throw new NotFoundError('Authorization not found');
  }
  
  return authorization;
};

// ==========================================
// SPRINT 3 ADDITION: Add Limits
// ==========================================

export const addAuthorizationLimit = async (
  id: string,
  organizationId: string,
  data: { serviceCodeId: string; approvedUnits: number }
) => {
  const auth = await prisma.authorization.findFirst({
    where: { id, organizationId },
  });

  if (!auth) {
    throw new NotFoundError('Authorization not found');
  }

  const serviceCode = await prisma.serviceCode.findFirst({
    where: { id: data.serviceCodeId, organizationId },
  });

  if (!serviceCode) {
    throw new NotFoundError('Service Code not found in your organization');
  }

  const existingLimit = await prisma.authorizationLimit.findUnique({
    where: {
      authorizationId_serviceCodeId: {
        authorizationId: id,
        serviceCodeId: data.serviceCodeId,
      },
    },
  });

  if (existingLimit) {
    throw new ConflictError('A limit for this service code already exists on this authorization. Please update it instead.');
  }

  return prisma.authorizationLimit.create({
    data: {
      authorizationId: id,
      serviceCodeId: data.serviceCodeId,
      approvedUnits: data.approvedUnits,
    },
    include: {
      serviceCode: true,
    },
  });
};
