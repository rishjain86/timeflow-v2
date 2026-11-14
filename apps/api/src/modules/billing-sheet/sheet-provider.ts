/**
 * What the sync engine needs from a destination for the billing sheet. Google Sheets implements it today
 * (google-sheets.provider.ts); Excel on SharePoint (Microsoft Graph) or Box can implement the same four methods
 * without touching the sync logic.
 */
export type SheetCell = string | number | null;

export interface SheetProvider {
  /** Checks that the sheet can be reached and written; returns its title. Throws a readable error otherwise. */
  verify(): Promise<string>;
  /** Creates the tab if it does not exist yet. */
  ensureTab(title: string): Promise<void>;
  /** All used cells of a tab, row by row (rows may be shorter than the header). Numbers stay numbers. */
  readValues(title: string): Promise<SheetCell[][]>;
  /** Replaces the whole content of a tab, header row included. */
  writeValues(title: string, values: SheetCell[][]): Promise<void>;
}

/** Keeps tabs in memory. Used by tests and handy for local development. */
export class InMemorySheetProvider implements SheetProvider {
  tabs = new Map<string, SheetCell[][]>();
  async verify(): Promise<string> {
    return 'In-memory sheet';
  }
  async ensureTab(title: string): Promise<void> {
    if (!this.tabs.has(title)) this.tabs.set(title, []);
  }
  async readValues(title: string): Promise<SheetCell[][]> {
    return (this.tabs.get(title) ?? []).map((r) => [...r]);
  }
  async writeValues(title: string, values: SheetCell[][]): Promise<void> {
    this.tabs.set(title, values.map((r) => [...r]));
  }
}
