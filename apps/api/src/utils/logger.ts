import pino from 'pino';
import { env } from '../config/env';

const isDevelopment = env.NODE_ENV === 'development';

export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  // Development me pino-pretty use karenge format karne ke liye
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    // Level ko string me format karne ke liye (e.g., "level": "INFO" instead of "level": 30)
    level: (label) => {
      return { level: label.toUpperCase() };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
