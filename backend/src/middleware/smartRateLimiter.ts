import { Request, Response, NextFunction } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';
import {
  createLinkLimiterForGuests,
  createLinkLimiterForAuthUsers,
  freePlanLimiter,
  proPlanLimiter,
  businessPlanLimiter,
  enterprisePlanLimiter,
  apiLimiter,
  noOpLimiter,
} from './rateLimiter';
import { AuthRequest } from './auth.middleware';
import { logger } from '../utils/logger';

/**
 * Smart rate limiting middleware that differentiates between authenticated and non-authenticated users
 *
 * This middleware provides flexible rate limiting based on user authentication status
 * and subscription plans. It prevents authenticated users from being unnecessarily
 * rate-limited while protecting public endpoints from abuse.
 */

/**
 * Type definitions for rate limiting strategies
 */
type RateLimitStrategy = {
  authenticated: RateLimitRequestHandler;
  unauthenticated: RateLimitRequestHandler;
  planBased?: boolean;
};

/**
 * Creates a smart rate limiter that applies different limits based on authentication status
 *
 * @param options - Configuration for the smart rate limiter
 * @param options.authenticated - Rate limiter for authenticated users
 * @param options.unauthenticated - Rate limiter for non-authenticated users
 * @param options.planBased - Whether to apply plan-based rate limiting for authenticated users
 * @returns Express middleware function
 *
 * @example
 * // Use for link creation with different limits for auth/unauth users
 * router.post('/shorten',
 *   authenticateToken,
 *   smartRateLimiter({
 *     authenticated: createLinkLimiterForAuthUsers,
 *     unauthenticated: createLinkLimiterForGuests
 *   }),
 *   controller
 * );
 */
export const smartRateLimiter = (options: RateLimitStrategy) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      // Check if user is authenticated
      if (user && user.id) {
        logger.debug(`Applying rate limiting for authenticated user: ${user.email}`);

        // Apply plan-based rate limiting if enabled
        if (options.planBased) {
          // This would require fetching the user's plan from the database
          // For now, we'll use the high limit for all authenticated users
          options.authenticated(req, res, next);
        } else {
          // Apply standard authenticated user rate limiting
          options.authenticated(req, res, next);
        }
      } else {
        logger.debug('Applying rate limiting for unauthenticated user');
        // Apply guest rate limiting
        options.unauthenticated(req, res, next);
      }
    } catch (error) {
      logger.error('Smart rate limiter error:', error);
      // If there's an error, be conservative and apply the stricter limit
      options.unauthenticated(req, res, next);
    }
  };
};

/**
 * Pre-configured smart rate limiter for link creation endpoints
 * - Authenticated users: 1000 links per hour (virtually unlimited)
 * - Unauthenticated users: 10 links per hour
 */
export const smartLinkCreationLimiter = smartRateLimiter({
  authenticated: createLinkLimiterForAuthUsers,
  unauthenticated: createLinkLimiterForGuests,
});

/**
 * Pre-configured smart rate limiter for general API endpoints
 * - Authenticated users: No rate limiting
 * - Unauthenticated users: 100 requests per 15 minutes
 */
export const smartApiLimiter = smartRateLimiter({
  authenticated: noOpLimiter,
  unauthenticated: apiLimiter,
});

/**
 * Creates a plan-based rate limiter that applies limits based on user's subscription
 * This requires fetching user plan from database
 *
 * @param getUserPlan - Function to get user's subscription plan
 * @returns Express middleware function
 */
export const createPlanBasedRateLimiter = (
  getUserPlan: (userId: string) => Promise<string>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthRequest;
      const user = authReq.user;

      if (!user || !user.id) {
        // Apply guest rate limiting for unauthenticated users
        createLinkLimiterForGuests(req, res, next);
        return;
      }

      // Get user's subscription plan
      const plan = await getUserPlan(user.id);
      logger.debug(`Applying rate limiting for ${plan} plan user: ${user.email}`);

      // Apply rate limiting based on plan
      switch (plan.toLowerCase()) {
        case 'free':
          freePlanLimiter(req, res, next);
          break;
        case 'pro':
          proPlanLimiter(req, res, next);
          break;
        case 'business':
          businessPlanLimiter(req, res, next);
          break;
        case 'enterprise':
          enterprisePlanLimiter(req, res, next);
          break;
        default:
          // Default to free plan limits if plan is unknown
          freePlanLimiter(req, res, next);
          break;
      }
    } catch (error) {
      logger.error('Plan-based rate limiter error:', error);
      // If there's an error, apply free plan limits as fallback
      freePlanLimiter(req, res, next);
    }
  };
};

/**
 * Middleware that checks authentication status and applies rate limiting conditionally
 * This is a simpler version that completely bypasses rate limiting for authenticated users
 *
 * @param rateLimiter - The rate limiter to apply for unauthenticated users
 * @returns Express middleware function
 *
 * @example
 * // Only apply rate limiting to non-authenticated users
 * router.post('/endpoint',
 *   optionalAuth, // Try to authenticate but don't fail if no token
 *   conditionalRateLimit(createLinkLimiterForGuests),
 *   controller
 * );
 */
export const conditionalRateLimit = (rateLimiter: RateLimitRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthRequest;
    const user = authReq.user;

    // Skip rate limiting entirely for authenticated users
    if (user && user.id) {
      logger.debug(`Skipping rate limiting for authenticated user: ${user.email}`);
      next();
    } else {
      logger.debug('Applying rate limiting for unauthenticated user');
      rateLimiter(req, res, next);
    }
  };
};

/**
 * Export a utility to get the appropriate rate limiter based on authentication
 * This can be used inline in routes
 *
 * @param req - Express request object
 * @returns Appropriate rate limiter
 */
export const getRateLimiterForRequest = (req: Request): RateLimitRequestHandler => {
  const authReq = req as AuthRequest;
  const user = authReq.user;

  if (user && user.id) {
    return createLinkLimiterForAuthUsers;
  } else {
    return createLinkLimiterForGuests;
  }
};

/**
 * Rate limiting strategy configurations for different types of endpoints
 */
export const RateLimitStrategies = {
  /**
   * Strategy for link creation endpoints
   */
  linkCreation: {
    authenticated: createLinkLimiterForAuthUsers,
    unauthenticated: createLinkLimiterForGuests,
  },

  /**
   * Strategy for general API endpoints
   */
  generalApi: {
    authenticated: noOpLimiter, // No limit for authenticated
    unauthenticated: apiLimiter,
  },

  /**
   * Strategy for public endpoints (same for all users)
   */
  public: {
    authenticated: apiLimiter,
    unauthenticated: apiLimiter,
  },
};

export default smartRateLimiter;