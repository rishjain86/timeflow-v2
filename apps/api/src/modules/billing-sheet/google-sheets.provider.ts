import crypto from 'crypto';
import { SheetCell, SheetProvider } from './sheet-provider';

export interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export const parseServiceAccount = (raw: string | undefined): ServiceAccount => {
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not configured on the server.');
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON (paste the whole key file on a single line).');
  }
  if (!json.client_email || !json.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON must contain client_email and private_key.');
  }
  return { client_email: json.client_email, private_key: json.private_key, token_uri: json.token_uri };
};

export const serviceAccountEmail = (raw: string | undefined): string | null => {
  try {
    return parseServiceAccount(raw).client_email;
  } catch {
    return null;
  }
};

export const parseSpreadsheetId = (input: string): string => {
  const text = input.trim();
  const fromUrl = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (fromUrl) return fromUrl[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(text)) return text;
  throw new Error('That does not look like a Google Sheets link. Paste the full link of the sheet.');
};

// Minimal HTTP types, so the build does not depend on which global `fetch` typings are installed.
interface HttpInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: any;
}
interface HttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text(): Promise<string>;
}
type FetchLike = (url: string, init: HttpInit) => Promise<HttpResponse>;

const b64url = (data: Buffer | string): string => Buffer.from(data).toString('base64url');
const a1 = (title: string): string => `'${title.replace(/'/g, "''")}'`;

/** Google Sheets over plain HTTPS with a service-account login (no extra dependencies). */
export class GoogleSheetsProvider implements SheetProvider {
  private token: { value: string; expiresAt: number } | null = null;
  private tabIds: Map<string, number> | null = null;

  constructor(
    private readonly spreadsheetId: string,
    private readonly account: ServiceAccount,
    private readonly opts: { apiBase?: string; fetchImpl?: FetchLike } = {}
  ) {}

  private get api(): string {
    return this.opts.apiBase ?? process.env.GOOGLE_SHEETS_API_BASE ?? 'https://sheets.googleapis.com';
  }

  private async request(url: string, init: HttpInit, authenticated = true): Promise<any> {
    const headers: Record<string, string> = { ...(init.headers ?? {}) };
    if (authenticated) headers.Authorization = `Bearer ${await this.accessToken()}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const doFetch: FetchLike = this.opts.fetchImpl ?? (globalThis as any).fetch;
      const res = await doFetch(url, { ...init, headers, signal: controller.signal });
      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        /* non-JSON body */
      }
      if (!res.ok) {
        const message = json?.error?.message || json?.error_description || text.slice(0, 200) || res.statusText;
        const hint =
          res.status === 403 || res.status === 404
            ? ` Make sure the sheet is shared with ${this.account.client_email} as an Editor.`
            : '';
        throw new Error(`Google API ${res.status}: ${message}.${hint}`);
      }
      return json;
    } finally {
      clearTimeout(timer);
    }
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const now = Math.floor(Date.now() / 1000);
    const tokenUri = this.account.token_uri || 'https://oauth2.googleapis.com/token';
    const unsigned =
      `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.` +
      b64url(
        JSON.stringify({
          iss: this.account.client_email,
          scope: 'https://www.googleapis.com/auth/spreadsheets',
          aud: tokenUri,
          iat: now,
          exp: now + 3600,
        })
      );
    const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(this.account.private_key);
    const json = await this.request(
      tokenUri,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: `${unsigned}.${b64url(signature)}`,
        }).toString(),
      },
      false
    );
    if (!json?.access_token) throw new Error('Google did not return an access token.');
    this.token = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) || 3600) * 1000 };
    return this.token.value;
  }

  private base(): string {
    return `${this.api}/v4/spreadsheets/${encodeURIComponent(this.spreadsheetId)}`;
  }

  async verify(): Promise<string> {
    const json = await this.request(`${this.base()}?fields=properties.title`, { method: 'GET' });
    return json?.properties?.title ?? 'Untitled spreadsheet';
  }

  private async loadTabs(): Promise<Map<string, number>> {
    const json = await this.request(`${this.base()}?fields=sheets.properties(sheetId,title)`, { method: 'GET' });
    this.tabIds = new Map(((json?.sheets as any[]) ?? []).map((s) => [s.properties.title as string, s.properties.sheetId as number]));
    return this.tabIds;
  }

  async ensureTab(title: string): Promise<void> {
    const tabs = this.tabIds ?? (await this.loadTabs());
    if (tabs.has(title)) return;
    const res = await this.request(`${this.base()}:batchUpdate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } }] }),
    });
    const sheetId = res?.replies?.[0]?.addSheet?.properties?.sheetId;
    tabs.set(title, sheetId);
    try {
      // Cosmetic: bold header row. Failure must never block the sync.
      await this.request(`${this.base()}:batchUpdate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                cell: { userEnteredFormat: { textFormat: { bold: true } } },
                fields: 'userEnteredFormat.textFormat.bold',
              },
            },
          ],
        }),
      });
    } catch {
      /* ignore */
    }
  }

  async readValues(title: string): Promise<SheetCell[][]> {
    const json = await this.request(
      `${this.base()}/values/${encodeURIComponent(a1(title))}?valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`,
      { method: 'GET' }
    );
    return (json?.values as SheetCell[][]) ?? [];
  }

  async writeValues(title: string, values: SheetCell[][]): Promise<void> {
    await this.request(`${this.base()}/values/${encodeURIComponent(a1(title))}:clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (values.length === 0) return;
    // RAW: text is stored exactly as given, so a description such as "=HYPERLINK(...)" can never become a formula.
    await this.request(`${this.base()}/values/${encodeURIComponent(`${a1(title)}!A1`)}?valueInputOption=RAW`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ majorDimension: 'ROWS', values: values.map((r) => r.map((c) => (c === null ? '' : c))) }),
    });
  }
}
