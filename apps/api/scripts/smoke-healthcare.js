/* Smoke test for the healthcare modules. Run against a LOCAL dev server and DEV database only.
 *
 *   set SMOKE_EMAIL=you@example.com
 *   set SMOKE_PASSWORD=your-password
 *   pnpm --filter @timeflow/api exec node scripts/smoke-healthcare.js
 *
 * It creates clearly-named "smoke" users, a service code, an appointment and notes (safe to delete afterwards).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const API = process.env.SMOKE_API_URL || 'http://localhost:5000/api/v1';
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('Set SMOKE_EMAIL and SMOKE_PASSWORD (an ADMIN / SUPER_ADMIN account of a healthcare org).');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' || /^https:\/\//.test(API) && !/localhost|127\.0\.0\.1/.test(API)) {
  console.error('Refusing to run against a non-local / production API. Use a local dev server and dev database.');
  process.exit(1);
}

const results = [];
const check = (name, ok, extra) => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '   -> ' + extra : ''}`);
};

async function call(method, p, token, body) {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, json };
}

async function login(email, password) {
  const r = await call('POST', '/auth/login', null, { email, password });
  if (r.status !== 200) throw new Error(`login failed for ${email}: HTTP ${r.status} ${JSON.stringify(r.json)}`);
  const token = (r.json.data && r.json.data.token) || r.json.token;
  if (!token) throw new Error('login response had no token: ' + JSON.stringify(r.json));
  return token;
}

const arrayIn = (json) => {
  const c = [json && json.data && json.data.data, json && json.data, json && json.data && json.data.items];
  return c.find(Array.isArray) || [];
};

async function createStaff(adminToken, label, role, stamp) {
  const email = `smoke-${label.toLowerCase()}-${stamp}@example.com`;
  const r = await call('POST', '/clients', adminToken, {
    firstName: label, lastName: 'Smoke', displayName: `${label} Smoke ${stamp}`, email, role,
  });
  const user = await prisma.user.findUnique({ where: { email } });
  return {
    email, status: r.status,
    clientId: r.json && r.json.data && r.json.data.client && r.json.data.client.id,
    password: r.json && r.json.data && r.json.data.temporaryPassword,
    userId: user && user.id,
  };
}

(async () => {
  const stamp = Date.now();
  const admin = await login(EMAIL, PASSWORD);

  // ---------- account creation hardening ----------
  const t1 = await createStaff(admin, 'Therapist1', 'THERAPIST', stamp);
  const t2 = await createStaff(admin, 'Therapist2', 'THERAPIST', stamp);
  const patient = await createStaff(admin, 'Patient', 'USER', stamp);
  const mgr = await createStaff(admin, 'Manager', 'MANAGER', stamp);
  check('accounts get a random one-time password (not the old default)',
    [t1, t2, patient, mgr].every((u) => u.password && u.password !== 'Password123!'));

  const mgrToken = await login(mgr.email, mgr.password);
  const esc = await call('POST', '/clients', mgrToken, { firstName: 'Evil', displayName: 'Evil Admin', email: `evil-${stamp}@example.com`, role: 'SUPER_ADMIN' });
  check('a manager can NOT create a SUPER_ADMIN (privilege escalation blocked)', esc.status === 403, 'HTTP ' + esc.status);
  const badRole = await call('POST', '/clients', admin, { firstName: 'X', displayName: 'Bad Role', email: `bad-${stamp}@example.com`, role: 'NOT_A_ROLE' });
  check('an invalid role is rejected', badRole.status === 400, 'HTTP ' + badRole.status);

  // ---------- clinical setup ----------
  const sc = await call('POST', '/service-codes', admin, { code: `SMK${stamp}`, defaultRate: 100 });
  const serviceCodeId = sc.json && sc.json.data && sc.json.data.id;
  check('service code created', sc.status === 201 && !!serviceCodeId, 'HTTP ' + sc.status);

  const p1 = await call('POST', '/therapists', admin, { userId: t1.userId });
  const p2 = await call('POST', '/therapists', admin, { userId: t2.userId });
  const profile1 = p1.json && p1.json.data && p1.json.data.id;
  const profile2 = p2.json && p2.json.data && p2.json.data.id;
  check('therapist profiles created', p1.status === 201 && p2.status === 201 && !!profile1 && !!profile2, `HTTP ${p1.status}/${p2.status}`);

  const start = new Date(Date.now() + 24 * 3600 * 1000);
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  const ap = await call('POST', '/appointments', admin, {
    clientId: patient.clientId, therapistId: profile1, serviceCodeId,
    startTime: start.toISOString(), endTime: end.toISOString(),
  });
  const apptId = ap.json && ap.json.data && ap.json.data.id;
  check('appointment created', ap.status === 201 && !!apptId, 'HTTP ' + ap.status + (apptId ? '' : ' ' + JSON.stringify(ap.json)));
  if (!apptId) throw new Error('Cannot continue without an appointment');

  const tok1 = await login(t1.email, t1.password);
  const tok2 = await login(t2.email, t2.password);

  // ---------- least privilege ----------
  const l1 = await call('GET', '/appointments', tok1);
  const l2 = await call('GET', '/appointments', tok2);
  check('therapist 1 sees their own appointment', arrayIn(l1.json).some((a) => a.id === apptId), 'HTTP ' + l1.status);
  check('therapist 2 sees NONE of therapist 1\'s appointments', !arrayIn(l2.json).some((a) => a.id === apptId), 'HTTP ' + l2.status);
  const g2 = await call('GET', `/appointments/${apptId}`, tok2);
  check('therapist 2 cannot open therapist 1\'s appointment (404)', g2.status === 404, 'HTTP ' + g2.status);
  const c2 = await call('POST', `/appointments/${apptId}/cnr`, tok2, { notes: 'intruder', therapistSigned: true });
  check('therapist 2 cannot write notes on it (404)', c2.status === 404, 'HTTP ' + c2.status);
  const r2 = await call('GET', `/appointments/${apptId}/cnr`, tok2);
  check('therapist 2 cannot read its notes (404)', r2.status === 404, 'HTTP ' + r2.status);
  const re = await call('POST', '/appointments', tok2, {
    clientId: patient.clientId, therapistId: profile1, serviceCodeId,
    startTime: new Date(start.getTime() + 5 * 3600 * 1000).toISOString(), endTime: new Date(start.getTime() + 6 * 3600 * 1000).toISOString(),
  });
  check('therapist 2 cannot schedule on therapist 1\'s calendar (403)', re.status === 403, 'HTTP ' + re.status);

  // ---------- encryption, signing, locking ----------
  const SECRET = 'SMOKE secret clinical note ' + stamp;
  const w = await call('POST', `/appointments/${apptId}/cnr`, tok1, { notes: SECRET, therapistSigned: true, clientSigned: false });
  check('therapist 1 saves a clinical note', w.status === 200 || w.status === 201, 'HTTP ' + w.status);

  const raw = await prisma.clinicalNoteReview.findUnique({ where: { appointmentId: apptId } });
  if (process.env.PHI_ENCRYPTION_KEY) {
    check('note is ENCRYPTED in the database', !!raw && raw.notes.startsWith('enc:v1:') && !raw.notes.includes('secret'));
  } else {
    console.log('SKIP  encryption check (PHI_ENCRYPTION_KEY is not set in apps/api/.env)');
  }
  const rd = await call('GET', `/appointments/${apptId}/cnr`, tok1);
  check('owner reads the note back decrypted', rd.json && rd.json.data && rd.json.data.notes === SECRET, 'HTTP ' + rd.status);

  const ap1 = await call('PATCH', `/appointments/${apptId}/cnr/approve`, admin, { isApproved: true });
  check('manager/admin approves the signed note', ap1.status === 200, 'HTTP ' + ap1.status);
  check('approval response does not leak the note text', !!ap1.json && !JSON.stringify(ap1.json).includes('secret'));
  const lock = await call('POST', `/appointments/${apptId}/cnr`, tok1, { notes: 'edit after approval', therapistSigned: true });
  check('approved note is LOCKED against edits (409)', lock.status === 409, 'HTTP ' + lock.status);

  const a1 = await call('POST', `/appointments/${apptId}/attendance`, tok1, { therapistSigned: true, clientSigned: true });
  check('attendance saved', a1.status === 200 || a1.status === 201, 'HTTP ' + a1.status);
  const a2 = await call('POST', `/appointments/${apptId}/attendance`, tok1, { therapistSigned: true, clientSigned: true, status: 'ABSENT' });
  check('fully signed attendance is LOCKED (409)', a2.status === 409, 'HTTP ' + a2.status);

  // ---------- audit trail ----------
  await new Promise((r) => setTimeout(r, 800));
  const logs = await prisma.auditLog.findMany({ where: { entityId: apptId } });
  check('PHI reads were audited', logs.some((l) => l.action === 'PHI_VIEW'), logs.length + ' audit rows');
  check('denied attempts were audited', logs.some((l) => l.details && l.details.outcome === 'DENIED_OR_FAILED'));
  check('audit rows contain no note text', !JSON.stringify(logs).includes('secret'));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) { console.log('FAILED:\n - ' + failed.map((f) => f.name).join('\n - ')); process.exitCode = 1; }
})()
  .catch((e) => { console.error('\nSmoke test aborted:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
