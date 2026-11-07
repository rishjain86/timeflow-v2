import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';

const splitName = (full: string): { firstName: string; lastName: string | null } => {
  const [first, ...rest] = full.trim().split(/\s+/);
  return { firstName: first || 'Patient', lastName: rest.join(' ') || null };
};

/** Creates (or re-enables) a PATIENT login linked to a client record. Returns a one-time temporary password. */
export const grantPortalAccess = async (clientId: string, organizationId: string, actorId: string) => {
  const client = await prisma.client.findFirst({ where: { id: clientId, organizationId } });
  if (!client) throw new NotFoundError('Client not found');
  if (!client.email) throw new BadRequestError('The client needs an email address before portal access can be granted.');

  const temporaryPassword = crypto.randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  if (client.userId) {
    const existing = await prisma.user.findUnique({ where: { id: client.userId } });
    if (existing && existing.isActive) throw new ConflictError('This client already has portal access.');
    // Re-enable a previously revoked login with a fresh temporary password.
    await prisma.user.update({
      where: { id: client.userId },
      data: { isActive: true, passwordHash, requirePasswordChange: true },
    });
  } else {
    const clash = await prisma.user.findUnique({ where: { email: client.email } });
    if (clash) {
      throw new ConflictError('A user account with this email already exists. Use a different email for portal access.');
    }
    const { firstName, lastName } = splitName(client.name);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: client.email!,
          phone: client.phone || '0000000000',
          passwordHash,
          role: Role.PATIENT,
          requirePasswordChange: true,
          organizationId,
        },
      });
      await tx.client.update({ where: { id: client.id }, data: { userId: user.id } });
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId: actorId,
      action: 'PORTAL_ACCESS_GRANTED',
      entityType: 'CLIENT',
      entityId: client.id,
      details: {},
    },
  });

  return { clientId: client.id, email: client.email, temporaryPassword };
};

/** Deactivates the patient's login and signs them out everywhere. The record and history are kept. */
export const revokePortalAccess = async (clientId: string, organizationId: string, actorId: string) => {
  const client = await prisma.client.findFirst({ where: { id: clientId, organizationId } });
  if (!client || !client.userId) throw new NotFoundError('This client has no portal access');

  await prisma.$transaction([
    prisma.user.update({ where: { id: client.userId }, data: { isActive: false } }),
    prisma.session.deleteMany({ where: { userId: client.userId } }),
    prisma.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: 'PORTAL_ACCESS_REVOKED',
        entityType: 'CLIENT',
        entityId: client.id,
        details: {},
      },
    }),
  ]);
  return { clientId: client.id };
};
