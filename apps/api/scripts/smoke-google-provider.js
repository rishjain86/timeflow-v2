/* Tests the Google Sheets client against a LOCAL fake Google server (no internet, no real account needed).
 *
 *   pnpm --filter @timeflow/api exec node scripts/smoke-google-provider.js
 *
 * It proves our requests are well-formed (signed login token, tab creation, write, read, error messages).
 * It cannot prove Google's real behaviour; the first real connection does that.
 */
const crypto = require('crypto');
const http = require('http');
const { GoogleSheetsProvider, parseSpreadsheetId, parseServiceAccount, serviceAccountEmail } = require('../dist/modules/billing-sheet/google-sheets.provider');

const results = [];
const check = (name, ok, extra) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '   -> ' + extra : ''}`); };

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
const SID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
const EMAIL = 'svc@timeflow-test.iam.gserviceaccount.com';
const TOKEN = 'tok-123';

const state = { tabs: new Map(), nextId: 1, tokenCalls: 0, tokenOk: false, claims: null, calls: [], failAll: false };
state.tabs.set('Sheet1', { sheetId: 0, values: [] });
const titleOf = (rest) => {
  const m = rest.match(/^'((?:[^']|'')*)'/);
  return m ? m[1].replace(/''/g, "'") : null;
};

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const path = url.pathname;
    const reply = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    state.calls.push(`${req.method} ${path}`);

    if (req.method === 'POST' && path === '/token') {
      state.tokenCalls++;
      const assertion = new URLSearchParams(body).get('assertion') || '';
      const [h, c, s] = assertion.split('.');
      const verified = crypto.createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(s, 'base64url'));
      state.claims = JSON.parse(Buffer.from(c, 'base64url').toString());
      state.tokenOk = verified && JSON.parse(Buffer.from(h, 'base64url').toString()).alg === 'RS256';
      return reply(200, { access_token: TOKEN, expires_in: 3600 });
    }
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return reply(401, { error: { message: 'Invalid credentials' } });
    if (state.failAll) return reply(403, { error: { message: 'The caller does not have permission' } });

    const base = `/v4/spreadsheets/${SID}`;
    if (req.method === 'GET' && path === base) {
      if ((url.searchParams.get('fields') || '').includes('properties.title')) return reply(200, { properties: { title: 'My Billing Sheet' } });
      return reply(200, { sheets: [...state.tabs].map(([title, t]) => ({ properties: { sheetId: t.sheetId, title } })) });
    }
    if (req.method === 'POST' && path === `${base}:batchUpdate`) {
      const replies = JSON.parse(body).requests.map((r) => {
        if (r.addSheet) {
          const id = state.nextId++;
          state.tabs.set(r.addSheet.properties.title, { sheetId: id, values: [] });
          return { addSheet: { properties: { sheetId: id, title: r.addSheet.properties.title } } };
        }
        if (r.repeatCell) state.boldHeader = true;
        return {};
      });
      return reply(200, { replies });
    }
    if (path.startsWith(`${base}/values/`)) {
      const rest = decodeURIComponent(path.slice(`${base}/values/`.length));
      const title = titleOf(rest);
      const tab = state.tabs.get(title);
      if (!tab) return reply(400, { error: { message: `Unable to parse range: ${rest}` } });
      if (req.method === 'POST' && rest.endsWith(':clear')) { tab.values = []; state.cleared = true; return reply(200, {}); }
      if (req.method === 'GET') return reply(200, tab.values.length ? { values: tab.values } : {});
      if (req.method === 'PUT') {
        state.inputOption = url.searchParams.get('valueInputOption');
        tab.values = JSON.parse(body).values;
        return reply(200, { updatedRows: tab.values.length });
      }
    }
    return reply(404, { error: { message: 'not found: ' + path } });
  });
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  const account = { client_email: EMAIL, private_key: privateKey, token_uri: `http://127.0.0.1:${port}/token` };
  const g = new GoogleSheetsProvider(SID, account, { apiBase: `http://127.0.0.1:${port}` });
  try {
    check('a full sheet link and a bare id are both understood', parseSpreadsheetId(`https://docs.google.com/spreadsheets/d/${SID}/edit#gid=0`) === SID && parseSpreadsheetId(SID) === SID);
    let bad = false; try { parseSpreadsheetId('https://example.com/nothing'); } catch { bad = true; }
    check('a link that is not a Google Sheet is rejected', bad);
    check('the key is parsed and the service-account email is shown', serviceAccountEmail(JSON.stringify({ client_email: EMAIL, private_key: 'x' })) === EMAIL && serviceAccountEmail('not json') === null);

    const title = await g.verify();
    check('verify() reaches the sheet and returns its title', title === 'My Billing Sheet', title);
    check('the login token is a correctly SIGNED RS256 JWT with the right claims',
      state.tokenOk && state.claims.iss === EMAIL && /spreadsheets/.test(state.claims.scope) && state.claims.aud === account.token_uri && state.claims.exp - state.claims.iat <= 3600, JSON.stringify(state.claims));

    await g.ensureTab('2026-11 Summary');
    await g.ensureTab('2026-11 Summary');
    check('ensureTab creates a missing tab exactly once', [...state.tabs.keys()].filter((k) => k === '2026-11 Summary').length === 1 && state.calls.filter((c) => c.endsWith(':batchUpdate')).length === 2, state.calls.filter((c) => c.endsWith(':batchUpdate')).length + ' batchUpdate calls (create + bold header)');
    check('...and the header row is made bold', state.boldHeader === true);

    const data = [['Patient', 'Duration', 'Notes'], ['Test Patient', 6, null], ['=HYPERLINK("http://evil")', 1.5, "it's fine"]];
    await g.writeValues('2026-11 Summary', data);
    check('writing clears the tab first and uses RAW input (text can never become a formula)', state.cleared === true && state.inputOption === 'RAW');
    const back = await g.readValues('2026-11 Summary');
    check('what was written can be read back (numbers stay numbers, empty cells are blank)', back[1][0] === 'Test Patient' && back[1][1] === 6 && back[1][2] === '' && back[2][1] === 1.5);
    check('a formula-looking text is stored as plain text', back[2][0] === '=HYPERLINK("http://evil")');

    await g.ensureTab("Plan's tab");
    await g.writeValues("Plan's tab", [['a'], ['b']]);
    check('tab names containing an apostrophe work', (await g.readValues("Plan's tab")).length === 2);
    await g.writeValues('2026-11 Summary', [['only header']]);
    check('rewriting replaces old rows (nothing stale is left behind)', (await g.readValues('2026-11 Summary')).length === 1);

    check('the access token is reused instead of logging in for every call', state.tokenCalls === 1, state.tokenCalls + ' login(s)');

    state.failAll = true;
    let msg = ''; try { await g.readValues('2026-11 Summary'); } catch (e) { msg = e.message; }
    check('a permission error is explained, including who to share the sheet with', /Google API 403/.test(msg) && msg.includes(EMAIL), msg);
  } catch (e) {
    check('no unexpected error', false, e.message);
  } finally {
    server.close();
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
    if (failed.length) { console.log('FAILED:\n - ' + failed.map((x) => x.name).join('\n - ')); process.exitCode = 1; }
  }
});
