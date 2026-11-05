import prisma from '../../lib/prisma';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { Prisma } from '@prisma/client';

export interface CreateServiceCodeData {
  code: string;
  description?: string;
  defaultRate: number;
  isActive?: boolean;
}

export interface UpdateServiceCodeData {
  code?: string;
  description?: string;
  defaultRate?: number;
  isActive?: boolean;
}

export interface GetServiceCodesFilters {
  page: number;
  limit: number;
  isActive?: boolean;
  search?: string;
}

export const createServiceCode = async (
  organizationId: string,
  data: CreateServiceCodeData
) => {
  const existing = await prisma.serviceCode.findUnique({
    where: {
      organizationId_code: {
        organizationId,
        code: data.code,
      },
    },
  });

  if (existing) {
    throw new BadRequestError(`Service code '${data.code}' already exists in your organization`);
  }

  return prisma.serviceCode.create({
    data: {
      ...data,
      organizationId,
    },
  });
};

export const getServiceCodes = async (
  organizationId: string,
  filters: GetServiceCodesFilters
) => {
  const { page, limit, isActive, search } = filters;
  
  // Enforcing sensible pagination limits at the service level
  const validPage = Math.max(1, page);
  const validLimit = Math.max(1, limit);
  const skip = (validPage - 1) * validLimit;

  const where: Prisma.ServiceCodeWhereInput = {
    organizationId,
    ...(isActive !== undefined && { isActive }),
    ...(search && {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [total, data] = await Promise.all([
    prisma.serviceCode.count({ where }),
    prisma.serviceCode.findMany({
      where,
      skip,
      take: validLimit,
      orderBy: { code: 'asc' },
    }),
  ]);

  return {
    meta: {
      total,
      page: validPage,
      limit: validLimit,
      totalPages: Math.ceil(total / validLimit),
    },
    data,
  };
};

export const getServiceCodeById = async (id: string, organizationId: string) => {
  const serviceCode = await prisma.serviceCode.findFirst({
    where: { id, organizationId },
  });

  if (!serviceCode) {
    throw new NotFoundError('Service code not found');
  }

  return serviceCode;
};

export const updateServiceCode = async (
  id: string,
  organizationId: string,
  data: UpdateServiceCodeData
) => {
  const existing = await prisma.serviceCode.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    throw new NotFoundError('Service code not found');
  }

  // Check for unique code conflict if code is being updated
  if (data.code && data.code !== existing.code) {
    const duplicate = await prisma.serviceCode.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code: data.code,
        },
      },
    });

    if (duplicate) {
      throw new BadRequestError(`Service code '${data.code}' already exists`);
    }
  }

  return prisma.serviceCode.update({
    where: { id },
    data,
  });
};
