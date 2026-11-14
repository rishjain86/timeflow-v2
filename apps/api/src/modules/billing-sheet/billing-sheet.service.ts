import { TimeEntryApprovalStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { NotFoundError } from '../../utils/errors';
import {
  EntryInput,
  ManualCells,
  buildChangesTable,
  buildEntriesTable,
  buildSummary,
  manualKey,
  monthBounds,
  monthKeyOf,
  toCsv,
} from './billing-sheet.builder';

const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Approved entries of one month (by the entry's own date, not the time it was typed in). */
export const loadMonthEntries = async (organizationId: string, monthKey: string): Promise<EntryInput[]> => {
  const { start, end } = monthBounds(monthKey);
  const rows = await prisma.timeEntry.findMany({
    where: { organizationId, approvalStatus: TimeEntryApprovalStatus.APPROVED, date: { gte: start, lt: end } },
    include: {
      project: {
        select: {
          id: true, name: true, patientName: true, hcaiNumber: true,
          assignedTo: { select: { firstName: true, lastName: true } },
        },
      },
      task: { select: { id: true, name: true } },
      user: { select: { firstName: true, lastName: true, role: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    date: r.date,
    hours: Number(r.duration),
    rate: n(r.hourlyRate),
    amount: n(r.billableAmount),
    isBillable: r.isBillable,
    description: r.description,
    projectId: r.projectId,
    planName: r.project.name,
    patientName: r.project.patientName?.trim() || r.project.name.split(' - ')[0].trim(),
    hcaiNumber: r.project.hcaiNumber ?? null,
    assignedTo: r.project.assignedTo ? `${r.project.assignedTo.firstName} ${r.project.assignedTo.lastName ?? ''}`.trim() : null,
    taskId: r.taskId,
    taskName: r.task?.name ?? null,
    staffName: `${r.user.firstName} ${r.user.lastName ?? ''}`.trim(),
    staffRole: r.user.role,
  }));
};

export const loadManual = async (organizationId: string, monthKey: string): Promise<Map<string, ManualCells>> => {
  const rows = await prisma.billingSheetManual.findMany({ where: { organizationId, monthKey } });
  return new Map(
    rows.map((m) => [
      manualKey(m.projectId, m.taskId || null),
      { prevPayHours: n(m.prevPayHours), invoiceNumber: m.invoiceNumber, invoiceAmount: n(m.invoiceAmount), notes: m.notes },
    ])
  );
};

export const loadChanges = async (organizationId: string, monthKey: string) => {
  const rows = await prisma.timeEntryChange.findMany({
    where: { organizationId, monthKey },
    orderBy: { occurredAt: 'desc' },
    take: 5000,
  });
  return rows.map((c) => ({
    occurredAt: c.occurredAt,
    actorName: c.actorName,
    action: c.action,
    patientName: c.patientName,
    planName: c.planName,
    taskName: c.taskName,
    staffName: c.staffName,
    entryDate: c.entryDate,
    hours: n(c.hours),
    summary: c.summary,
    fromValue: c.fromValue,
    toValue: c.toValue,
    timeEntryId: c.timeEntryId,
  }));
};

export const getBillingSheet = async (organizationId: string, monthKey: string) => {
  const [entries, manual, changes] = await Promise.all([
    loadMonthEntries(organizationId, monthKey),
    loadManual(organizationId, monthKey),
    loadChanges(organizationId, monthKey),
  ]);
  const summary = buildSummary(entries, manual);
  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const totalAmount = summary.planTotals.reduce((s, p) => s + p.amount, 0);
  return {
    month: monthKey,
    entries: buildEntriesTable(entries),
    summary: summary.table,
    summaryKeys: summary.keys,
    planTotals: summary.planTotals,
    changes: buildChangesTable(changes),
    totals: {
      entryCount: entries.length,
      hours: Math.round(totalHours * 100) / 100,
      amount: Math.round(totalAmount * 100) / 100,
      changeCount: changes.length,
    },
  };
};

export const getMonths = async (organizationId: string): Promise<string[]> => {
  const groups = await prisma.timeEntryChange.groupBy({ by: ['monthKey'], where: { organizationId } });
  const set = new Set(groups.map((g) => g.monthKey));
  const now = new Date();
  set.add(monthKeyOf(now));
  set.add(monthKeyOf(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))));
  return [...set].sort().reverse();
};

export const exportCsv = async (organizationId: string, monthKey: string, tab: 'entries' | 'summary' | 'changes'): Promise<string> => {
  const sheet = await getBillingSheet(organizationId, monthKey);
  return toCsv(sheet[tab]);
};

export interface ManualInput {
  month: string;
  projectId: string;
  taskId: string | null;
  prevPayHours?: number | null;
  invoiceNumber?: string | null;
  invoiceAmount?: number | null;
  notes?: string | null;
}

/** Saves the hand-filled cells for one summary row. They are never touched by automatic updates. */
export const saveManual = async (
  organizationId: string,
  actor: { id: string; name: string | null },
  input: ManualInput
) => {
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, organizationId },
    select: { id: true, name: true, patientName: true },
  });
  if (!project) throw new NotFoundError('Plan not found');

  const taskId = input.taskId ?? '';
  const connection = await prisma.billingSheetConnection.findUnique({ where: { organizationId } });
  const where = { organizationId_monthKey_projectId_taskId: { organizationId, monthKey: input.month, projectId: project.id, taskId } };
  const existing = await prisma.billingSheetManual.findUnique({ where });

  const data = {
    ...(input.prevPayHours !== undefined && { prevPayHours: input.prevPayHours }),
    ...(input.invoiceNumber !== undefined && { invoiceNumber: input.invoiceNumber }),
    ...(input.invoiceAmount !== undefined && { invoiceAmount: input.invoiceAmount }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(connection?.enabled && { pendingPush: true }),
    updatedById: actor.id,
  };
  const saved = await prisma.billingSheetManual.upsert({
    where,
    update: data,
    create: { organizationId, monthKey: input.month, projectId: project.id, taskId, ...data },
  });

  const changed = (Object.keys(data) as Array<keyof typeof data>)
    .filter((k) => k !== 'updatedById' && k !== 'pendingPush')
    .map((k) => `${k}: ${String((existing as any)?.[k] ?? '-')} -> ${String((saved as any)[k] ?? '-')}`);
  const task = input.taskId ? await prisma.task.findFirst({ where: { id: input.taskId, organizationId }, select: { name: true } }) : null;

  await prisma.timeEntryChange.create({
    data: {
      organizationId,
      timeEntryId: '',
      action: 'MANUAL_EDIT',
      summary: `Sheet cells edited: ${changed.join('; ') || 'no change'}`,
      fromValue: null,
      toValue: null,
      actorUserId: actor.id,
      actorName: actor.name,
      patientName: project.patientName ?? project.name.split(' - ')[0].trim(),
      planName: project.name,
      taskName: task?.name ?? null,
      monthKey: input.month,
    },
  });
  await prisma.billingSheetDirty.upsert({
    where: { organizationId_monthKey: { organizationId, monthKey: input.month } },
    update: { requestedAt: new Date() },
    create: { organizationId, monthKey: input.month },
  });
  return saved;
};
