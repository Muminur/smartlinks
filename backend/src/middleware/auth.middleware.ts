import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { UnauthorizedError, ForbiddenError } from '../utils/errorHandler';
import { UserRole } from '../types';
import { logger } from '../utils/logger';

/**
 * Extended Request interface with user property
 */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware to authenticate user via JWT token
 * Expects token in Authorization header as "Bearer <token>"
 */
export const authenticateToken = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Invalid token format');
    }

    // Verify token
    const decoded = authService.verifyAccessToken(token);

    // Attach user to request
    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    next(error);
  }
};

/**
 * Middleware to authorize user based on roles
 * Must be used after authenticateToken middleware
 *
 * @param roles - Array of allowed roles
 * @returns Middleware function
 *
 * @example
 * router.get('/admin', authenticateToken, authorizeRoles(UserRole.ADMIN), handler);
 */
export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const user = (req as AuthRequest).user;

      if (!user) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!roles.includes(user.role as UserRole)) {
        throw new ForbiddenError(
          `Access denied. Required roles: ${roles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      next(error);
    }
  };
};

/**
 * Middleware to check if user's email is verified
 * Must be used after authenticateToken middleware
 * Optional - only enforces if configured
 */
export const requireEmailVerification = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const user = authReq.user;

    if (!user) {
      throw new UnauthorizedError('User not authenticated');
    }

    // Get full user details to check email verification
    const fullUser = await authService.getUserById(user.id);

    if (!fullUser.emailVerified) {
      throw new ForbiddenError(
        'Email verification required. Please verify your email to access this resource.'
      );
    }

    next();
  } catch (error) {
    logger.error('Email verification check error:', error);
    next(error);
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't fail if no token
 * Useful for routes that work differently for authenticated vs. non-authenticated users
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token) {
        try {
          const decoded = authService.verifyAccessToken(token);
          (req as AuthRequest).user = {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role,
          };
        } catch {
          // Invalid token, but continue without authentication
          logger.debug('Optional auth failed, continuing without user');
        }
      }
    }

    next();
  } catch {
    // If anything goes wrong, just continue without authentication
    next();
  }
};

/**
 * Middleware to check if user is the owner of a resource or an admin
 * Must be used after authenticateToken middleware
 *
 * @param getUserIdFromRequest - Function to extract the resource owner's ID from request
 * @returns Middleware function
 */
export const requireOwnershipOrAdmin = (
  getUserIdFromRequest: (req: Request) => string
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user) {
        throw new UnauthorizedError('User not authenticated');
      }

      const resourceOwnerId = getUserIdFromRequest(req);

      // Allow if user is the owner or an admin
      if (user.id !== resourceOwnerId && user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('You do not have permission to access this resource');
      }

      next();
    } catch (error) {
      logger.error('Ownership check error:', error);
      next(error);
    }
  };
};

/**
 * Middleware to attach user ID from token to request
 * Similar to authenticateToken but doesn't verify user exists in DB
 * Useful for logout and similar operations
 */
export const extractUserId = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedError('Invalid token format');
    }

    const decoded = authService.verifyAccessToken(token);

    (req as AuthRequest).user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    logger.error('Token extraction error:', error);
    next(error);
  }
};
