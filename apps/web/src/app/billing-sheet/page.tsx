'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, RefreshCw } from 'lucide-react';
import { axiosInstance } from '@/lib/axios';

type Cell = string | number | null;
type Table = { columns: string[]; rows: Cell[][] };
type Sheet = {
  month: string;
  entries: Table;
  summary: Table;
  summaryKeys: Array<{ projectId: string; taskId: string | null }>;
  planTotals: Array<{ projectId: string; planName: string; hours: number; amount: number }>;
  changes: Table;
  totals: { entryCount: number; hours: number; amount: number; changeCount: number };
};
type Tab = 'summary' | 'entries' | 'changes';

const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
// Summary columns the team fills in by hand (they are never overwritten by automatic updates).
const EDITABLE: Record<number, 'prevPayHours' | 'invoiceNumber' | 'invoiceAmount' | 'notes'> = {
  3: 'prevPayHours',
  7: 'invoiceNumber',
  8: 'invoiceAmount',
  9: 'notes',
};

type Connection = {
  serverConfigured: boolean;
  serviceAccountEmail: string | null;
  connection: null | { spreadsheetUrl: string; enabled: boolean; lastSyncAt: string | null; lastError: string | null };
};

// Connects the billing sheet to a live Google Sheet (admins only; the panel hides itself for other roles).
function LivePanel({ month }: { month: string }) {
  const [info, setInfo] = useState<Connection | null>(null);
  const [hidden, setHidden] = useState(false);
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get('/billing-sheet/connection');
      setInfo(data.data);
    } catch (err: any) {
      if (err?.response?.status === 403) setHidden(true);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    try {
      toast.success(await fn());
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Something went wrong.');
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (hidden || !info) return null;
  const c = info.connection;

  return (
    <div className="rounded-xl border border-white/10 bg-[#111B36] p-4 text-sm">
      <div className="mb-1 font-bold">Live Google Sheet</div>
      {!info.serverConfigured ? (
        <p className="text-amber-300">
          Not set up on the server yet. Add the Google service-account key (GOOGLE_SERVICE_ACCOUNT_JSON) - see GOOGLE_SHEETS_SETUP.md.
        </p>
      ) : c ? (
        <div className="flex flex-wrap items-center gap-3">
          <a href={c.spreadsheetUrl} target="_blank" rel="noreferrer" className="text-primary underline">Open the sheet</a>
          <span className="text-white/60">
            {c.lastError ? <span className="text-red-300">Last sync failed: {c.lastError}</span> : c.lastSyncAt ? `Last synced ${new Date(c.lastSyncAt).toLocaleString()}` : 'Waiting for the first sync...'}
          </span>
          <button type="button" disabled={busy} className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20 disabled:opacity-50"
            onClick={() => run(async () => { await axiosInstance.post('/billing-sheet/sync', { month }); return `Synced ${month}`; })}>
            Sync now
          </button>
          <button type="button" disabled={busy} className="rounded-lg px-3 py-1.5 text-white/60 hover:text-white disabled:opacity-50"
            onClick={() => run(async () => { await axiosInstance.delete('/billing-sheet/connection'); return 'Disconnected'; })}>
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-white/60">
            1. Create an empty Google Sheet. 2. Share it with <span className="font-mono text-primary">{info.serviceAccountEmail}</span> as <b>Editor</b>. 3. Paste its link here.
          </p>
          <div className="flex gap-2">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="flex-1 rounded-lg border border-white/10 bg-[#0B132B] px-3 py-2" />
            <button type="button" disabled={busy || link.trim().length < 10} className="rounded-lg bg-primary px-4 py-2 font-bold text-black disabled:opacity-50"
              onClick={() => run(async () => { const { data } = await axiosInstance.put('/billing-sheet/connection', { spreadsheet: link }); setLink(''); return data.message; })}>
              Connect
            </button>
          </div>
        </div>
      )}
      <p className="mt-2 text-xs text-white/40">
        Only type in the Prev. Pay Hrs., Invoice #, Amount and Notes columns of the Summary tab - everything else is rewritten automatically. Use test data only with a personal Google account; real patient data belongs in a location your company has approved.
      </p>
    </div>
  );
}

export default function BillingSheetPage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [tab, setTab] = useState<Tab>('summary');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get('/billing-sheet', { params: { month } });
      setSheet(data.data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load the billing sheet.');
      setSheet(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (which: Tab) => {
    try {
      const res = await axiosInstance.get('/billing-sheet/export', { params: { month, tab: which }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `billing-sheet-${month}-${which}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed.');
    }
  };

  const saveManual = async (rowIndex: number, field: string, raw: string) => {
    if (!sheet) return;
    const key = sheet.summaryKeys[rowIndex];
    const numeric = field === 'prevPayHours' || field === 'invoiceAmount';
    const value = raw.trim() === '' ? null : numeric ? Number(raw.replace(/[$,]/g, '')) : raw.trim();
    if (numeric && value !== null && Number.isNaN(value)) {
      toast.error('Please enter a number.');
      return;
    }
    try {
      await axiosInstance.put('/billing-sheet/manual', { month, projectId: key.projectId, taskId: key.taskId, [field]: value });
      toast.success('Saved');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save.');
    }
  };

  const table: Table | null = sheet ? sheet[tab] : null;
  const tabBtn = (t: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-primary text-black' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 text-white">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Billing Sheet</h1>
          <p className="text-sm text-white/60">
            Approved time only. Updates by itself whenever a time entry is created, edited, moved, approved, rejected or deleted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0B132B] px-3 py-2 text-sm"
          />
          <button type="button" onClick={load} className="rounded-lg bg-white/5 p-2 hover:bg-white/10" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <LivePanel month={month} />

      {sheet && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ['Approved entries', String(sheet.totals.entryCount)],
            ['Approved hours', sheet.totals.hours.toFixed(2)],
            ['Total amount', money(sheet.totals.amount)],
            ['Changes logged', String(sheet.totals.changeCount)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[#111B36] p-4">
              <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
              <div className="mt-1 text-xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {tabBtn('summary', 'Summary (combined)')}
          {tabBtn('entries', 'Entries (every entry)')}
          {tabBtn('changes', 'Change log')}
        </div>
        <button type="button" onClick={() => download(tab)} className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">
          <Download className="h-4 w-4" /> Download CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#111B36]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/60">
            <tr>
              {table?.columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-3 py-3">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {table && table.rows.length === 0 && (
              <tr>
                <td colSpan={table.columns.length} className="px-3 py-10 text-center text-white/50">
                  {loading ? 'Loading...' : 'No data for this month yet.'}
                </td>
              </tr>
            )}
            {table?.rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-white/5">
                {row.map((cell, ci) =>
                  tab === 'summary' && EDITABLE[ci] ? (
                    <td key={ci} className="px-2 py-1">
                      <input
                        defaultValue={cell === null ? '' : String(cell)}
                        onBlur={(e) => {
                          if (e.target.value !== (cell === null ? '' : String(cell))) saveManual(ri, EDITABLE[ci], e.target.value);
                        }}
                        className="w-full min-w-[110px] rounded border border-white/10 bg-[#0B132B] px-2 py-1 text-sm focus:border-primary focus:outline-none"
                      />
                    </td>
                  ) : (
                    <td key={ci} className="whitespace-nowrap px-3 py-2 align-top">
                      {cell === null ? '' : typeof cell === 'number' && table.columns[ci].match(/Rate|Total|Amount|Revenue/) ? money(cell) : String(cell)}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sheet && tab === 'summary' && sheet.planTotals.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-[#111B36] p-4">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-white/60">Plan totals (all tasks, all people)</h2>
          <ul className="space-y-1 text-sm">
            {sheet.planTotals.map((p) => (
              <li key={p.projectId} className="flex justify-between gap-4">
                <span className="truncate">{p.planName}</span>
                <span className="whitespace-nowrap font-semibold">{p.hours.toFixed(2)} h &middot; {money(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
