/**
 * Pure functions that turn approved time entries into the monthly billing sheet.
 * No database access here, so the logic can be tested in isolation.
 *
 *  - ENTRIES  : one row per approved time entry, by whoever entered it
 *  - SUMMARY  : combined hours per plan and task (all people together) with rate and total, plus the
 *               hand-filled columns (previous pay hours, invoice #, amount, notes)
 *  - CHANGES  : every create / edit / move / approve / reject / delete, newest first
 */
export type Cell = string | number | null;
export interface Table {
  columns: string[];
  rows: Cell[][];
}

export interface EntryInput {
  id: string;
  date: Date;
  hours: number;
  rate: number | null;
  amount: number | null;
  isBillable: boolean;
  description: string | null;
  projectId: string;
  planName: string;
  patientName: string;
  hcaiNumber: string | null;
  assignedTo: string | null;
  taskId: string | null;
  taskName: string | null;
  staffName: string;
  staffRole: string;
}

export interface ManualCells {
  prevPayHours: number | null;
  invoiceNumber: string | null;
  invoiceAmount: number | null;
  notes: string | null;
}

export interface ChangeInput {
  occurredAt: Date;
  actorName: string | null;
  action: string;
  patientName: string | null;
  planName: string | null;
  taskName: string | null;
  staffName: string | null;
  entryDate: Date | null;
  hours: number | null;
  summary: string;
  fromValue: string | null;
  toValue: string | null;
  timeEntryId: string;
}

export const ENTRY_COLUMNS = ['Date', 'Patient', 'Plan', 'Task', 'Staff', 'Role', 'Hours', 'Rate', 'Amount', 'Billable', 'Description', 'Entry ID'];
export const SUMMARY_COLUMNS = ['Patient', 'Description', 'Task', 'Prev. Pay Hrs. Incl.', 'Duration', 'Rate', 'Total', 'Invoice #', 'Amount $', 'Notes', 'File Assigned To'];
export const CHANGE_COLUMNS = ['When (UTC)', 'Who', 'Action', 'Patient', 'Plan', 'Task', 'Staff', 'Entry date', 'Hours', 'Details', 'From', 'To', 'Entry ID'];

export const isMonthKey = (s: string): boolean => /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
export const monthKeyOf = (d: Date): string => d.toISOString().slice(0, 7);
export const monthBounds = (key: string): { start: Date; end: Date } => {
  const [y, m] = key.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
};
const ymd = (d: Date): string => d.toISOString().slice(0, 10);
const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const entryAmount = (e: Pick<EntryInput, 'isBillable' | 'amount' | 'rate' | 'hours'>): number => {
  if (!e.isBillable) return 0;
  if (e.amount !== null && e.amount !== undefined) return e.amount;
  return e.rate !== null && e.rate !== undefined ? e.hours * e.rate : 0;
};

export const manualKey = (projectId: string, taskId: string | null): string => `${projectId}|${taskId ?? ''}`;

/** "Test - HCAI 123 - OT TX - APPROVED @ 99.75/hour - ..." -> "HCAI # 123 - OT TX" (falls back to the plan name). */
export const planDescription = (planName: string, hcaiNumber: string | null): string => {
  if (!hcaiNumber) return planName;
  const parts = planName.split(' - ').map((s) => s.trim());
  const modality = parts.length >= 3 && !/^hcai/i.test(parts[2]) ? parts[2] : '';
  return modality ? `HCAI # ${hcaiNumber} - ${modality}` : `HCAI # ${hcaiNumber}`;
};

export const buildEntriesTable = (entries: EntryInput[]): Table => {
  const sorted = [...entries].sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      a.planName.localeCompare(b.planName) ||
      (a.taskName ?? '').localeCompare(b.taskName ?? '') ||
      a.staffName.localeCompare(b.staffName) ||
      a.id.localeCompare(b.id)
  );
  return {
    columns: ENTRY_COLUMNS,
    rows: sorted.map((e) => [
      ymd(e.date), e.patientName, e.planName, e.taskName ?? '(no task)', e.staffName, e.staffRole,
      r2(e.hours), e.rate, r2(entryAmount(e)), e.isBillable ? 'Yes' : 'No', e.description ?? '', e.id,
    ]),
  };
};

