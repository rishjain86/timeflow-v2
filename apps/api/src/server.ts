import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { prisma } from './config/prisma';
import { env } from './config/env';

// --- Legacy / Existing Routes (from src/routes/) ---
import attachmentRoutes from './routes/attachment.routes';
import auditRoutes from './routes/audit.routes';
import authRoutes from './routes/auth';
import clientRoutes from './routes/client.routes';
import commentRoutes from './routes/comment.routes';
import dashboardRoutes from './routes/dashboard.routes';
import expenseRoutes from './routes/expense.routes';
import healthRoutes from './routes/health';
import invoiceRoutes from './routes/invoice.routes';
import leaveRoutes from './routes/leave.routes';
import notificationRoutes from './routes/notification.routes';
import projectRoutes from './routes/project.routes';
import reportRoutes from './routes/report.routes';
import settingsRoutes from './routes/settings.routes';
import taskRoutes from './routes/task.routes';
import teamRoutes from './routes/team.routes';
import userRoutes from './routes/user.routes';

// --- Modular Routes ---
import authorizationRoutes from './modules/authorization/authorization.routes';
import fundingSourceRoutes from './modules/funding-source/funding-source.routes';
import budgetRoutes from './modules/budget/budget.routes';
import organizationRoutes from './modules/organizations/organization.routes';
import timeEntryRoutes from './modules/time-entry/time-entry.routes'; 

// --- Sprint 6 Routes ---
import projectBudgetRoutes from './modules/project-budget/project-budget.routes';

// 🟢 Billing Routes Import
import billingRoutes from './modules/billing/billing.routes';
import appointmentRoutes from './modules/appointment/appointment.routes';
import therapistRoutes from './modules/therapist/therapist.routes';
import serviceCodeRoutes from './modules/service-code/service-code.routes';
import providerPortalRoutes from './modules/provider-portal/provider-portal.routes';
import { phiGuard } from './middleware/phi-guard.middleware';
import { assertPhiKeyConfigured } from './utils/phi-crypto';

// Middlewares and Utils
import { errorHandler } from './middleware/errorHandler'; 

const app: Application = express();

// Trust Render / Vercel reverse proxy for accurate IP rate-limiting
app.set('trust proxy', 1);
app.disable('x-powered-by');

// ============================================================================
// 🛡️ INLINE 16-POINT SECURITY SHIELD (Zero External Dependencies)
// ============================================================================

const validateSecurityEnvironment = (): void => {
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = requiredVars.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.warn(`⚠️ [SECURITY ALERT] Missing environment variables: ${missing.join(', ')}`);
  }
};
validateSecurityEnvironment();

// Block Exposed Sensitive Files (.env, .git, prisma, configs)
const blockExposedFiles = (req: Request, res: Response, next: NextFunction): void => {
  const forbiddenPatterns = [
    /\.env/i,
    /\.git/i,
    /\.vscode/i,
    /package\.json/i,
    /package-lock\.json/i,
    /tsconfig\.json/i,
    /schema\.prisma/i,
    /docker-compose/i,
    /\.sql$/i,
    /\.bak$/i,
    /\.log$/i,
  ];
  const requestedPath = req.path || req.url;
  if (forbiddenPatterns.some((pattern) => pattern.test(requestedPath))) {
    res.status(403).json({ success: false, message: 'Access Denied: Protected system resource.' });
    return;
  }
  next();
};

// Native Memory Rate Limiter
interface RateRecord {
  count: number;
  resetTime: number;
}
const ipStore = new Map<string, RateRecord>();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ipStore.entries()) {
    if (now > value.resetTime) ipStore.delete(key);
  }
}, 10 * 60 * 1000);

