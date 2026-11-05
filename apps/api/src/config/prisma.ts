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
  });

if (env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
