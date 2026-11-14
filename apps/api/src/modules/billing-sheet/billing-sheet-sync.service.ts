import { prisma } from '../../config/prisma';
import { SheetCell, SheetProvider } from './sheet-provider';
import { SUMMARY_COLUMNS, ManualCells, manualKey } from './billing-sheet.builder';
import { getBillingSheet } from './billing-sheet.service';

/**
 * Keeps an external sheet in step with the billing sheet.
 *
 * Ownership rules (so nothing typed by hand is ever lost, and nothing is duplicated):
 *  - Entries and Change Log tabs belong entirely to the system: they are rewritten from the database.
 *  - On the Summary tab the system owns every column EXCEPT the hand-filled ones (Prev. Pay Hrs. Incl.,
 *    Invoice #, Amount $, Notes). Those are read back from the sheet before each rewrite and matched to their
 *    row by the hidden "Plan ID" / "Task ID" columns, so they stay on the right row even if the rows move,
 *    get re-sorted, or the hours change.
 *  - A value typed on the website while a sheet is connected is pushed to the sheet once (pendingPush); after
 *    that the sheet is the source again.
 */
export const SUMMARY_HEADERS = [...SUMMARY_COLUMNS, 'Plan ID', 'Task ID'];
export const tabTitles = (monthKey: string) => ({
  summary: `${monthKey} Summary`,
  entries: `${monthKey} Entries`,
  changes: `${monthKey} Change Log`,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const toNum = (v: SheetCell | undefined): number | null => {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[$,\s]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const toStr = (v: SheetCell | undefined): string | null =>
  v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim();

/** Reads the hand-filled cells of the Summary tab, keyed by plan and task. */
export const extractManual = (values: SheetCell[][]): Map<string, ManualCells> => {
  const out = new Map<string, ManualCells>();
  if (values.length < 2) return out;
  const header = values[0].map((h) => String(h ?? '').trim());
  const at = (name: string) => header.indexOf(name);
  const iPlan = at('Plan ID');
  const iTask = at('Task ID');
  if (iPlan < 0 || iTask < 0) return out;
  const iPrev = at('Prev. Pay Hrs. Incl.');
  const iInv = at('Invoice #');
  const iAmt = at('Amount $');
  const iNotes = at('Notes');
  for (const row of values.slice(1)) {
    const plan = toStr(row[iPlan]);
    if (!plan) continue;
    const task = toStr(row[iTask]);
    out.set(manualKey(plan, task), {
      prevPayHours: iPrev >= 0 ? toNum(row[iPrev]) : null,
      invoiceNumber: iInv >= 0 ? toStr(row[iInv]) : null,
      invoiceAmount: iAmt >= 0 ? toNum(row[iAmt]) : null,
      notes: iNotes >= 0 ? toStr(row[iNotes]) : null,
    });
  }
  return out;
};

const fingerprint = (m: Map<string, ManualCells>): string =>
  JSON.stringify([...m.entries()].sort(([a], [b]) => a.localeCompare(b)));

const same = (a: ManualCells, b: ManualCells): boolean =>
  a.prevPayHours === b.prevPayHours && a.invoiceNumber === b.invoiceNumber && a.invoiceAmount === b.invoiceAmount && a.notes === b.notes;
const isEmpty = (c: ManualCells): boolean => c.prevPayHours === null && c.invoiceNumber === null && c.invoiceAmount === null && c.notes === null;
const n = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/** Copies hand-typed values from the sheet into the database (the sheet wins, except for pending website edits). */
export const pullManual = async (organizationId: string, monthKey: string, fromSheet: Map<string, ManualCells>): Promise<number> => {
  if (fromSheet.size === 0) return 0;
  const existing = await prisma.billingSheetManual.findMany({ where: { organizationId, monthKey } });
  const byKey = new Map(existing.map((m) => [manualKey(m.projectId, m.taskId || null), m]));
  let changed = 0;

  for (const [key, cells] of fromSheet) {
    const [projectId, taskId] = key.split('|');
    // Keys come from a sheet that people can edit: never trust them.
    if (!UUID.test(projectId) || (taskId && !UUID.test(taskId))) continue;
    const current = byKey.get(key);
    if (current?.pendingPush) continue; // the website edit is pushed to the sheet instead
    const currentCells: ManualCells = current
      ? { prevPayHours: n(current.prevPayHours), invoiceNumber: current.invoiceNumber, invoiceAmount: n(current.invoiceAmount), notes: current.notes }
      : { prevPayHours: null, invoiceNumber: null, invoiceAmount: null, notes: null };
    if (same(currentCells, cells) || (!current && isEmpty(cells))) continue;

    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId }, select: { id: true, name: true, patientName: true } });
    if (!project) continue; // a project of another organization (or a made-up id)
    let taskName: string | null = null;
    if (taskId) {
      const task = await prisma.task.findFirst({ where: { id: taskId, organizationId, projectId }, select: { name: true } });
      if (!task) continue;
      taskName = task.name;
    }

    await prisma.billingSheetManual.upsert({
      where: { organizationId_monthKey_projectId_taskId: { organizationId, monthKey, projectId, taskId: taskId || '' } },
      update: { ...cells, updatedById: null },
      create: { organizationId, monthKey, projectId, taskId: taskId || '', ...cells, updatedById: null },
    });

    const diffs = (['prevPayHours', 'invoiceNumber', 'invoiceAmount', 'notes'] as const)
      .filter((k) => currentCells[k] !== cells[k])
      .map((k) => `${k}: ${currentCells[k] ?? '-'} -> ${cells[k] ?? '-'}`);
    await prisma.timeEntryChange.create({
      data: {
        organizationId,
        timeEntryId: '',
        action: 'MANUAL_EDIT',
        summary: `Edited in the connected sheet: ${diffs.join('; ')}`,
        actorName: 'Connected sheet',
        patientName: project.patientName ?? project.name.split(' - ')[0].trim(),
        planName: project.name,
        taskName,
        monthKey,
      },
    });
    changed++;
  }
  return changed;
};

