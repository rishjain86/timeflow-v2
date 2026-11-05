import prisma from '../../lib/prisma';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { TherapistStatus, Prisma } from '@prisma/client';

export interface CreateTherapistData {
  userId: string;
  credentialType?: string;
  licenseNumber?: string;
  npiNumber?: string;
  supervisorId?: string;
  status?: TherapistStatus;
}

export interface UpdateTherapistData {
  credentialType?: string;
  licenseNumber?: string;
  npiNumber?: string;
  supervisorId?: string | null;
  status?: TherapistStatus;
}

export interface GetTherapistsFilters {
  page: number;
  limit: number;
  status?: TherapistStatus;
  supervisorId?: string;
  credentialType?: string;
}

export const createTherapistProfile = async (
  organizationId: string,
  data: CreateTherapistData
) => {
  // Verify user exists and belongs to the same organization
  const user = await prisma.user.findFirst({
    where: { id: data.userId, organizationId },
    include: { therapistProfile: true },
  });

  if (!user) {
    throw new NotFoundError('User not found in this organization');
  }

  if (user.therapistProfile) {
    throw new BadRequestError('User already has a therapist profile');
  }

  // If a supervisor is provided, verify they exist in the same organization
  if (data.supervisorId) {
    const supervisor = await prisma.therapistProfile.findFirst({
      where: { id: data.supervisorId, organizationId },
    });
    if (!supervisor) {
      throw new NotFoundError('Supervisor profile not found in this organization');
    }
  }

  return prisma.therapistProfile.create({
    data: {
      ...data,
      organizationId,
    },
    include: {
      user: {
        select: { firstName: true, lastName: true, email: true, role: true },
      },
    },
  });
};

export const getTherapistProfiles = async (
  organizationId: string,
  filters: GetTherapistsFilters
) => {
  const { page, limit, status, supervisorId, credentialType } = filters;
  const skip = (page - 1) * limit;

  const where: Prisma.TherapistProfileWhereInput = {
    organizationId,
    ...(status && { status }),
    ...(supervisorId && { supervisorId }),
    ...(credentialType && { credentialType: { contains: credentialType, mode: 'insensitive' } }),
  };

  const [total, data] = await Promise.all([
    prisma.therapistProfile.count({ where }),
    prisma.therapistProfile.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        supervisor: {
          include: {
            user: { select: { firstName: true, lastName: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    data,
  };
};

export const getTherapistProfileById = async (
  id: string,
  organizationId: string
) => {
  const profile = await prisma.therapistProfile.findFirst({
    where: { id, organizationId },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, role: true, hourlyRate: true } },
      supervisor: {
        include: {
          user: { select: { firstName: true, lastName: true, email: true } }
        }
      },
      supervisees: {
        include: {
          user: { select: { firstName: true, lastName: true } }
        }
      }
    },
  });

  if (!profile) {
    throw new NotFoundError('Therapist profile not found');
  }

  return profile;
};

export const updateTherapistProfile = async (
  id: string,
  organizationId: string,
  data: UpdateTherapistData
) => {
  const existingProfile = await prisma.therapistProfile.findFirst({
    where: { id, organizationId },
  });

  if (!existingProfile) {
    throw new NotFoundError('Therapist profile not found');
  }

  if (data.supervisorId) {
    if (data.supervisorId === id) {
      throw new BadRequestError('A therapist cannot supervise themselves');
    }
    const supervisor = await prisma.therapistProfile.findFirst({
      where: { id: data.supervisorId, organizationId },
    });
    if (!supervisor) {
      throw new NotFoundError('Supervisor profile not found in this organization');
    }
  }

  return prisma.therapistProfile.update({
    where: { id },
    data,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });
};