const createRateLimiter = (maxRequests: number, windowMinutes: number, scope: string) => {
  const windowMs = windowMinutes * 60 * 1000;
  return (req: Request, res: Response, next: NextFunction): void => {
    if (
      req.method === 'OPTIONS' ||
      req.path === '/api/health' ||
      req.path.startsWith('/api/v1/health')
    ) {
      next();
      return;
    }
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown_ip';
    const key = `${scope}:${clientIp}`;
    const now = Date.now();
    const record = ipStore.get(key);

    if (!record || now > record.resetTime) {
      ipStore.set(key, { count: 1, resetTime: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(maxRequests - 1));
      next();
      return;
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({
        success: false,
        message: `Too many requests detected. Please wait ${retryAfter} seconds before trying again.`,
      });
      return;
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - record.count)));
    next();
  };
};

const globalApiLimiter = createRateLimiter(400, 15, 'server_global_api');
const strictAuthLimiter = createRateLimiter(30, 15, 'server_auth_api');

// Deep XSS & Form Input Sanitizer
const cleanStringValue = (val: string, fieldKey?: string): string => {
  if (
    val.startsWith('data:image/') ||
    val.startsWith('data:application/pdf') ||
    fieldKey === 'cnrDocumentUrl' ||
    fieldKey === 'attendanceDocumentUrl' ||
    fieldKey === 'password' ||
    fieldKey === 'currentPassword' ||
    fieldKey === 'newPassword'
  ) {
    return val;
  }
  return val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    .replace(/<\/?(iframe|object|embed|applet|meta|link|style)\b[^>]*>/gi, '')
    .trim();
};

const sanitizeRecursive = (obj: any, parentKey?: string): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return cleanStringValue(obj, parentKey);
  if (Array.isArray(obj)) return obj.map((item) => sanitizeRecursive(item, parentKey));
  if (typeof obj === 'object' && !(obj instanceof Date) && !Buffer.isBuffer(obj)) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      cleaned[key] = sanitizeRecursive(obj[key], key);
    }
    return cleaned;
  }
  return obj;
};

const xssAndFormSanitizer = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.body && typeof req.body === 'object') req.body = sanitizeRecursive(req.body);
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitizeRecursive(req.query);
      for (const key of Object.keys(req.query)) {
        (req.query as any)[key] = sanitizedQuery[key];
      }
    }
    if (req.params && typeof req.params === 'object') req.params = sanitizeRecursive(req.params);
  } catch (e) {
    // Non-fatal sanitizer fallback
  }
  next();
};

// Safe CORS Configuration (explicit allowlist only)
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : []),
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL.trim()] : []),
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients (curl, server-to-server, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
};

// --- Core Middlewares ---
app.use(blockExposedFiles);
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  })
); 
app.use(cors(corsOptions));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(xssAndFormSanitizer);
app.use(globalApiLimiter);

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), { dotfiles: 'deny' }));


// --- Routes ---
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', strictAuthLimiter, authRoutes);

app.use('/api/v1/attachments', attachmentRoutes);
app.use('/api/v1/audits', auditRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/dashboards', dashboardRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/time-entries', timeEntryRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/organizations', organizationRoutes);

app.use('/api/v1/authorizations', authorizationRoutes);
app.use('/api/v1/funding-sources', fundingSourceRoutes);
app.use('/api/v1/budgets', budgetRoutes);

app.use('/api/v1/project-budgets', projectBudgetRoutes);
app.use('/api/v1/billing', billingRoutes);

// Healthcare modules (protected health information: no-store caching + audited access)
assertPhiKeyConfigured();
app.use('/api/v1/appointments', phiGuard('APPOINTMENT'), appointmentRoutes);
app.use('/api/v1/therapists', phiGuard('THERAPIST_PROFILE'), therapistRoutes);
app.use('/api/v1/service-codes', serviceCodeRoutes);
app.use('/api/v1/provider', phiGuard('PROVIDER_PORTAL'), providerPortalRoutes);

// Public Health Check Route for UptimeRobot
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: 'TimeFlow API is up and running!', timestamp: new Date().toISOString() });
});

// --- 404 Catch-All ---
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found', path: req.originalUrl });
});

// --- Global Error Handler ---
app.use(errorHandler); 

// --- Bootstrap Server ---
const startServer = async () => {
  try {
    app.listen(env.PORT, () => {
      console.log(`🚀 TimeFlow API running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
