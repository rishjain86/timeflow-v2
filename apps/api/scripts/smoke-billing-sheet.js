/* Billing sheet capture test. Run against a LOCAL dev database only. Needs `pnpm --filter @timeflow/api build` first.
 *
 *   pnpm --filter @timeflow/api exec node scripts/smoke-billing-sheet.js
 *
 * It drives time entries through the app's real database client (the one with the change tracker) and checks that
 * EVERY create / edit / move / approve / reject / delete is logged and that the monthly sheet follows each change
 * in place (no stale rows, no duplicates).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
if (process.env.NODE_ENV === 'production') { console.error('Refusing to run in production.'); process.exit(1); }

const { PrismaClient } = require('@prisma/client');
const base = new PrismaClient();
const app = require('../dist/config/prisma').prisma; // extended client: records every time-entry change
const { actorStorage } = require('../dist/utils/request-context');
const sheets = require('../dist/modules/billing-sheet/billing-sheet.service');

const MONTH = '2026-11';
const NEXT = '2026-12';
const D = (s) => new Date(`${s}T00:00:00Z`);
const results = [];
const check = (name, ok, extra) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '   -> ' + extra : ''}`);
};
const sum = (rows, i) => Math.round(rows.reduce((s, r) => s + Number(r[i] || 0), 0) * 100) / 100;

(async () => {
  const stamp = Date.now();
  const org = await base.organization.create({ data: { name: `Sheet Org ${stamp}` } });
  try {
    const mkUser = (first, role) => base.user.create({ data: { email: `sheet-${first.toLowerCase()}-${stamp}@example.com`, passwordHash: 'x', firstName: first, lastName: 'Test', role, organizationId: org.id } });
    const [rishit, amy, manny] = await Promise.all([mkUser('Rishit', 'THERAPIST'), mkUser('Amy', 'CONSULTANT'), mkUser('Manny', 'MANAGER')]);
    const who = (u) => (fn) => actorStorage.run({ userId: u.id, name: `${u.firstName} ${u.lastName}` }, fn);
    const asRishit = who(rishit), asAmy = who(amy), asManny = who(manny);

    const planName = (n) => `Test Patient ${n} - HCAI ${n}23456789 - OT TX - PARTIALLY APPROVED @ 99.75/hour - Assigned Rishit - #2018`;
    const planA = await base.project.create({ data: { name: planName(1), patientName: 'Test Patient 1', hcaiNumber: '123456789', organizationId: org.id, assignedToId: rishit.id } });
    const planB = await base.project.create({ data: { name: planName(2), patientName: 'Test Patient 2', hcaiNumber: '223456789', organizationId: org.id, assignedToId: rishit.id } });
    const mkTask = (name, project) => base.task.create({ data: { name, projectId: project.id, organizationId: org.id } });
    const treatA = await mkTask('Treatment', planA);
    const travelA = await mkTask('Travel', planA);
    const treatB = await mkTask('Treatment', planB);

    const snap = () => sheets.getBillingSheet(org.id, MONTH);
    const logCount = () => base.timeEntryChange.count({ where: { organizationId: org.id } });
    // Runs an operation and returns the actions it logged.
    const logged = async (fn) => {
      const before = await logCount();
      await fn();
      const rows = await base.timeEntryChange.findMany({ where: { organizationId: org.id }, orderBy: { occurredAt: 'asc' }, skip: before });
      return rows;
    };
    const actionsOf = (rows) => rows.map((r) => r.action).sort().join(',');
    const entry = (user, project, task, hours, rate, date) => app.timeEntry.create({
      data: { date: D(date), duration: hours, hourlyRate: rate, billableAmount: hours * rate, isBillable: true, approvalStatus: 'PENDING', projectId: project.id, taskId: task.id, userId: user.id, organizationId: org.id },
    });

    // ---------- 1. entries typed in by different people ----------
    let e1, e2, e3;
    let rows = await logged(async () => { e1 = await asRishit(() => entry(rishit, planA, treatA, 2, 99.75, '2026-11-03')); });
    check('a new entry is logged (CREATED, by whom)', actionsOf(rows) === 'CREATED' && rows[0].actorName === 'Rishit Test', actionsOf(rows));
    await asAmy(async () => { e2 = await entry(amy, planA, treatA, 4, 99.75, '2026-11-05'); });
    await asRishit(async () => { e3 = await entry(rishit, planA, travelA, 1.5, 50, '2026-11-05'); });
    let s = await snap();
    check('pending entries are NOT in the sheet (approved only)', s.entries.rows.length === 0 && s.summary.rows.length === 0);
    check('...but all 3 creations are in the change log', s.changes.rows.filter((r) => r[2] === 'CREATED').length === 3);

    // ---------- 2. approval ----------
    rows = await logged(async () => {
      await asManny(() => app.timeEntry.update({ where: { id: e1.id }, data: { approvalStatus: 'APPROVED' } }));
      await asManny(() => app.timeEntry.update({ where: { id: e2.id }, data: { approvalStatus: 'APPROVED' } }));
    });
    check('approvals are logged with the approver', actionsOf(rows) === 'APPROVED,APPROVED' && rows.every((r) => r.actorName === 'Manny Test'), actionsOf(rows));
    s = await snap();
    const treat = s.summary.rows.find((r) => r[2] === 'Treatment');
    check('Entries sheet lists every approved entry, whoever entered it', s.entries.rows.length === 2);
    check('Summary combines the plan: Treatment = 6.00 h (2 + 4 by two people)', treat && treat[4] === 6, JSON.stringify(treat));
    check('Summary Description is built from the HCAI number', treat && /^HCAI # 123456789 - OT TX$/.test(treat[1]), treat && treat[1]);

    // inside an interactive transaction, as many code paths do
    rows = await logged(async () => {
      await asManny(() => app.$transaction(async (tx) => tx.timeEntry.update({ where: { id: e3.id }, data: { approvalStatus: 'APPROVED' } })));
    });
    check('changes made inside a transaction are captured too', actionsOf(rows) === 'APPROVED', actionsOf(rows));

    // ---------- 3. move to another task ----------
    rows = await logged(async () => { await asRishit(() => app.timeEntry.update({ where: { id: e2.id }, data: { taskId: travelA.id } })); });
    check('moving to another task is logged with old and new task name', actionsOf(rows) === 'MOVED_TASK' && rows[0].fromValue === 'Treatment' && rows[0].toValue === 'Travel', `${rows[0] && rows[0].fromValue} -> ${rows[0] && rows[0].toValue}`);
    s = await snap();
    const treat2 = s.summary.rows.filter((r) => r[2] === 'Treatment');
    const travel2 = s.summary.rows.filter((r) => r[2] === 'Travel');
    check('the sheet follows the move: Treatment 2.00 h, Travel 5.50 h', sum(treat2, 4) === 2 && sum(travel2, 4) === 5.5, `${sum(treat2, 4)} / ${sum(travel2, 4)}`);
    check('...and it is the SAME entry (3 rows, none duplicated)', s.entries.rows.length === 3 && s.entries.rows.filter((r) => r[11] === e2.id).length === 1);
    check('the entry row now shows the new task', s.entries.rows.find((r) => r[11] === e2.id)[3] === 'Travel');

    // ---------- 4. move to another plan ----------
    rows = await logged(async () => { await asManny(() => app.timeEntry.update({ where: { id: e1.id }, data: { projectId: planB.id, taskId: treatB.id } })); });
    check('moving to another plan is logged (plan and task)', actionsOf(rows) === 'MOVED_PLAN,MOVED_TASK', actionsOf(rows));
    check('...with both plan names', rows.find((r) => r.action === 'MOVED_PLAN').fromValue === planA.name && rows.find((r) => r.action === 'MOVED_PLAN').toValue === planB.name);
    s = await snap();
    check('the old plan row is gone and the new plan row appears', !s.summary.rows.some((r) => r[0] === 'Test Patient 1' && r[2] === 'Treatment') && s.summary.rows.some((r) => r[0] === 'Test Patient 2' && r[2] === 'Treatment' && r[4] === 2));
    check('still no duplicates after the plan move', s.entries.rows.length === 3);

    // ---------- 5. edit ----------
    rows = await logged(async () => { await asRishit(() => app.timeEntry.update({ where: { id: e1.id }, data: { duration: 2.5, billableAmount: 2.5 * 99.75 } })); });
    check('editing hours is logged', actionsOf(rows) === 'UPDATED' && /hours 2 -> 2.5/.test(rows[0].summary), rows[0] && rows[0].summary);
    s = await snap();
    check('the same row now shows 2.50 h', s.summary.rows.find((r) => r[0] === 'Test Patient 2')[4] === 2.5 && s.entries.rows.length === 3);

    // ---------- 6. manual cells survive automatic updates ----------
    rows = await logged(async () => {
      await sheets.saveManual(org.id, { id: manny.id, name: 'Manny Test' }, { month: MONTH, projectId: planB.id, taskId: treatB.id, invoiceNumber: 'P2026101903', invoiceAmount: 938, notes: 'from SkeduleX' });
    });
    check('hand-filled cells are saved and logged', actionsOf(rows) === 'MANUAL_EDIT', actionsOf(rows));
    await asRishit(() => app.timeEntry.update({ where: { id: e1.id }, data: { duration: 3, billableAmount: 3 * 99.75 } }));
    s = await snap();
    const rowB = s.summary.rows.find((r) => r[0] === 'Test Patient 2');
    check('invoice #, amount and notes are kept when hours change', rowB[7] === 'P2026101903' && rowB[8] === 938 && rowB[9] === 'from SkeduleX' && rowB[4] === 3, JSON.stringify(rowB));

    // ---------- 7. another month ----------
    rows = await logged(async () => { await asRishit(() => app.timeEntry.update({ where: { id: e3.id }, data: { date: D('2026-12-02') } })); });
    check('changing the date is logged', actionsOf(rows) === 'UPDATED' && /date 2026-11-05 -> 2026-12-02/.test(rows[0].summary), rows[0] && rows[0].summary);
    s = await snap();
    const dec = await sheets.getBillingSheet(org.id, NEXT);
    check('the entry leaves November and appears in December', s.entries.rows.length === 2 && dec.entries.rows.length === 1 && dec.entries.rows[0][11] === e3.id);
    const dirty = await base.billingSheetDirty.findMany({ where: { organizationId: org.id } });
    check('both months are flagged for refreshing', dirty.some((d) => d.monthKey === MONTH) && dirty.some((d) => d.monthKey === NEXT), dirty.map((d) => d.monthKey).join(','));

    // ---------- 8. reject / resubmit / bulk approve ----------
    rows = await logged(async () => { await asManny(() => app.timeEntry.update({ where: { id: e2.id }, data: { approvalStatus: 'REJECTED' } })); });
    check('rejecting is logged', actionsOf(rows) === 'REJECTED', actionsOf(rows));
    s = await snap();
    check('a rejected entry leaves the sheet', !s.entries.rows.some((r) => r[11] === e2.id) && s.entries.rows.length === 1);
    rows = await logged(async () => { await asAmy(() => app.timeEntry.update({ where: { id: e2.id }, data: { approvalStatus: 'PENDING' } })); });
    check('resubmitting is logged', actionsOf(rows) === 'RESUBMITTED', actionsOf(rows));
    rows = await logged(async () => { await asManny(() => app.timeEntry.updateMany({ where: { id: { in: [e2.id] } }, data: { approvalStatus: 'APPROVED' } })); });
    check('a BULK approval is captured per entry', actionsOf(rows) === 'APPROVED' && rows[0].timeEntryId === e2.id, actionsOf(rows));

    // ---------- 9. delete ----------
    rows = await logged(async () => { await asManny(() => app.timeEntry.delete({ where: { id: e1.id } })); });
    check('deleting is logged', actionsOf(rows) === 'DELETED', actionsOf(rows));
    s = await snap();
    check('the deleted entry disappears from both sheets', !s.entries.rows.some((r) => r[11] === e1.id) && !s.summary.rows.some((r) => r[0] === 'Test Patient 2'));
    check('...but its history stays in the change log', s.changes.rows.filter((r) => r[12] === e1.id).length >= 5);
    const kept = await base.billingSheetManual.count({ where: { organizationId: org.id } });
    check('the hand-filled cells are kept even when the row is empty', kept === 1);
    await asRishit(() => entry(rishit, planB, treatB, 1, 99.75, '2026-11-10').then((e) => app.timeEntry.update({ where: { id: e.id }, data: { approvalStatus: 'APPROVED' } })));
    s = await snap();
    check('...and they come back when hours return', (s.summary.rows.find((r) => r[0] === 'Test Patient 2') || [])[7] === 'P2026101903');
    rows = await logged(async () => { await asManny(() => app.timeEntry.deleteMany({ where: { id: { in: [e2.id] } } })); });
    check('a BULK delete is captured per entry', actionsOf(rows) === 'DELETED' && rows[0].timeEntryId === e2.id, actionsOf(rows));

    // ---------- 10. output ----------
    const csv = await sheets.exportCsv(org.id, MONTH, 'summary');
    check('CSV export works and includes the hand-filled invoice number', csv.charCodeAt(0) === 0xfeff && csv.includes('P2026101903'));
    const all = await base.timeEntryChange.findMany({ where: { organizationId: org.id } });
    check('every logged entry change names who did it', all.filter((r) => r.timeEntryId).every((r) => !!r.actorName));
  } finally {
    await base.billingSheetDirty.deleteMany({ where: { organizationId: org.id } }).catch(() => {});
    await base.billingSheetManual.deleteMany({ where: { organizationId: org.id } }).catch(() => {});
    await base.organization.delete({ where: { id: org.id } }).catch((e) => console.log('cleanup note:', String(e.message).split('\n').pop()));
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) { console.log('FAILED:\n - ' + failed.map((x) => x.name).join('\n - ')); process.exitCode = 1; }
})()
  .catch((e) => { console.error('\nBilling sheet test aborted:', e); process.exitCode = 1; })
  .finally(async () => { await base.$disconnect(); });
