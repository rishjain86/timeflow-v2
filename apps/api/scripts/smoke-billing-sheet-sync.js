/* Live-sync engine test. Run against a LOCAL dev database only. Needs `pnpm --filter @timeflow/api build` first.
 *
 *   pnpm --filter @timeflow/api exec node scripts/smoke-billing-sheet-sync.js
 *
 * Uses an in-memory "sheet" so no Google account is needed. It plays the part of the people typing in the sheet.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (process.env.NODE_ENV === 'production') { console.error('Refusing to run in production.'); process.exit(1); }

const { PrismaClient } = require('@prisma/client');
const base = new PrismaClient();
const app = require('../dist/config/prisma').prisma;
const { actorStorage } = require('../dist/utils/request-context');
const sync = require('../dist/modules/billing-sheet/billing-sheet-sync.service');
const sheets = require('../dist/modules/billing-sheet/billing-sheet.service');
const { InMemorySheetProvider } = require('../dist/modules/billing-sheet/sheet-provider');

const MONTH = '2026-11';
const D = (s) => new Date(`${s}T00:00:00Z`);
const results = [];
const check = (name, ok, extra) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '   -> ' + extra : ''}`); };

(async () => {
  const stamp = Date.now();
  const org = await base.organization.create({ data: { name: `Sync Org ${stamp}` } });
  const org2 = await base.organization.create({ data: { name: `Other Org ${stamp}` } });
  const dirtyOrgs = [org.id, org2.id];
  try {
    const mkUser = (first, role) => base.user.create({ data: { email: `sync-${first.toLowerCase()}-${stamp}@example.com`, passwordHash: 'x', firstName: first, lastName: 'Test', role, organizationId: org.id } });
    const [rishit, amy, manny] = await Promise.all([mkUser('Rishit', 'THERAPIST'), mkUser('Amy', 'CONSULTANT'), mkUser('Manny', 'MANAGER')]);
    const as = (u) => (fn) => actorStorage.run({ userId: u.id, name: `${u.firstName} ${u.lastName}` }, fn);
    const planA = await base.project.create({ data: { name: 'Patient One - HCAI 123456789 - OT TX - APPROVED @ 99.75/hour - Assigned Rishit - #1', patientName: 'Patient One', hcaiNumber: '123456789', organizationId: org.id, assignedToId: rishit.id } });
    const foreign = await base.project.create({ data: { name: 'Foreign plan', organizationId: org2.id } });
    const treatA = await base.task.create({ data: { name: 'Treatment', projectId: planA.id, organizationId: org.id } });
    const travelA = await base.task.create({ data: { name: 'Travel', projectId: planA.id, organizationId: org.id } });
    const mkEntry = (user, task, hours, date) => as(user)(() => app.timeEntry.create({ data: { date: D(date), duration: hours, hourlyRate: 99.75, billableAmount: hours * 99.75, isBillable: true, approvalStatus: 'APPROVED', projectId: planA.id, taskId: task.id, userId: user.id, organizationId: org.id } }));
    const e1 = await mkEntry(rishit, treatA, 2, '2026-11-03');
    const e2 = await mkEntry(amy, treatA, 4, '2026-11-05');

    const p = new InMemorySheetProvider();
    const T = sync.tabTitles(MONTH);
    const summary = () => p.tabs.get(T.summary);
    const row = (task) => summary().slice(1).find((r) => r[2] === task);
    const COL = { task: 2, prev: 3, dur: 4, inv: 7, amt: 8, notes: 9, plan: 11, taskId: 12 };
    const manual = () => base.billingSheetManual.findMany({ where: { organizationId: org.id } });

    // ---------- 1. first sync ----------
    const r1 = await sync.syncMonth(p, org.id, MONTH);
    check('the three tabs are created for the month', p.tabs.has(T.summary) && p.tabs.has(T.entries) && p.tabs.has(T.changes), [...p.tabs.keys()].join(' | '));
    check('Summary has the sheet columns plus hidden Plan ID / Task ID', summary()[0].join('|') === sync.SUMMARY_HEADERS.join('|'));
    check('Summary combines the plan: Treatment = 6 h', row('Treatment')[COL.dur] === 6 && row('Treatment')[COL.plan] === planA.id && row('Treatment')[COL.taskId] === treatA.id);
    check('Entries tab has every approved entry', p.tabs.get(T.entries).length === 3 && r1.entryRows === 2);
    check('Change Log tab has the history', p.tabs.get(T.changes).length >= 3);

    // ---------- 2. somebody types in the sheet ----------
    row('Treatment')[COL.inv] = 'B-1-55432'; row('Treatment')[COL.amt] = 1064; row('Treatment')[COL.notes] = 'typed in sheet';
    await sync.syncMonth(p, org.id, MONTH);
    let m = await manual();
    check('values typed in the sheet are saved to the database', m.length === 1 && m[0].invoiceNumber === 'B-1-55432' && Number(m[0].invoiceAmount) === 1064 && m[0].notes === 'typed in sheet');
    check('...and are still in the sheet after the rewrite', row('Treatment')[COL.inv] === 'B-1-55432' && row('Treatment')[COL.amt] === 1064);
    check('the typed edit is in the change log', (await base.timeEntryChange.count({ where: { organizationId: org.id, action: 'MANUAL_EDIT', actorName: 'Connected sheet' } })) === 1);

    // ---------- 3. an entry moves to another task ----------
    await as(manny)(() => app.timeEntry.update({ where: { id: e2.id }, data: { taskId: travelA.id } }));
    await sync.syncMonth(p, org.id, MONTH);
    check('the sheet follows the move (Treatment 2 h, Travel 4 h)', row('Treatment')[COL.dur] === 2 && row('Travel')[COL.dur] === 4);
    check('the invoice # stays on the Treatment row (matched by key, not by position)', row('Treatment')[COL.inv] === 'B-1-55432' && !row('Travel')[COL.inv]);
    const entryIds = p.tabs.get(T.entries).slice(1).map((r) => r[11]);
    check('Entries tab: same 2 entries, none duplicated, moved one shows the new task', entryIds.length === 2 && new Set(entryIds).size === 2 && p.tabs.get(T.entries).find((r) => r[11] === e2.id)[3] === 'Travel');

    // ---------- 4. someone re-sorts the sheet ----------
    const rows = summary().slice(1).reverse();
    p.tabs.set(T.summary, [summary()[0], ...rows]);
    await sync.syncMonth(p, org.id, MONTH);
    check('re-sorted rows are put back in order and the hand-typed cells stay on their row', summary()[1][2] === 'Travel' && summary()[2][2] === 'Treatment' && summary()[2][COL.inv] === 'B-1-55432');

    // ---------- 5. website edit vs sheet edit ----------
    await base.billingSheetConnection.create({ data: { organizationId: org.id, spreadsheetId: 'fake', provider: 'google', enabled: true } });
    await sheets.saveManual(org.id, { id: manny.id, name: 'Manny Test' }, { month: MONTH, projectId: planA.id, taskId: treatA.id, invoiceNumber: 'WEB-1' });
    m = await manual();
    check('a website edit is flagged to be pushed to the sheet', m[0].pendingPush === true && m[0].invoiceNumber === 'WEB-1');
    await sync.syncMonth(p, org.id, MONTH);
    m = await manual();
    check('the website edit wins once: it reaches the sheet and the flag is cleared', row('Treatment')[COL.inv] === 'WEB-1' && m[0].pendingPush === false, String(row('Treatment')[COL.inv]));
    row('Treatment')[COL.inv] = 'SHEET-2';
    await sync.syncMonth(p, org.id, MONTH);
    m = await manual();
    check('afterwards the sheet is the source again', m[0].invoiceNumber === 'SHEET-2' && row('Treatment')[COL.inv] === 'SHEET-2');

    // ---------- 6. clearing a cell ----------
    row('Treatment')[COL.inv] = '';
    await sync.syncMonth(p, org.id, MONTH);
    m = await manual();
    check('clearing a cell in the sheet clears it in the database', m[0].invoiceNumber === null && Number(m[0].invoiceAmount) === 1064);

    // ---------- 7. tampering ----------
    summary().push(['x', 'x', 'Treatment', 9, 9, 9, 9, 'FOREIGN-INV', 5, 'hack', '', foreign.id, '']);
    summary().push(['x', 'x', 'Treatment', 9, 9, 9, 9, 'JUNK-INV', 5, 'hack', '', 'not-a-uuid', '']);
    await sync.syncMonth(p, org.id, MONTH);
    check('a row pointing at ANOTHER organization\'s plan is ignored', (await base.billingSheetManual.count({ where: { projectId: foreign.id } })) === 0);
    check('a row with a made-up key is ignored', !(await manual()).some((x) => x.invoiceNumber === 'JUNK-INV'));
    check('the tampered rows are removed by the rewrite', !summary().some((r) => r[COL.plan] === foreign.id || r[COL.plan] === 'not-a-uuid'));

    // ---------- 8. the background job ----------
    sync.resetBackoff();
    await as(rishit)(() => app.timeEntry.update({ where: { id: e1.id }, data: { duration: 2.5, billableAmount: 2.5 * 99.75 } }));
    check('an edit flags the month as dirty', (await base.billingSheetDirty.count({ where: { organizationId: org.id, monthKey: MONTH } })) === 1);
    const future = new Date(Date.now() + 10_000);
    const c1 = await sync.runSyncCycle(async () => p, future);
    const conn = await base.billingSheetConnection.findUnique({ where: { organizationId: org.id } });
    check('the job refreshes the sheet by itself', c1.synced >= 1 && row('Treatment')[COL.dur] === 2.5, JSON.stringify(c1));
    check('...clears the dirty flag and records the sync time', (await base.billingSheetDirty.count({ where: { organizationId: org.id } })) === 0 && !!conn.lastSyncAt && conn.lastError === null);

    // ---------- 9. failure and recovery ----------
    const broken = new InMemorySheetProvider();
    broken.writeValues = async () => { throw new Error('Google API 403: nope'); };
    await as(rishit)(() => app.timeEntry.update({ where: { id: e1.id }, data: { duration: 3, billableAmount: 3 * 99.75 } }));
    const c2 = await sync.runSyncCycle(async () => broken, future);
    const conn2 = await base.billingSheetConnection.findUnique({ where: { organizationId: org.id } });
    check('a failing sheet is reported, and the change is kept for a retry', c2.failed === 1 && /403/.test(conn2.lastError) && (await base.billingSheetDirty.count({ where: { organizationId: org.id } })) === 1);
    const c3 = await sync.runSyncCycle(async () => p, future);
    check('after an error the job cools down instead of hammering the sheet', c3.synced === 0);
    const c4 = await sync.runSyncCycle(async () => p, new Date(future.getTime() + 61_000));
    const conn3 = await base.billingSheetConnection.findUnique({ where: { organizationId: org.id } });
    check('then it retries and catches up', c4.synced === 1 && row('Treatment')[COL.dur] === 3 && conn3.lastError === null);
  } finally {
    for (const id of dirtyOrgs) {
      await base.billingSheetDirty.deleteMany({ where: { organizationId: id } }).catch(() => {});
      await base.billingSheetManual.deleteMany({ where: { organizationId: id } }).catch(() => {});
      await base.organization.delete({ where: { id } }).catch((e) => console.log('cleanup note:', String(e.message).split('\n').pop()));
    }
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) { console.log('FAILED:\n - ' + failed.map((x) => x.name).join('\n - ')); process.exitCode = 1; }
})()
  .catch((e) => { console.error('\nSync test aborted:', e); process.exitCode = 1; })
  .finally(async () => { await base.$disconnect(); });
