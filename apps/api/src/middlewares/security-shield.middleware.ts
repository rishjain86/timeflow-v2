import { Request, Response, NextFunction } from 'express';

// ============================================================================
// 1. ENV VARIABLES & PRODUCTION DEBUG CHECKER
// ============================================================================
export const validateSecurityEnvironment = (): void => {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

  if (missingVars.length > 0) {
    console.error(`🚨 [SECURITY ALERT] Missing critical environment variables: ${missingVars.join(', ')}`);
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 16) {
    console.warn('⚠️ [SECURITY WARNING] JWT_SECRET is too short. Use at least 32 characters in production.');
  }

  if (process.env.NODE_ENV === 'production') {
    console.log('🔒 [SECURITY SHIELD] Running in strict PRODUCTION mode. Debug stack traces are disabled.');
  }
};

// ============================================================================
// 2. EXPOSED FILES BLOCKER (.env, .git, prisma, configs)
// ============================================================================
export const blockExposedFiles = (req: Request, res: Response, next: NextFunction): void => {
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
  const isForbidden = forbiddenPatterns.some((pattern) => pattern.test(requestedPath));

  if (isForbidden) {
    res.status(403).json({
      success: false,
      message: 'Access Denied: Protected system resource.',
    });
    return;
  }

  next();
};

// ============================================================================
// 3. SECURITY HEADERS (Zero-Dependency Helmet Equivalent)
// ============================================================================
export const enterpriseSecurityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Prevent Clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Enable XSS filter in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Control Referrer Data leakage
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Enforce HTTPS (HSTS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Restrict hardware access (Camera, Mic, Geolocation)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  // Remove Express fingerprint header
  res.removeHeader('X-Powered-By');

  next();
};

// ============================================================================
// 4. NATIVE MEMORY RATE LIMITER (Protects API & Auth Routes from Brute-Force)
// ============================================================================
interface RateRecord {
  count: number;
  resetTime: number;
}

const ipStore = new Map<string, RateRecord>();

// Clean up expired IPs every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of ipStore.entries()) {
    if (now > value.resetTime) {
      ipStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export const createRateLimiter = (maxRequests: number, windowMinutes: number) => {
  const windowMs = windowMinutes * 60 * 1000;

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limiting for preflight CORS OPTIONS requests
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      'unknown_ip';

    const key = `${clientIp}:${req.baseUrl || 'global'}`;
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
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        message: `Too many requests detected. Please wait ${retryAfterSeconds} seconds before trying again.`,
      });
      return;
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, maxRequests - record.count)));
    next();
  };
};

// Global API limiter (300 requests per 15 mins) & Strict Auth limiter (25 requests per 15 mins)
export const globalApiLimiter = createRateLimiter(300, 15);
export const strictAuthLimiter = createRateLimiter(25, 15);

// ============================================================================
// 5. XSS BLOCKER &DEEP FORM SANITIZER (Preserves Base64 Uploads Safely)
// ============================================================================
const cleanStringValue = (val: string, fieldKey?: string): string => {
  // CRITICAL: Do NOT corrupt Base64 data URI uploads (CNR & Attendance Documents)
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
    // Remove <script>...</script> blocks
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove inline event handlers like onload=, onerror=, onclick=
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: and vbscript: pseudo-protocols
    .replace(/javascript\s*:/gi, '')
    .replace(/vbscript\s*:/gi, '')
    // Remove dangerous <iframe>, <object>, <embed> tags
    .replace(/<\/?(iframe|object|embed|applet|meta|link|style)\b[^>]*>/gi, '')
    .trim();
};

const sanitizeObjectRecursive = (obj: any, parentKey?: string): any => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return cleanStringValue(obj, parentKey);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectRecursive(item, parentKey));
  }

  if (typeof obj === 'object' && !(obj instanceof Date) && !Buffer.isBuffer(obj)) {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      // Prevent Prototype Pollution attacks (__proto__, constructor, prototype)
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleaned[key] = sanitizeObjectRecursive(obj[key], key);
    }
    return cleaned;
  }

  return obj;
};

export const xssAndFormSanitizer = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObjectRecursive(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      const sanitizedQuery = sanitizeObjectRecursive(req.query);
      for (const key of Object.keys(req.query)) {
        (req.query as any)[key] = sanitizedQuery[key];
      }
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObjectRecursive(req.params);
    }
  } catch (err) {
    console.error('Sanitizer non-fatal error:', err);
  }
  next();
};

// ============================================================================
// 6. STRICT CORS VALIDATOR HELPER
// ============================================================================
export const getAllowedCorsOrigins = (): string[] => {
  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://timeflow-erp.vercel.app',
  ];

  const envOrigins = process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '';
  if (envOrigins) {
    const splitOrigins = envOrigins.split(',').map((o) => o.trim()).filter(Boolean);
    return Array.from(new Set([...defaultOrigins, ...splitOrigins]));
  }

  return defaultOrigins;
};

// ============================================================================
// 7. PRODUCTION SAFE ERROR HANDLER (Hides Debug Stack Traces in Prod)
// ============================================================================
export const safeProductionErrorMask = (
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected error occurred.',
    // Never leak file paths or Prisma stack traces in production
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
