import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

// Strict interface for the error response structure
interface ErrorResponse {
  success: boolean;
  message: string;
  requestId: string;
  errors?: unknown;
  stack?: string;
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Prevent Express from crashing if headers were already sent (e.g., during streaming)
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = 'Internal Server Error';
  
  let isOperational = false;
  let errors: unknown = null;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
    errors = err.errors;
  } else {
    message = err.message || message;
    
    // Catch generic Zod validation errors safely
    if (err.name === 'ZodError') {
      statusCode = 400;
      message = 'Validation Error';
      isOperational = true;
    }
  }

  // Details are only shown when NODE_ENV is EXPLICITLY 'development'. An unset NODE_ENV must never leak internals.
  const requestId = res.locals.requestId || 'N/A';

  // Log based on severity
  if (statusCode >= 500) {
    logger.error(
      { err, requestId, path: req.originalUrl, method: req.method },
      `[Unhandled Exception] ${message}`
    );
  } else {
    logger.warn(
      { requestId, path: req.originalUrl, method: req.method, statusCode },
      `[Operational Error] ${message}`
    );
  }

  // Construct response payload with strict types
  const responsePayload: ErrorResponse = {
    success: false,
    message: isOperational || process.env.NODE_ENV === 'development' ? message : 'Internal Server Error',
    requestId,
  };

  // Explicit check to safely include empty arrays [] or empty objects {}
  if (errors !== null && errors !== undefined) {
    responsePayload.errors = errors;
  }

  // Include stack trace only in development mode
  if (process.env.NODE_ENV === 'development') {
    responsePayload.stack = err.stack;
  }

  res.status(statusCode).json(responsePayload);
};
