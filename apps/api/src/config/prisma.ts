import { PrismaClient } from '@prisma/client';
import { env } from './env';

// Global declaration to prevent multiple Prisma instances in development
declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    // Development me sabhi queries aur logs dikhayega, production me sirf errors
    log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    // Interactive transactions default to waiting 2s for a connection and running for 5s. With a remote/pooled
    // database (e.g. Neon in another region) several sequential queries easily exceed that, so allow more headroom.
    transactionOptions: { maxWait: 15_000, timeout: 30_000 },
  });

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
