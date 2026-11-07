import { AppointmentStatus, InvoiceStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ForbiddenError } from '../../utils/errors';
import { longDay, shortDate, timeLabel } from '../provider-portal/provider-portal.format';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The one client record a patient login is linked to. Every query below is pinned to it. */
const resolveSelf = async (userId: string, organizationId: string) => {
  const client = await prisma.client.findFirst({
    where: { userId, organizationId, isActive: true },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!client) throw new ForbiddenError('Your account is not linked to a patient record');
  return client;
};

const getTimeZone = async (organizationId: string): Promise<string> => {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { timeZone: true } });
  return org?.timeZone || 'UTC';
};

export const getMyProfile = async (userId: string, organizationId: string) => {
  const c = await resolveSelf(userId, organizationId);
  return { name: c.name, email: c.email, phone: c.phone };
};

export const getMyAppointments = async (userId: string, organizationId: string) => {
  const self = await resolveSelf(userId, organizationId);
  const tz = await getTimeZone(organizationId);
  const now = new Date();

  const rows = await prisma.appointment.findMany({
    where: { organizationId, clientId: self.id, startTime: { gte: new Date(now.getTime() - 90 * DAY_MS) } },
    orderBy: { startTime: 'asc' },
    take: 200,
    select: {
      id: true,
      startTime: true,
      endTime: true,
      status: true,
      modality: true,
      serviceCode: { select: { code: true, description: true } },
      therapist: { select: { user: { select: { firstName: true, lastName: true } } } },
    },
  });

  const shape = (a: (typeof rows)[number]) => ({
    id: a.id,
    type: a.serviceCode?.description?.trim() || a.serviceCode?.code || 'Session',
    provider: `${a.therapist.user.firstName} ${a.therapist.user.lastName ?? ''}`.trim(),
    date: longDay(a.startTime, tz),
    time: `${timeLabel(a.startTime, tz)} - ${timeLabel(a.endTime, tz)}`,
    modality: a.modality === 'TELEHEALTH' ? 'Telehealth' : 'In-Person',
    status:
      a.status === AppointmentStatus.CANCELLED || a.status === AppointmentStatus.NO_SHOW
        ? 'CANCELLED'
        : a.status === AppointmentStatus.COMPLETED
        ? 'COMPLETED'
        : 'SCHEDULED',
  });

  const isUpcoming = (a: (typeof rows)[number]) =>
    a.endTime >= now && a.status !== AppointmentStatus.COMPLETED && a.status !== AppointmentStatus.CANCELLED && a.status !== AppointmentStatus.NO_SHOW;

  return {
    upcoming: rows.filter(isUpcoming).map(shape),
    past: rows.filter((a) => !isUpcoming(a)).reverse().map(shape),
  };
};

export const getMyBilling = async (userId: string, organizationId: string) => {
  const self = await resolveSelf(userId, organizationId);
  const tz = await getTimeZone(organizationId);
  const now = new Date();

  // Patients never see drafts or cancelled invoices.
  const invoices = await prisma.invoice.findMany({
    where: {
      organizationId,
      clientId: self.id,
      status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.OVERDUE] },
    },
    orderBy: { issueDate: 'desc' },
    take: 100,
    select: {
      id: true,
      invoiceNumber: true,
      issueDate: true,
      dueDate: true,
      status: true,
      totalAmount: true,
      balanceDue: true,
      items: { select: { description: true }, take: 1 },
    },
  });

  const unpaid = invoices.filter((i) => i.status !== InvoiceStatus.PAID);
  const totalOutstanding = unpaid.reduce((sum, i) => sum + Number(i.balanceDue), 0);
  const dueDates = unpaid.map((i) => i.dueDate).filter((d): d is Date => !!d).sort((a, b) => a.getTime() - b.getTime());

  return {
    summary: {
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      nextPaymentDueDate: dueDates.length ? shortDate(dueDates[0], tz) : null,
    },
    invoices: invoices.map((i) => ({
      id: i.id,
      date: shortDate(i.issueDate, tz),
      description: i.items[0]?.description || `Invoice ${i.invoiceNumber}`,
      amount: Number(i.totalAmount),
      status:
        i.status === InvoiceStatus.PAID
          ? 'PAID'
          : i.status === InvoiceStatus.OVERDUE || (i.dueDate && i.dueDate < now)
          ? 'OVERDUE'
          : 'PENDING',
      dueDate: i.dueDate ? shortDate(i.dueDate, tz) : '-',
    })),
  };
};
