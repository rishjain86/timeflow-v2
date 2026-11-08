import { z } from 'zod';
import * as dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from the root of apps/api directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(16),
  REDIS_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().optional(),
  PHI_ENCRYPTION_KEY: z.string().optional(),
  SESSION_IDLE_TIMEOUT_MINUTES: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM_ADDRESS: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
