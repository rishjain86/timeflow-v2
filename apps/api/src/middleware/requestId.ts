import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const existingId = req.headers['x-request-id'];

  // Ensure request ID exists and is a valid string, otherwise generate a new one
  const reqId = 
    typeof existingId === 'string' && existingId.trim() !== ''
      ? existingId
      : randomUUID();

  // Attach to request headers so downstream middlewares (like requestLogger) can use it
  req.headers['x-request-id'] = reqId;

  // Set in the response header so the client/frontend knows the tracing ID
  res.setHeader('X-Request-Id', reqId);

  next();
};
