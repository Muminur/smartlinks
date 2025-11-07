import { Request, Response, NextFunction } from 'express';
import { AppError, sendErrorResponse } from '../utils/errorHandler';
import { logger } from '../utils/logger';

// Global error handling middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    sendErrorResponse(res, new AppError(err.message, 400));
    return;
  }

  // Handle Mongoose duplicate key errors
  if (err.name === 'MongoServerError' && 'code' in err && err.code === 11000) {
    const message = 'Duplicate field value entered';
    sendErrorResponse(res, new AppError(message, 409));
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    sendErrorResponse(res, new AppError('Invalid token', 401));
    return;
  }

  if (err.name === 'TokenExpiredError') {
    sendErrorResponse(res, new AppError('Token expired', 401));
    return;
  }

  // Handle operational errors
  if (err instanceof AppError) {
    sendErrorResponse(res, err);
    return;
  }

  // Handle unknown errors
  sendErrorResponse(res, err, 500);
};

// 404 Not Found middleware
export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
  const error = new AppError(`Route not found - ${req.originalUrl}`, 404);
  next(error);
};

// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};