/** Refreshes the three tabs of one month. Safe to run any number of times. */
export const syncMonth = async (provider: SheetProvider, organizationId: string, monthKey: string) => {
  const titles = tabTitles(monthKey);
  await provider.ensureTab(titles.summary);
  await provider.ensureTab(titles.entries);
  await provider.ensureTab(titles.changes);

  let before = await provider.readValues(titles.summary);
  for (let attempt = 0; ; attempt++) {
    await pullManual(organizationId, monthKey, extractManual(before));
    const pending = await prisma.billingSheetManual.findMany({ where: { organizationId, monthKey, pendingPush: true }, select: { id: true } });
    const sheet = await getBillingSheet(organizationId, monthKey);
    const summaryValues: SheetCell[][] = [
      SUMMARY_HEADERS,
      ...sheet.summary.rows.map((r, i) => [...r, sheet.summaryKeys[i].projectId, sheet.summaryKeys[i].taskId ?? '']),
    ];

    // Someone may have typed into the sheet while we were calculating: look again before overwriting.
    const latest = await provider.readValues(titles.summary);
    if (fingerprint(extractManual(latest)) !== fingerprint(extractManual(before)) && attempt < 3) {
      before = latest;
      continue;
    }

    await provider.writeValues(titles.summary, summaryValues);
    await provider.writeValues(titles.entries, [sheet.entries.columns, ...sheet.entries.rows]);
    await provider.writeValues(titles.changes, [sheet.changes.columns, ...sheet.changes.rows]);
    if (pending.length) {
      await prisma.billingSheetManual.updateMany({ where: { id: { in: pending.map((p) => p.id) } }, data: { pendingPush: false } });
    }
    return {
      month: monthKey,
      summaryRows: sheet.summary.rows.length,
      entryRows: sheet.entries.rows.length,
      changeRows: sheet.changes.rows.length,
    };
  }
};

type Connection = { organizationId: string; spreadsheetId: string; provider: string };
export type ProviderFactory = (connection: Connection) => Promise<SheetProvider>;

const nextTryAt = new Map<string, number>();
export const resetBackoff = (): void => nextTryAt.clear();

/** One pass of the background job: refreshes every month that changed (after a short quiet period). */
export const runSyncCycle = async (getProvider: ProviderFactory, now: Date = new Date()) => {
  const connections = await prisma.billingSheetConnection.findMany({ where: { enabled: true } });
  if (connections.length === 0) return { synced: 0, failed: 0 };
  const byOrg = new Map(connections.map((c) => [c.organizationId, c]));

  const dirty = await prisma.billingSheetDirty.findMany({
    where: { organizationId: { in: [...byOrg.keys()] }, requestedAt: { lte: new Date(now.getTime() - 3000) } },
    orderBy: { requestedAt: 'asc' },
    take: 10,
  });

  let synced = 0;
  let failed = 0;
  for (const d of dirty) {
    if ((nextTryAt.get(d.organizationId) ?? 0) > now.getTime()) continue; // cooling down after an error
    const connection = byOrg.get(d.organizationId)!;
    try {
      await syncMonth(await getProvider(connection), d.organizationId, d.monthKey);
      // Only clear the flag if nothing changed while we were syncing.
      await prisma.billingSheetDirty.deleteMany({ where: { organizationId: d.organizationId, monthKey: d.monthKey, requestedAt: d.requestedAt } });
      await prisma.billingSheetConnection.update({ where: { organizationId: d.organizationId }, data: { lastSyncAt: new Date(), lastError: null } });
      nextTryAt.delete(d.organizationId);
      synced++;
    } catch (err) {
      failed++;
      nextTryAt.set(d.organizationId, now.getTime() + 60_000);
      const message = err instanceof Error ? err.message : String(err);
      await prisma.billingSheetConnection.update({ where: { organizationId: d.organizationId }, data: { lastError: message.slice(0, 500) } }).catch(() => undefined);
    }
  }
  return { synced, failed };
};

/** Safety net: re-checks this and last month for every connection (catches changes made outside the app). */
export const markRecentMonthsDirty = async (): Promise<void> => {
  const now = new Date();
  const months = [now.toISOString().slice(0, 7), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7)];
  const connections = await prisma.billingSheetConnection.findMany({ where: { enabled: true }, select: { organizationId: true } });
  for (const { organizationId } of connections) {
    for (const monthKey of months) {
      await prisma.billingSheetDirty.upsert({
        where: { organizationId_monthKey: { organizationId, monthKey } },
        update: { requestedAt: now },
        create: { organizationId, monthKey },
      });
    }
  }
};
