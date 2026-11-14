import type { PrismaClient } from '@prisma/client';
import { actorStorage } from '../../utils/request-context';

/**
 * Captures EVERY change to a time entry (create / edit / move to another task or plan / approve / reject / delete),
 * no matter which controller, service, transaction or bulk update performs it. It runs as a Prisma client
 * extension (see config/prisma.ts), so there is a single choke point instead of 13 call sites.
 *
 * Each change is written to `time_entry_changes` and the affected month is flagged in `billing_sheet_dirty`
 * so the external sheet is refreshed. Failures here are logged but never block the user's action.
 */
export interface Snap {
  id: string;
  organizationId: string;
  date: Date;
  hours: number;
  rate: number | null;
  amount: number | null;
  status: string;
  isBillable: boolean;
  description: string | null;
  projectId: string;
  projectName: string;
  patientName: string | null;
  taskId: string | null;
  taskName: string | null;
  userId: string;
  staffName: string;
}

export interface ChangeDraft {
  action: string;
  summary: string;
  fromValue: string | null;
  toValue: string | null;
}

type RawEntry = Record<string, any>;

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
export const monthKeyOf = (d: Date): string => d.toISOString().slice(0, 7);
const ymd = (d: Date): string => d.toISOString().slice(0, 10);

/** Pure: what changed between two snapshots, as one draft per kind of change. */
export const diffSnaps = (before: Snap | null, after: Snap | null): ChangeDraft[] => {
  const out: ChangeDraft[] = [];
  const label = (s: Snap) => `${r2(s.hours)} h by ${s.staffName} on ${ymd(s.date)} - ${s.projectName} / ${s.taskName ?? '(no task)'}`;

  if (!before && after) {
    out.push({ action: 'CREATED', summary: `Entry created (${after.status}): ${label(after)}`, fromValue: null, toValue: after.status });
    return out;
  }
  if (before && !after) {
    out.push({ action: 'DELETED', summary: `Entry deleted: ${label(before)}`, fromValue: before.status, toValue: null });
    return out;
  }
  if (!before || !after) return out;

  if (before.projectId !== after.projectId) {
    out.push({ action: 'MOVED_PLAN', summary: `Moved to another plan: "${before.projectName}" -> "${after.projectName}"`, fromValue: before.projectName, toValue: after.projectName });
  }
  if (before.taskId !== after.taskId) {
    out.push({ action: 'MOVED_TASK', summary: `Moved to another task: "${before.taskName ?? '(no task)'}" -> "${after.taskName ?? '(no task)'}"`, fromValue: before.taskName ?? '(no task)', toValue: after.taskName ?? '(no task)' });
  }
  if (before.status !== after.status) {
    const action =
      after.status === 'APPROVED' ? 'APPROVED'
      : after.status === 'REJECTED' ? 'REJECTED'
      : before.status === 'REJECTED' && after.status === 'PENDING' ? 'RESUBMITTED'
      : 'STATUS_CHANGED';
    out.push({ action, summary: `Status ${before.status} -> ${after.status}`, fromValue: before.status, toValue: after.status });
  }

  const from: string[] = [];
  const to: string[] = [];
  const note: string[] = [];
  const track = (name: string, a: string, b: string) => { note.push(`${name} ${a} -> ${b}`); from.push(`${name}: ${a}`); to.push(`${name}: ${b}`); };
  if (r2(before.hours) !== r2(after.hours)) track('hours', String(r2(before.hours)), String(r2(after.hours)));
  if (ymd(before.date) !== ymd(after.date)) track('date', ymd(before.date), ymd(after.date));
  if ((before.rate ?? null) !== (after.rate ?? null)) track('rate', String(before.rate ?? '-'), String(after.rate ?? '-'));
  if (before.isBillable !== after.isBillable) track('billable', String(before.isBillable), String(after.isBillable));
  if (before.userId !== after.userId) track('staff', before.staffName, after.staffName);
  if ((before.description ?? '') !== (after.description ?? '')) track('description', before.description ?? '', after.description ?? '');
  if (note.length) out.push({ action: 'UPDATED', summary: `Edited: ${note.join('; ')}`, fromValue: from.join(' | '), toValue: to.join(' | ') });

  return out;
};

const decorate = async (base: PrismaClient, rows: RawEntry[]): Promise<Snap[]> => {
  if (rows.length === 0) return [];
  const ids = (key: string) => Array.from(new Set(rows.map((r) => r[key]).filter(Boolean))) as string[];
  const [projects, tasks, users] = await Promise.all([
    base.project.findMany({ where: { id: { in: ids('projectId') } }, select: { id: true, name: true, patientName: true } }),
    base.task.findMany({ where: { id: { in: ids('taskId') } }, select: { id: true, name: true } }),
    base.user.findMany({ where: { id: { in: ids('userId') } }, select: { id: true, firstName: true, lastName: true } }),
  ]);
  const pm = new Map(projects.map((p) => [p.id, p]));
  const tm = new Map(tasks.map((t) => [t.id, t]));
  const um = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => {
    const p = pm.get(r.projectId);
    const u = um.get(r.userId);
    return {
      id: r.id ?? '',
      organizationId: r.organizationId,
      date: new Date(r.date),
      hours: num(r.duration),
      rate: numOrNull(r.hourlyRate),
      amount: numOrNull(r.billableAmount),
      status: String(r.approvalStatus ?? 'PENDING'),
      isBillable: r.isBillable !== false,
      description: r.description ?? null,
      projectId: r.projectId,
      projectName: p?.name ?? r.projectId,
      patientName: p?.patientName ?? (p?.name ? p.name.split(' - ')[0].trim() : null),
      taskId: r.taskId ?? null,
      taskName: r.taskId ? tm.get(r.taskId)?.name ?? r.taskId : null,
      userId: r.userId,
      staffName: u ? `${u.firstName} ${u.lastName ?? ''}`.trim() : r.userId,
    };
  });
};

