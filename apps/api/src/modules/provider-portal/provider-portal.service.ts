import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { Actor, resolveTherapistScope } from '../appointment/appointment.access';
import { dayHeading, dueLabel, patientLabel, sessionLabel, signedLabel, timeLabel, ymd } from './provider-portal.format';

const DAY_MS = 24 * 60 * 60 * 1000;

const getTimeZone = async (organizationId: string): Promise<string> => {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timeZone: true } });
  return org?.timeZone || 'UTC';
};

const sessionType = (sc: { code: string; description: string | null } | null): string =>
  sc?.description?.trim() || sc?.code || 'Session';

/**
 * Upcoming sessions grouped by day. Therapists only receive their own caseload;
 * managers/admins receive the whole organization.
 */
export const getProviderAppointments = async (actor: Actor, organizationId: string) => {
  const scope = await resolveTherapistScope(actor, organizationId);
  const tz = await getTimeZone(organizationId);
  const now = new Date();
  const todayKey = ymd(now, tz);

  const rows = await prisma.appointment.findMany({
    where: {
      organizationId,
      ...(scope ? { therapistId: scope } : {}),
      startTime: { gte: new Date(now.getTime() - 36 * 60 * 60 * 1000), lte: new Date(now.getTime() + 30 * DAY_MS) },
    },
    orderBy: { startTime: 'asc' },
    take: 200,
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      modality: true,
      client: { select: { name: true } },
      project: { select: { name: true, patientName: true } },
      serviceCode: { select: { code: true, description: true } },
    },
  });

  const groups = new Map<string, { date: string; sessions: unknown[] }>();
  for (const a of rows) {
    const key = ymd(a.startTime, tz);
    if (key < todayKey) continue; // only today onwards
    if (!groups.has(key)) groups.set(key, { date: dayHeading(a.startTime, now, tz), sessions: [] });
    groups.get(key)!.sessions.push({
      id: a.id,
      patientName: patientLabel(a.project, a.client?.name),
      time: `${timeLabel(a.startTime, tz)} - ${timeLabel(a.endTime, tz)}`,
      type: sessionType(a.serviceCode),
      modality: a.modality === 'TELEHEALTH' ? 'Telehealth' : 'In-Person',
      status:
        a.status === AppointmentStatus.CANCELLED || a.status === AppointmentStatus.NO_SHOW ? 'CANCELLED' : 'CONFIRMED',
    });
  }

  return { upcomingAppointments: Array.from(groups.values()) };
};

/**
 * Clinical-note worklist built from finished sessions. The note text itself is never returned here.
 *  - no note yet          -> MISSING (pending)
 *  - saved, not signed    -> DRAFT   (pending)
 *  - signed by therapist  -> SIGNED  (completed)
 */
export const getProviderNotes = async (actor: Actor, organizationId: string) => {
  const scope = await resolveTherapistScope(actor, organizationId);
  const tz = await getTimeZone(organizationId);
  const now = new Date();

  const rows = await prisma.appointment.findMany({
    where: {
      organizationId,
      ...(scope ? { therapistId: scope } : {}),
      status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED] },
      endTime: { lte: now, gte: new Date(now.getTime() - 60 * DAY_MS) },
    },
    orderBy: { startTime: 'desc' },
    take: 300,
    select: {
      id: true,
      startTime: true,
      endTime: true,
      client: { select: { name: true } },
      project: { select: { name: true, patientName: true } },
      serviceCode: { select: { code: true, description: true } },
      clinicalNote: { select: { therapistSigned: true, signedAt: true, updatedAt: true } },
    },
  });

  const pending: Array<Record<string, unknown> & { _endMs: number }> = [];
  const completed: Array<Record<string, unknown>> = [];

  for (const a of rows) {
    const base = {
      id: a.id,
      patientName: patientLabel(a.project, a.client?.name),
      sessionDate: sessionLabel(a.startTime, now, tz),
      sessionType: sessionType(a.serviceCode),
    };
    if (a.clinicalNote?.therapistSigned) {
      completed.push({
        ...base,
        status: 'SIGNED',
        signedOn: signedLabel(a.clinicalNote.signedAt ?? a.clinicalNote.updatedAt, tz),
      });
    } else {
      pending.push({
        ...base,
        status: a.clinicalNote ? 'DRAFT' : 'MISSING',
        dueDate: dueLabel(a.endTime, now, tz),
        _endMs: a.endTime.getTime(),
      });
    }
  }

  pending.sort((x, y) => x._endMs - y._endMs); // most overdue first
  return {
    pendingNotes: pending.map(({ _endMs, ...rest }) => rest),
    completedNotes: completed.slice(0, 25),
  };
};
