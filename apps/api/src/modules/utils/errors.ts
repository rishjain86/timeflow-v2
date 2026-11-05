export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
  }
}
export class BadRequestError extends AppError { constructor(msg: string) { super(msg, 400); } }
export class NotFoundError extends AppError { constructor(msg: string) { super(msg, 404); } }
export class UnauthorizedError extends AppError { constructor(msg: string) { super(msg, 401); } }
export class ForbiddenError extends AppError { constructor(msg: string) { super(msg, 403); } }
