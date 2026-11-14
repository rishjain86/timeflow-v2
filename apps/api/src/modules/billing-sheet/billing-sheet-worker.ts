import { GoogleSheetsProvider, parseServiceAccount } from './google-sheets.provider';
import { markRecentMonthsDirty, runSyncCycle, ProviderFactory } from './billing-sheet-sync.service';

export const defaultProviderFactory: ProviderFactory = async (connection) => {
  if (connection.provider !== 'google') throw new Error(`Unsupported sheet provider: ${connection.provider}`);
  return new GoogleSheetsProvider(connection.spreadsheetId, parseServiceAccount(process.env.GOOGLE_SERVICE_ACCOUNT_JSON));
};

/**
 * Background job: every 15 seconds it refreshes the external sheet for any month that changed, and every
 * 10 minutes it re-checks the current and previous month. Run it on ONE API instance (set
 * BILLING_SHEET_WORKER=off on the others).
 */
export const startBillingSheetWorker = (): void => {
  if (process.env.BILLING_SHEET_WORKER === 'off') return;
  let running = false;
  let ticks = 0;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      ticks++;
      if (ticks % 40 === 1) await markRecentMonthsDirty();
      await runSyncCycle(defaultProviderFactory);
    } catch (err) {
      console.error('[billing-sheet] worker error', err);
    } finally {
      running = false;
    }
  }, 15_000);
  timer.unref?.();
};