export interface SummaryKey {
  projectId: string;
  taskId: string | null;
}

export interface SummaryResult {
  table: Table;
  keys: SummaryKey[];
  planTotals: Array<{ projectId: string; planName: string; hours: number; amount: number }>;
}

export const buildSummary = (entries: EntryInput[], manual: Map<string, ManualCells>): SummaryResult => {
  type Group = { first: EntryInput; hours: number; amount: number; rate: number | null };
  const groups = new Map<string, Group>();
  for (const e of entries) {
    const key = `${e.projectId}|${e.taskId ?? ''}|${e.rate ?? ''}`;
    const g = groups.get(key) ?? { first: e, hours: 0, amount: 0, rate: e.rate };
    g.hours += e.hours;
    g.amount += entryAmount(e);
    groups.set(key, g);
  }

  const ordered = [...groups.values()].sort(
    (a, b) => a.first.planName.localeCompare(b.first.planName) || (a.first.taskName ?? '').localeCompare(b.first.taskName ?? '') || (a.rate ?? 0) - (b.rate ?? 0)
  );

  const rows: Cell[][] = [];
  const keys: SummaryKey[] = [];
  for (const g of ordered) {
    const m = manual.get(manualKey(g.first.projectId, g.first.taskId));
    rows.push([
      g.first.patientName,
      planDescription(g.first.planName, g.first.hcaiNumber),
      g.first.taskName ?? '(no task)',
      m?.prevPayHours ?? null,
      r2(g.hours),
      g.rate,
      r2(g.amount),
      m?.invoiceNumber ?? null,
      m?.invoiceAmount ?? null,
      m?.notes ?? null,
      g.first.assignedTo ?? '',
    ]);
    keys.push({ projectId: g.first.projectId, taskId: g.first.taskId });
  }

  const plans = new Map<string, { projectId: string; planName: string; hours: number; amount: number }>();
  for (const e of entries) {
    const p = plans.get(e.projectId) ?? { projectId: e.projectId, planName: e.planName, hours: 0, amount: 0 };
    p.hours += e.hours;
    p.amount += entryAmount(e);
    plans.set(e.projectId, p);
  }
  const planTotals = [...plans.values()]
    .map((p) => ({ ...p, hours: r2(p.hours), amount: r2(p.amount) }))
    .sort((a, b) => a.planName.localeCompare(b.planName));

  return { table: { columns: SUMMARY_COLUMNS, rows }, keys, planTotals };
};

export const buildChangesTable = (changes: ChangeInput[]): Table => {
  const sorted = [...changes].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  return {
    columns: CHANGE_COLUMNS,
    rows: sorted.map((c) => [
      c.occurredAt.toISOString().replace('T', ' ').slice(0, 19),
      c.actorName ?? 'System',
      c.action,
      c.patientName ?? '',
      c.planName ?? '',
      c.taskName ?? '',
      c.staffName ?? '',
      c.entryDate ? ymd(c.entryDate) : '',
      c.hours,
      c.summary,
      c.fromValue ?? '',
      c.toValue ?? '',
      c.timeEntryId,
    ]),
  };
};

/**
 * CSV for Excel / Google Sheets. Adds a BOM so Excel reads UTF-8 correctly, and neutralises spreadsheet
 * formula injection: text starting with = + - @ is prefixed with an apostrophe.
 */
export const toCsv = (table: Table): string => {
  const esc = (cell: Cell): string => {
    if (cell === null || cell === undefined) return '';
    let s = typeof cell === 'number' ? String(cell) : cell;
    if (typeof cell === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\uFEFF' + [table.columns, ...table.rows].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
};
