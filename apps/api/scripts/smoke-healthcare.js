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

const h = (r) => `HTTP ${r.status}` + (r.status >= 400 && r.json && r.json.message ? ' - ' + r.json.message : '');

const STRONG = 'Smoke!Pass-' + Date.now();

// Logs in with the temporary password, proves the API is blocked until it is changed, then changes it.
async function rotate(email, tempPassword, label, full) {
  const token = await login(email, tempPassword);
  const blocked = await call('GET', '/appointments', token);
  check(`${label}: temporary password blocks the API until changed`,
    blocked.status === 403 && blocked.json && blocked.json.code === 'PASSWORD_CHANGE_REQUIRED', h(blocked));
  if (full) {
    const weak = await call('PATCH', '/users/update-password', token, { currentPassword: tempPassword, newPassword: 'weak' });
    check('a weak new password is rejected', weak.status === 400, h(weak));
    const wrong = await call('PATCH', '/users/update-password', token, { currentPassword: 'not-the-password', newPassword: STRONG });
    check('a wrong current password is rejected', wrong.status === 400, h(wrong));
    const same = await call('PATCH', '/users/update-password', token, { currentPassword: tempPassword, newPassword: tempPassword });
    check('reusing the same password is rejected', same.status === 400, h(same));
  }
  const ok = await call('PATCH', '/users/update-password', token, { currentPassword: tempPassword, newPassword: STRONG });
  check(`${label}: password change succeeds`, ok.status === 200, h(ok));
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

  const mgrToken = await rotate(mgr.email, mgr.password, 'manager', true);
  const esc = await call('POST', '/clients', mgrToken, { firstName: 'Evil', displayName: 'Evil Admin', email: `evil-${stamp}@example.com`, role: 'SUPER_ADMIN' });
  check('a manager can NOT create a SUPER_ADMIN (privilege escalation blocked)', esc.status === 403, h(esc));
  const badRole = await call('POST', '/clients', admin, { firstName: 'X', displayName: 'Bad Role', email: `bad-${stamp}@example.com`, role: 'NOT_A_ROLE' });
  check('an invalid role is rejected', badRole.status === 400, h(badRole));

  // ---------- clinical setup ----------
  const sc = await call('POST', '/service-codes', admin, { code: `SMK${stamp}`, defaultRate: 100 });
  const serviceCodeId = sc.json && sc.json.data && sc.json.data.id;
  check('service code created', sc.status === 201 && !!serviceCodeId, h(sc));

  const p1 = await call('POST', '/therapists', admin, { userId: t1.userId });
  const p2 = await call('POST', '/therapists', admin, { userId: t2.userId });
  const profile1 = p1.json && p1.json.data && p1.json.data.id;
  const profile2 = p2.json && p2.json.data && p2.json.data.id;
  check('therapist profiles created', p1.status === 201 && p2.status === 201 && !!profile1 && !!profile2, `HTTP ${p1.status}/${p2.status}`);

  const start = new Date(Date.now() + 24 * 3600 * 1000);
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  const ap = await call('POST', '/appointments', admin, {
    clientId: patient.clientId, therapistId: profile1, serviceCodeId,
    startTime: start.toISOString(), endTime: end.toISOString(), modality: 'TELEHEALTH',
  });
  const apptId = ap.json && ap.json.data && ap.json.data.id;
  check('appointment created', ap.status === 201 && !!apptId, h(ap) + (apptId ? '' : ' ' + JSON.stringify(ap.json)));
  if (!apptId) throw new Error('Cannot continue without an appointment');

  const tok1 = await rotate(t1.email, t1.password, 'therapist 1', false);
  const tok2 = await rotate(t2.email, t2.password, 'therapist 2', false);

  // ---------- least privilege ----------
  const l1 = await call('GET', '/appointments', tok1);
  const l2 = await call('GET', '/appointments', tok2);
  check('therapist 1 sees their own appointment', arrayIn(l1.json).some((a) => a.id === apptId), h(l1));
  check('therapist 2 sees NONE of therapist 1\'s appointments', !arrayIn(l2.json).some((a) => a.id === apptId), h(l2));
  const g2 = await call('GET', `/appointments/${apptId}`, tok2);
  check('therapist 2 cannot open therapist 1\'s appointment (404)', g2.status === 404, h(g2));
  const c2 = await call('POST', `/appointments/${apptId}/cnr`, tok2, { notes: 'intruder', therapistSigned: true });
  check('therapist 2 cannot write notes on it (404)', c2.status === 404, h(c2));
  const r2 = await call('GET', `/appointments/${apptId}/cnr`, tok2);
  check('therapist 2 cannot read its notes (404)', r2.status === 404, h(r2));
  const re = await call('POST', '/appointments', tok2, {
    clientId: patient.clientId, therapistId: profile1, serviceCodeId,
    startTime: new Date(start.getTime() + 5 * 3600 * 1000).toISOString(), endTime: new Date(start.getTime() + 6 * 3600 * 1000).toISOString(),
  });
  check('therapist 2 cannot schedule on therapist 1\'s calendar (403)', re.status === 403, h(re));

  // ---------- provider portal (real data) ----------
  const sessionsOf = (r) => ((r.json && r.json.data && r.json.data.upcomingAppointments) || []).flatMap((g) => g.sessions);
  const pa1 = await call('GET', '/provider/appointments', tok1);
  const mine = sessionsOf(pa1).find((s) => s.id === apptId);
  check('provider portal: therapist 1 sees their session with real data',
    !!mine && /Patient Smoke/.test(mine.patientName) && mine.modality === 'Telehealth', h(pa1));
  const pa2 = await call('GET', '/provider/appointments', tok2);
  check('provider portal: therapist 2 does not see it', pa2.status === 200 && !sessionsOf(pa2).some((s) => s.id === apptId), h(pa2));

  // ---------- encryption, signing, locking ----------
  const SECRET = 'SMOKE secret clinical note ' + stamp;
  const w = await call('POST', `/appointments/${apptId}/cnr`, tok1, { notes: SECRET, therapistSigned: true, clientSigned: false });
  check('therapist 1 saves a clinical note', w.status === 200 || w.status === 201, h(w));

  const raw = await prisma.clinicalNoteReview.findUnique({ where: { appointmentId: apptId } });
  if (process.env.PHI_ENCRYPTION_KEY) {
    check('note is ENCRYPTED in the database', !!raw && raw.notes.startsWith('enc:v1:') && !raw.notes.includes('secret'));
  } else {
    console.log('SKIP  encryption check (PHI_ENCRYPTION_KEY is not set in apps/api/.env)');
  }
  const rd = await call('GET', `/appointments/${apptId}/cnr`, tok1);
  check('owner reads the note back decrypted', rd.json && rd.json.data && rd.json.data.notes === SECRET, h(rd));

  const ap1 = await call('PATCH', `/appointments/${apptId}/cnr/approve`, admin, { isApproved: true });
  check('manager/admin approves the signed note', ap1.status === 200, h(ap1));
  check('approval response does not leak the note text', !!ap1.json && !JSON.stringify(ap1.json).includes('secret'));
  const lock = await call('POST', `/appointments/${apptId}/cnr`, tok1, { notes: 'edit after approval', therapistSigned: true });
  check('approved note is LOCKED against edits (409)', lock.status === 409, h(lock));

  const a1 = await call('POST', `/appointments/${apptId}/attendance`, tok1, { therapistSigned: true, clientSigned: true });
  check('attendance saved', a1.status === 200 || a1.status === 201, h(a1));
  const a2 = await call('POST', `/appointments/${apptId}/attendance`, tok1, { therapistSigned: true, clientSigned: true, status: 'ABSENT' });
  check('fully signed attendance is LOCKED (409)', a2.status === 409, h(a2));

  // ---------- provider notes worklist: MISSING -> DRAFT -> SIGNED ----------
  const pastStart = new Date(Date.now() - 26 * 3600 * 1000);
  const pastEnd = new Date(pastStart.getTime() + 45 * 60 * 1000);
  const ap2 = await call('POST', '/appointments', admin, {
    clientId: patient.clientId, therapistId: profile1, serviceCodeId,
    startTime: pastStart.toISOString(), endTime: pastEnd.toISOString(),
  });
  const pastId = ap2.json && ap2.json.data && ap2.json.data.id;
  check('past appointment created for the notes worklist', ap2.status === 201 && !!pastId, h(ap2));
  const findNote = (r, list) => ((r.json && r.json.data && r.json.data[list]) || []).find((n) => n.id === pastId);
  const nA = await call('GET', '/provider/notes', tok1);
  check('notes worklist: finished session without a note is MISSING', findNote(nA, 'pendingNotes') && findNote(nA, 'pendingNotes').status === 'MISSING', h(nA));
  await call('POST', `/appointments/${pastId}/cnr`, tok1, { notes: 'draft text', therapistSigned: false });
  const nB = await call('GET', '/provider/notes', tok1);
  check('notes worklist: saved but unsigned note is DRAFT', findNote(nB, 'pendingNotes') && findNote(nB, 'pendingNotes').status === 'DRAFT', h(nB));
  await call('POST', `/appointments/${pastId}/cnr`, tok1, { notes: 'final text', therapistSigned: true });
  const nC = await call('GET', '/provider/notes', tok1);
  check('notes worklist: signed note moves to completed as SIGNED', findNote(nC, 'completedNotes') && findNote(nC, 'completedNotes').status === 'SIGNED' && !findNote(nC, 'pendingNotes'), h(nC));
  check('notes worklist never contains note text', !JSON.stringify(nC.json).includes('final text'));
  const nD = await call('GET', '/provider/notes', tok2);
  check('notes worklist: therapist 2 sees none of therapist 1\'s sessions', !findNote(nD, 'pendingNotes') && !findNote(nD, 'completedNotes'), h(nD));

  // ---------- audit trail ----------
  await new Promise((r) => setTimeout(r, 800));
  const logs = await prisma.auditLog.findMany({ where: { entityId: apptId } });
  check('PHI reads were audited', logs.some((l) => l.action === 'PHI_VIEW'), logs.length + ' audit rows');
  check('denied attempts were audited', logs.some((l) => l.details && l.details.outcome === 'DENIED_OR_FAILED'));
  check('audit rows contain no note text', !JSON.stringify(logs).includes('secret'));

  console.log(`\nTo look at the provider portal as therapist 1 in the browser: ${t1.email}  /  ${STRONG}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) { console.log('FAILED:\n - ' + failed.map((f) => f.name).join('\n - ')); process.exitCode = 1; }
})()
  .catch((e) => { console.error('\nSmoke test aborted:', e.message); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
