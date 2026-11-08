/* Cross-tenant isolation test. Run against a LOCAL dev server and DEV database only.
 *
 *   pnpm --filter @timeflow/api exec node scripts/smoke-tenant-isolation.js
 *
 * Registers two brand-new organizations (A and B). Creates records in A, then, as the OWNER of B (the strongest role
 * in B), tries to read / list / change / delete them and to attach its own records to them.
 * Any 2xx answer to an outsider is reported as a LEAK.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const prismaPkg = require('@prisma/client');
const prisma = new prismaPkg.PrismaClient();

const API = process.env.SMOKE_API_URL || 'http://localhost:5000/api/v1';
if (process.env.NODE_ENV === 'production' || (/^https:\/\//.test(API) && !/localhost|127\.0\.0\.1/.test(API))) {
  console.error('Refusing to run against a non-local / production API.');
  process.exit(1);
}

const results = [];
const check = (name, ok, extra) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '   -> ' + extra : ''}`);
};
const isOk = (r) => r.status >= 200 && r.status < 300;
const h = (r) => `HTTP ${r.status}` + (r.status >= 400 && r.json && r.json.message ? ' - ' + r.json.message : '');

async function call(method, p, token, body) {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, json };
}

async function newOrg(label, stamp) {
  const email = `tenant-${label.toLowerCase()}-${stamp}@example.com`;
  const password = `Tenant!${label}-${stamp}`;
  const reg = await call('POST', '/auth/register', null, {
    firstName: `Org${label}`, lastName: 'Owner', email, password,
    organizationName: `Tenant ${label} ${stamp}`, phone: '9999999999', industryType: 'HEALTHCARE',
  });
  if (reg.status !== 201) throw new Error(`register ${label} failed: ${h(reg)}`);
  const login = await call('POST', '/auth/login', null, { email, password });
  const token = (login.json && login.json.data && login.json.data.token) || (login.json && login.json.token);
  if (!token) throw new Error(`login ${label} failed: ${h(login)}`);
  const user = await prisma.user.findUnique({ where: { email } });
  return { email, token, userId: user.id, orgId: user.organizationId };
}

(async () => {
  const stamp = Date.now();
  const A = await newOrg('A', stamp);
  const B = await newOrg('B', stamp);
  check('two separate organizations were created', A.orgId !== B.orgId);

  // ---------- fixtures in org A ----------
  const fixtures = [];
  const fx = async (name, prefix, create) => {
    try { const r = await create(); fixtures.push({ name, prefix, id: r.id }); return r; }
    catch (e) { console.log(`SKIP  fixture "${name}": ${String(e.message).trim().split('\n').pop().slice(0, 110)}`); return null; }
  };
  const o = A.orgId;
  const client = await fx('client', '/clients', () => prisma.client.create({ data: { name: 'A Client', email: `a-client-${stamp}@example.com`, organizationId: o } }));
  const project = await fx('project', '/projects', () => prisma.project.create({ data: { name: 'A Project', organizationId: o } }));
  await fx('task', '/tasks', () => prisma.task.create({ data: { name: 'A Task', projectId: project.id, organizationId: o } }));
  await fx('time entry', '/time-entries', () => prisma.timeEntry.create({ data: { date: new Date(), duration: 1, projectId: project.id, userId: A.userId, organizationId: o } }));
  await fx('expense', '/expenses', () => prisma.expense.create({ data: { title: 'A Expense', amount: 10, category: 'Other', organizationId: o, userId: A.userId } }));
  await fx('team', '/teams', () => prisma.team.create({ data: { name: 'A Team', organizationId: o } }));
  await fx('leave', '/leaves', () => prisma.leave.create({ data: { startDate: new Date(), endDate: new Date(), type: Object.values(prismaPkg.LeaveType)[0], reason: 'A leave', userId: A.userId, organizationId: o } }));
  await fx('comment', '/comments', () => prisma.comment.create({ data: { content: 'A comment', userId: A.userId, organizationId: o } }));
  await fx('attachment', '/attachments', () => prisma.attachment.create({ data: { fileName: 'a.txt', originalName: 'a.txt', mimeType: 'text/plain', size: 1, url: 'https://example.com/a.txt', uploadedById: A.userId, organizationId: o } }));
  await fx('notification', '/notifications', () => prisma.notification.create({ data: { title: 'A', message: 'A secret', userId: A.userId, organizationId: o } }));
  const authz = await fx('authorization', '/authorizations', () => prisma.authorization.create({ data: { authNumber: `A-AUTH-${stamp}`, startDate: new Date(), endDate: new Date(Date.now() + 864e5), projectId: project.id, organizationId: o } }));
  const funding = authz && await fx('funding source', '/funding-sources', () => prisma.fundingSource.create({ data: { name: 'A Funder', payorType: Object.values(prismaPkg.PayorType)[0], authorizationId: authz.id, organizationId: o } }));
  if (funding) await fx('budget', '/budgets', () => prisma.budget.create({ data: { fundingSourceId: funding.id, organizationId: o } }));
  await fx('project budget', '/project-budgets', () => prisma.projectBudget.create({ data: { projectId: project.id, organizationId: o } }));
  const sc = await fx('service code', '/service-codes', () => prisma.serviceCode.create({ data: { code: `A-SC-${stamp}`, defaultRate: 100, organizationId: o } }));
  const therapist = await fx('therapist profile', '/therapists', () => prisma.therapistProfile.create({ data: { userId: A.userId, organizationId: o } }));
  const appt = client && therapist && await fx('appointment', '/appointments', () => prisma.appointment.create({ data: { startTime: new Date(Date.now() + 864e5), endTime: new Date(Date.now() + 864e5 + 2700e3), organizationId: o, clientId: client.id, therapistId: therapist.id, ...(sc ? { serviceCodeId: sc.id } : {}) } }));
  if (client) await fx('invoice', '/invoices', () => prisma.invoice.create({ data: { invoiceNumber: `A-INV-${stamp}`, issueDate: new Date(), status: 'SENT', subtotal: 10, totalAmount: 10, balanceDue: 10, clientId: client.id, organizationId: o } }));
  const audit = await prisma.auditLog.findFirst({ where: { organizationId: o } });
  if (audit) fixtures.push({ name: 'audit log', prefix: '/audits', id: audit.id });

  console.log(`\n${fixtures.length} fixtures created in organization A. Now attacking them as the owner of organization B...\n`);

  // ---------- read / list / change / delete from the other organization ----------
  for (const f of fixtures) {
    const owner = await call('GET', `${f.prefix}/${f.id}`, A.token);
    const get = await call('GET', `${f.prefix}/${f.id}`, B.token);
    const list = await call('GET', f.prefix, B.token);
    const inList = JSON.stringify(list.json || {}).includes(f.id);
    const put = await call('PUT', `${f.prefix}/${f.id}`, B.token, {});
    const patch = await call('PATCH', `${f.prefix}/${f.id}`, B.token, {});
    const del = await call('DELETE', `${f.prefix}/${f.id}`, B.token);
    const bad = [];
    if (isOk(get)) bad.push('READ');
    if (inList) bad.push('LIST');
    if (isOk(put)) bad.push('PUT');
    if (isOk(patch)) bad.push('PATCH');
    if (isOk(del)) bad.push('DELETE');
    check(`${f.name}: organization B cannot read, list, change or delete it`, bad.length === 0,
      bad.length ? `LEAK via ${bad.join('+')}` : `GET ${get.status} PUT ${put.status} PATCH ${patch.status} DEL ${del.status} (owner GET ${owner.status})`);
  }

  // ---------- attaching B's records to A's records ----------
  const soon = new Date(Date.now() + 7 * 864e5);
  const refs = [];
  if (client && therapist && sc) refs.push(['appointment', '/appointments', { clientId: client.id, therapistId: therapist.id, serviceCodeId: sc.id, startTime: soon.toISOString(), endTime: new Date(soon.getTime() + 2700e3).toISOString() }]);
  if (project) refs.push(['authorization', '/authorizations', { authNumber: `B-ATTACK-${stamp}`, startDate: new Date().toISOString(), endDate: soon.toISOString(), projectId: project.id }]);
  if (funding) refs.push(['budget', '/budgets', { fundingSourceId: funding.id }]);
  if (project) refs.push(['task', '/tasks', { name: 'B task on A project', projectId: project.id }]);
  if (project) refs.push(['time entry', '/time-entries', { projectId: project.id, date: new Date().toISOString(), duration: 1, description: 'B on A project' }]);
  if (client) refs.push(['invoice', '/invoices', { clientId: client.id, dueDate: soon.toISOString(), items: [] }]);
  for (const [name, p, body] of refs) {
    const r = await call('POST', p, B.token, body);
    check(`organization B cannot create a ${name} that points at organization A's records`, !isOk(r), isOk(r) ? 'LEAK: created!' : h(r));
  }

  // ---------- A's data is still intact ----------
  const survivors = [];
  for (const f of fixtures) {
    const exists = await prisma[{
      '/clients': 'client', '/projects': 'project', '/tasks': 'task', '/time-entries': 'timeEntry', '/expenses': 'expense',
      '/teams': 'team', '/leaves': 'leave', '/comments': 'comment', '/attachments': 'attachment', '/notifications': 'notification',
      '/authorizations': 'authorization', '/funding-sources': 'fundingSource', '/budgets': 'budget', '/project-budgets': 'projectBudget',
      '/service-codes': 'serviceCode', '/therapists': 'therapistProfile', '/appointments': 'appointment', '/invoices': 'invoice', '/audits': 'auditLog',
    }[f.prefix]].findUnique({ where: { id: f.id } });
    if (!exists) survivors.push(f.name);
  }
  check('none of organization A\'s records were deleted by organization B', survivors.length === 0, survivors.length ? 'DELETED: ' + survivors.join(', ') : 'all intact');

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) { console.log('FAILED:\n - ' + failed.map((x) => x.name).join('\n - ')); process.exitCode = 1; }
})()
  .catch((e) => { console.error('\nTenant test aborted:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
