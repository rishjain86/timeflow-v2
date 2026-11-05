import { Prisma, PayorType } from '@prisma/client';
import prisma from '../../lib/prisma';
import { NotFoundError, ConflictError } from '../../utils/errors';

export interface CreateFundingSourceDTO {
  name: string;
  payorType: PayorType;
  authorizationId: string;
}

export const createFundingSource = async (
  organizationId: string,
  data: CreateFundingSourceDTO
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify Authorization exists and belongs to the organization
      const authorization = await tx.authorization.findFirst({
        where: { id: data.authorizationId, organizationId },
      });

      if (!authorization) {
        throw new NotFoundError('Authorization not found or does not belong to your organization');
      }

      // 2. Prevent duplicate Funding Source names under the same Authorization (Soft check)
      const existingSource = await tx.fundingSource.findFirst({
        where: {
          authorizationId: data.authorizationId,
          name: { equals: data.name, mode: 'insensitive' },
        },
      });

      if (existingSource) {
        throw new ConflictError(`A funding source with the name '${data.name}' already exists for this authorization.`);
      }

      // 3. Create the Funding Source
      const fundingSource = await tx.fundingSource.create({
        data: {
          name: data.name,
          payorType: data.payorType,
          authorizationId: data.authorizationId,
          organizationId,
        },
      });

      return fundingSource;
    });
  } catch (error) {
    // P2002: Hard database unique constraint violation (Race condition fallback)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(`A funding source with the name '${data.name}' already exists for this authorization.`);
    }
    throw error;
  }
};

export interface UpdateFundingSourceDTO {
  name?: string;
  payorType?: PayorType;
}

export const updateFundingSource = async (
  id: string,
  organizationId: string,
  data: UpdateFundingSourceDTO
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify existence and ownership
      const existingSource = await tx.fundingSource.findFirst({
        where: { id, organizationId },
      });

      if (!existingSource) {
        throw new NotFoundError('Funding Source not found');
      }

      const updates: Prisma.FundingSourceUpdateInput = {};
      
      // 2. Check for duplicates if name is being updated
      if (data.name && data.name.toLowerCase() !== existingSource.name.toLowerCase()) {
        const duplicateSource = await tx.fundingSource.findFirst({
          where: {
            authorizationId: existingSource.authorizationId,
            name: { equals: data.name, mode: 'insensitive' },
          },
        });

        if (duplicateSource) {
          throw new ConflictError(`A funding source with the name '${data.name}' already exists for this authorization.`);
        }
        updates.name = data.name;
      }

      if (data.payorType) updates.payorType = data.payorType;

      // 3. Update record
      const updatedSource = await tx.fundingSource.update({
        where: { id },
        data: updates,
      });

      return updatedSource;
    });
  } catch (error) {
    // P2002: Hard database unique constraint violation (Race condition fallback)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('A funding source with this name already exists for this authorization.');
    }
    throw error;
  }
};

export interface GetFundingSourcesQuery {
  page: number;
  limit: number;
  authorizationId?: string;
  payorType?: PayorType;
  search?: string;
}

export const getFundingSources = async (
  organizationId: string,
  query: GetFundingSourcesQuery
) => {
  const { page, limit, authorizationId, payorType, search } = query;

  const where: Prisma.FundingSourceWhereInput = {
    organizationId,
  };

  if (authorizationId) where.authorizationId = authorizationId;
  if (payorType) where.payorType = payorType;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { authorization: { authNumber: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const skip = (page - 1) * limit;

  const [fundingSources, totalCount] = await Promise.all([
    prisma.fundingSource.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        authorization: { select: { id: true, authNumber: true, status: true } },
        budget: { select: { id: true, status: true, progressPercentage: true } },
      },
    }),
    prisma.fundingSource.count({ where }),
  ]);

  return {
    data: fundingSources,
    meta: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};

export const getFundingSourceById = async (id: string, organizationId: string) => {
  const fundingSource = await prisma.fundingSource.findFirst({
    where: { id, organizationId },
    include: {
      authorization: {
        select: { id: true, authNumber: true, startDate: true, endDate: true, status: true },
      },
      budget: true, // Pull in the full budget details when fetching a single source
    },
  });

  if (!fundingSource) {
    throw new NotFoundError('Funding Source not found');
  }

  return fundingSource;
};
