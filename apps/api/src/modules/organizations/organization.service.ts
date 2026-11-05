import prisma from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';

export const getOrganization = async (organizationId: string) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new NotFoundError('Organization not found');
  }

  return organization;
};

export const getMyOrganizations = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: true,
      memberships: {
        include: {
          organization: true,
        },
      },
    },
  });

  if (!user) return [];

  const orgsMap = new Map();

  // Add current active organization (handles orgs created during initial signup)
  if (user.organization) {
    orgsMap.set(user.organization.id, user.organization);
  }

  // Add all organizations from memberships
  user.memberships.forEach((membership) => {
    if (membership.organization) {
      orgsMap.set(membership.organization.id, membership.organization);
    }
  });

  return Array.from(orgsMap.values());
};

export const updateOrganization = async (organizationId: string, data: any) => {
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data,
  });
  return organization;
};

export const createOrganization = async (userId: string, data: any) => {
  return await prisma.$transaction(async (tx) => {
    const newOrg = await tx.organization.create({
      data: {
        name: data.name,
        companyName: data.companyName,
        defaultCurrency: data.defaultCurrency || 'USD',
        timeZone: data.timeZone || 'UTC',
        isActive: true,
      },
    });

    await tx.organizationMember.create({
      data: {
        userId: userId,
        organizationId: newOrg.id,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { organizationId: newOrg.id },
    });

    return newOrg;
  });
};

export const switchOrganization = async (userId: string, organizationId: string) => {
  // Check if user is a member OR if it's currently their active org
  const isMember = await prisma.organizationMember.findUnique({
    where: { userId_organizationId: { userId, organizationId } }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!isMember && user?.organizationId !== organizationId) {
    // If not a member, but trying to switch, let's add them to members to fix orphaned orgs
    await prisma.organizationMember.create({
      data: {
        userId,
        organizationId
      }
    });
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { organizationId },
  });
};
