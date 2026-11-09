import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { patientLabel } from '../provider-portal/provider-portal.format';

const splitName = (full: string): { firstName: string; lastName: string | null } => {
  const [first, ...rest] = full.trim().split(/\s+/);
  return { firstName: first || 'Patient', lastName: rest.join(' ') || null };
};

const newTemporaryPassword = async () => {
  const temporaryPassword = crypto.randomBytes(12).toString('base64url');
  return { temporaryPassword, passwordHash: await bcrypt.hash(temporaryPassword, 12) };
};

const audit = (organizationId: string, actorId: string, action: string, projectId: string) =>
  prisma.auditLog.create({
    data: { organizationId, userId: actorId, action, entityType: 'PROJECT', entityId: projectId, details: {} },
  });

/**
 * Gives the patient of a CASE a portal login. If a patient login with this email already exists in the
 * organization (same patient, several cases) the case is simply linked to it.
 */
export const grantPortalAccess = async (projectId: string, organizationId: string, actorId: string, rawEmail: string) => {
  const email = rawEmail.trim().toLowerCase();
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true, name: true, patientName: true, patientUserId: true },
  });
  if (!project) throw new NotFoundError('Case not found');

  if (project.patientUserId) {
    const current = await prisma.user.findUnique({ where: { id: project.patientUserId } });
    if (current && current.isActive) throw new ConflictError('This case already has portal access.');
    // A previously revoked login is re-enabled with a fresh temporary password.
    const { temporaryPassword, passwordHash } = await newTemporaryPassword();
    await prisma.user.update({
      where: { id: project.patientUserId },
      data: { isActive: true, passwordHash, requirePasswordChange: true },
    });
    await audit(organizationId, actorId, 'PORTAL_ACCESS_GRANTED', project.id);
    return { projectId: project.id, email: current?.email ?? email, temporaryPassword };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== Role.PATIENT || existing.organizationId !== organizationId) {
      throw new ConflictError('A user account with this email already exists. Use a different email for portal access.');
    }
    let temporaryPassword: string | null = null;
    if (!existing.isActive) {
      const t = await newTemporaryPassword();
      temporaryPassword = t.temporaryPassword;
      await prisma.user.update({
        where: { id: existing.id },
        data: { isActive: true, passwordHash: t.passwordHash, requirePasswordChange: true },
      });
    }
    await prisma.project.update({ where: { id: project.id }, data: { patientUserId: existing.id } });
    await audit(organizationId, actorId, 'PORTAL_ACCESS_GRANTED', project.id);
    return { projectId: project.id, email, temporaryPassword };
  }

  const { temporaryPassword, passwordHash } = await newTemporaryPassword();
  const { firstName, lastName } = splitName(patientLabel(project));
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone: '0000000000',
        passwordHash,
        role: Role.PATIENT,
        requirePasswordChange: true,
        organizationId,
      },
    });
    await tx.project.update({ where: { id: project.id }, data: { patientUserId: user.id } });
  });
  await audit(organizationId, actorId, 'PORTAL_ACCESS_GRANTED', project.id);
  return { projectId: project.id, email, temporaryPassword };
};

/** Unlinks the case. If the patient has no other case, the login is deactivated and signed out everywhere. */
export const revokePortalAccess = async (projectId: string, organizationId: string, actorId: string) => {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
    select: { id: true, patientUserId: true },
  });
  if (!project || !project.patientUserId) throw new NotFoundError('This case has no portal access');

  const userId = project.patientUserId;
  await prisma.project.update({ where: { id: project.id }, data: { patientUserId: null } });

  const remaining = await prisma.project.count({ where: { patientUserId: userId } });
  if (remaining === 0) {
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { isActive: false } }),
      prisma.session.deleteMany({ where: { userId } }),
    ]);
  }
  await audit(organizationId, actorId, 'PORTAL_ACCESS_REVOKED', project.id);
  return { projectId: project.id, loginDeactivated: remaining === 0 };
};