const snapJson = (s: Snap | null) =>
  s ? { id: s.id, date: ymd(s.date), hours: s.hours, rate: s.rate, status: s.status, plan: s.projectName, task: s.taskName, staff: s.staffName, billable: s.isBillable, description: s.description } : null;

const record = async (base: PrismaClient, pairs: Array<{ before: Snap | null; after: Snap | null }>) => {
  const actor = actorStorage.getStore();
  const dirty = new Map<string, Set<string>>();
  const rows: any[] = [];

  for (const { before, after } of pairs) {
    const ref = after ?? before;
    if (!ref) continue;
    for (const month of [before, after].filter(Boolean).map((s) => monthKeyOf((s as Snap).date))) {
      if (!dirty.has(ref.organizationId)) dirty.set(ref.organizationId, new Set());
      dirty.get(ref.organizationId)!.add(month);
    }
    for (const d of diffSnaps(before, after)) {
      rows.push({
        organizationId: ref.organizationId,
        timeEntryId: ref.id,
        action: d.action,
        summary: d.summary,
        fromValue: d.fromValue,
        toValue: d.toValue,
        actorUserId: actor?.userId ?? null,
        actorName: actor?.name ?? null,
        patientName: ref.patientName,
        planName: ref.projectName,
        taskName: ref.taskName,
        staffName: ref.staffName,
        entryDate: ref.date,
        hours: r2(ref.hours),
        monthKey: monthKeyOf(ref.date),
        before: snapJson(before) as any,
        after: snapJson(after) as any,
      });
    }
  }

  if (rows.length) await base.timeEntryChange.createMany({ data: rows });
  for (const [organizationId, months] of dirty) {
    for (const monthKey of months) {
      await base.billingSheetDirty.upsert({
        where: { organizationId_monthKey: { organizationId, monthKey } },
        update: { requestedAt: new Date() },
        create: { organizationId, monthKey },
      });
    }
  }
};

/** Keeps only plain scalar assignments from an updateMany `data` object (used to predict the new values). */
const plainScalars = (data: any): RawEntry => {
  const out: RawEntry = {};
  for (const [k, v] of Object.entries(data ?? {})) {
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v) || v instanceof Date) out[k] = v;
    else if (v && typeof v === 'object' && 'set' in (v as any)) out[k] = (v as any).set;
  }
  return out;
};

const WATCHED = new Set(['create', 'createMany', 'createManyAndReturn', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany']);

export const captureTimeEntryMutation = async (
  base: PrismaClient,
  operation: string,
  args: any,
  query: (a: any) => Promise<any>
) => {
  if (!WATCHED.has(operation)) return query(args);

  let beforeRaw: RawEntry[] = [];
  try {
    if (operation === 'update' || operation === 'delete' || operation === 'upsert') {
      const row = await base.timeEntry.findUnique({ where: args.where });
      if (row) beforeRaw = [row];
    } else if (operation === 'updateMany' || operation === 'deleteMany') {
      beforeRaw = await base.timeEntry.findMany({ where: args.where ?? {}, take: 5000 });
    }
  } catch (err) {
    console.error('[billing-sheet] could not read the entry before the change', err);
  }

  const result = await query(args);

  try {
    let pairsRaw: Array<{ before: RawEntry | null; after: RawEntry | null }> = [];
    switch (operation) {
      case 'create':
        pairsRaw = [{ before: null, after: result }];
        break;
      case 'createManyAndReturn':
        pairsRaw = (result as RawEntry[]).map((r) => ({ before: null, after: r }));
        break;
      case 'createMany': {
        const data: RawEntry[] = Array.isArray(args.data) ? args.data : [args.data];
        pairsRaw = data.map((d) => ({ before: null, after: { ...d, id: '' } }));
        break;
      }
      case 'update':
      case 'upsert':
        pairsRaw = [{ before: beforeRaw[0] ?? null, after: result }];
        break;
      case 'updateMany': {
        const patch = plainScalars(args.data);
        pairsRaw = beforeRaw.map((b) => ({ before: b, after: { ...b, ...patch } }));
        break;
      }
      case 'delete':
        pairsRaw = [{ before: beforeRaw[0] ?? (result as RawEntry), after: null }];
        break;
      case 'deleteMany':
        pairsRaw = beforeRaw.map((b) => ({ before: b, after: null }));
        break;
    }

    const all = pairsRaw.flatMap((p) => [p.before, p.after].filter(Boolean) as RawEntry[]);
    const snaps = await decorate(base, all);
    let i = 0;
    const pairs = pairsRaw.map((p) => ({
      before: p.before ? snaps[i++] : null,
      after: p.after ? snaps[i++] : null,
    }));
    await record(base, pairs);
  } catch (err) {
    console.error('[billing-sheet] FAILED to record a time entry change', err);
  }

  return result;
};
