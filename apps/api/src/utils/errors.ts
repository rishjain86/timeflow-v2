export class AppError extends Error {
  statusCode: number;
  isOperational: boolean = true;
  errors?: unknown;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}
// Backwards-compatible alias: several controllers use `instanceof CustomError`
export const CustomError = AppError;
export type CustomError = AppError;
export class BadRequestError extends AppError { constructor(msg: string) { super(msg, 400); } }
export class NotFoundError extends AppError { constructor(msg: string) { super(msg, 404); } }
export class UnauthorizedError extends AppError { constructor(msg: string) { super(msg, 401); } }
export class ForbiddenError extends AppError { constructor(msg: string) { super(msg, 403); } }
export class ConflictError extends AppError { constructor(msg: string) { super(msg, 409); } }
export class ValidationError extends AppError { constructor(msg: string) { super(msg, 400); } }
