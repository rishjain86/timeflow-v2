import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Pick requestId securely from res.locals set by requestId middleware
    const requestId = res.locals.requestId || 'N/A';
    
    // Client IP extraction
    const ip = req.ip || req.socket.remoteAddress || 'Unknown';
    
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId,
      ip,
      userAgent: req.get('user-agent') || 'Unknown',
    };

    if (res.statusCode >= 500) {
      logger.error(
        logData, 
        `${req.method} ${req.originalUrl} failed with status ${res.statusCode}`
      );
    } else if (res.statusCode >= 400) {
      logger.warn(
        logData, 
        `${req.method} ${req.originalUrl} returned client error ${res.statusCode}`
      );
    } else {
      logger.info(
        logData, 
        `${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`
      );
    }
  });

  next();
};
