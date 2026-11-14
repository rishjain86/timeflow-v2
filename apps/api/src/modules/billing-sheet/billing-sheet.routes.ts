import { Router, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requireRole, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { actorStorage } from '../../utils/request-context';
import { exportCsv, getBillingSheet, getMonths, saveManual } from './billing-sheet.service';
import { isMonthKey } from './billing-sheet.builder';
import { prisma } from '../../config/prisma';
import { GoogleSheetsProvider, parseServiceAccount, parseSpreadsheetId, serviceAccountEmail } from './google-sheets.provider';
import { syncMonth } from './billing-sheet-sync.service';

const router = Router();

// The sheet contains patient names, rates and amounts: management only.
router.use(authenticate);
router.use(requireRole([Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER]));

const monthSchema = z.string().refine(isMonthKey, { message: 'month must look like 2026-11' });
const currentMonth = () => new Date().toISOString().slice(0, 7);

router.get('/months', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ success: true, data: await getMonths(req.user!.organizationId!) });
  } catch (error) {
    next(error);
  }
});

router.get('/export', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const month = monthSchema.parse(req.query.month ?? currentMonth());
    const tab = z.enum(['entries', 'summary', 'changes']).parse(req.query.tab ?? 'entries');
    const csv = await exportCsv(req.user!.organizationId!, month, tab);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="billing-sheet-${month}-${tab}.csv"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
});

const manualSchema = z.object({
  month: monthSchema,
  projectId: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  prevPayHours: z.number().min(0).max(100000).nullable().optional(),
  invoiceNumber: z.string().trim().max(100).nullable().optional(),
  invoiceAmount: z.number().min(0).max(1e9).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

router.put('/manual', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = manualSchema.parse(req.body);
    const actor = actorStorage.getStore();
    const saved = await saveManual(req.user!.organizationId!, { id: req.user!.id, name: actor?.name ?? null }, body);
    res.status(200).json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
});

// ---------- connection to the live external sheet (admins only) ----------
const adminOnly = requireRole([Role.SUPER_ADMIN, Role.ADMIN]);
const recentMonths = (): string[] => {
  const now = new Date();
  return [now.toISOString().slice(0, 7), new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7)];
};

router.get('/connection', adminOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const connection = await prisma.billingSheetConnection.findUnique({ where: { organizationId: req.user!.organizationId! } });
    res.status(200).json({
      success: true,
      data: {
        serverConfigured: !!serviceAccountEmail(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
        serviceAccountEmail: serviceAccountEmail(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
        connection: connection && {
          provider: connection.provider,
          spreadsheetId: connection.spreadsheetId,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${connection.spreadsheetId}`,
          enabled: connection.enabled,
          lastSyncAt: connection.lastSyncAt,
          lastError: connection.lastError,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.put('/connection', adminOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const body = z.object({ spreadsheet: z.string().trim().min(10).max(500) }).parse(req.body);
    const organizationId = req.user!.organizationId!;
    const spreadsheetId = parseSpreadsheetId(body.spreadsheet);

    // Prove we can reach and write the sheet before saving anything.
    const provider = new GoogleSheetsProvider(spreadsheetId, parseServiceAccount(process.env.GOOGLE_SERVICE_ACCOUNT_JSON));
    const title = await provider.verify();

    await prisma.billingSheetConnection.upsert({
      where: { organizationId },
      update: { spreadsheetId, enabled: true, lastError: null },
      create: { organizationId, spreadsheetId, provider: 'google', enabled: true },
    });
    for (const monthKey of recentMonths()) {
      await prisma.billingSheetDirty.upsert({
        where: { organizationId_monthKey: { organizationId, monthKey } },
        update: { requestedAt: new Date() },
        create: { organizationId, monthKey },
      });
    }
    res.status(200).json({ success: true, message: `Connected to "${title}". The first sync starts within a minute.`, data: { title } });
  } catch (error) {
    // Show a readable message (missing server key, sheet not shared, wrong link...) instead of a generic 500.
    if (error instanceof Error && !(error instanceof z.ZodError)) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

router.delete('/connection', adminOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.billingSheetConnection.deleteMany({ where: { organizationId: req.user!.organizationId! } });
    res.status(200).json({ success: true, message: 'Disconnected. The sheet itself was left untouched.' });
  } catch (error) {
    next(error);
  }
});

router.post('/sync', adminOnly, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const organizationId = req.user!.organizationId!;
  try {
    const month = monthSchema.parse(req.body?.month ?? currentMonth());
    const connection = await prisma.billingSheetConnection.findUnique({ where: { organizationId } });
    if (!connection) {
      res.status(400).json({ success: false, message: 'No sheet is connected yet.' });
      return;
    }
    const provider = new GoogleSheetsProvider(connection.spreadsheetId, parseServiceAccount(process.env.GOOGLE_SERVICE_ACCOUNT_JSON));
    const result = await syncMonth(provider, organizationId, month);
    await prisma.billingSheetConnection.update({ where: { organizationId }, data: { lastSyncAt: new Date(), lastError: null } });
    res.status(200).json({ success: true, message: 'Synced', data: result });
  } catch (error) {
    if (error instanceof Error && !(error instanceof z.ZodError)) {
      await prisma.billingSheetConnection.update({ where: { organizationId }, data: { lastError: error.message.slice(0, 500) } }).catch(() => undefined);
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const month = monthSchema.parse(req.query.month ?? currentMonth());
    res.status(200).json({ success: true, data: await getBillingSheet(req.user!.organizationId!, month) });
  } catch (error) {
    next(error);
  }
});

export default router;
