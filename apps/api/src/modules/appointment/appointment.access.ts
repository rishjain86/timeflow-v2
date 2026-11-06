import { Role } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ForbiddenError, NotFoundError } from '../../utils/errors';

export interface Actor {
  id: string;
  role: Role;
}

// Roles that may see every appointment in their organization. Everyone else (therapists)
// is limited to their own caseload ("minimum necessary" principle).
const ORG_WIDE_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER];

/** Returns the therapist profile id the actor is restricted to, or undefined if the actor has org-wide access. */
export const resolveTherapistScope = async (
  actor: Actor,
  organizationId: string
): Promise<string | undefined> => {
  if (ORG_WIDE_ROLES.includes(actor.role)) return undefined;

  const profile = await prisma.therapistProfile.findFirst({
    where: { userId: actor.id, organizationId },
    select: { id: true },
  });
  if (!profile) {
    throw new ForbiddenError('No therapist profile is linked to your account');
  }
  return profile.id;
};

/** Throws NotFound (never Forbidden, to avoid revealing which ids exist) unless the actor may access the appointment. */
export const assertAppointmentAccess = async (
  actor: Actor,
  organizationId: string,
  appointmentId: string
): Promise<string | undefined> => {
  const scope = await resolveTherapistScope(actor, organizationId);

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, organizationId, ...(scope ? { therapistId: scope } : {}) },
    select: { id: true },
  });
  if (!appointment) throw new NotFoundError('Appointment not found');

  return scope;
};
