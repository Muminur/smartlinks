import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter - skips authenticated users
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for authenticated users (they have their own higher limits)
  skip: (req: Request) => {
    const authHeader = req.headers.authorization;
    return !!(authHeader && authHeader.startsWith('Bearer '));
  },
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
      },
    });
  },
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 failed login/register requests per windowMs
  skipSuccessfulRequests: true, // Only count failed attempts - successful logins don't count
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later.',
    },
  },
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later.',
      },
    });
  },
});

// Link creation rate limiter (general for all users)
// Note: This is a basic IP-based rate limiter
// For more advanced plan-based rate limiting, implement custom middleware
// that checks user's plan from the database and applies different limits
export const createLinkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 link creations per hour (generous for authenticated users)
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: {
      code: 'LINK_CREATION_LIMIT_EXCEEDED',
      message: 'Link creation limit exceeded. Please try again later.',
    },
  },
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: {
        code: 'LINK_CREATION_LIMIT_EXCEEDED',
        message: 'Link creation limit exceeded. Please try again later.',
      },
    });
  },
});

/**
 * Rate limiter specifically for guest/non-authenticated users
 * More restrictive than authenticated users
 */
export const createLinkLimiterForGuests = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit guest users to 10 link creations per hour
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: {
      code: 'GUEST_LINK_LIMIT_EXCEEDED',
      message: 'Guest users can only create 10 links per hour. Sign up for unlimited access.',
    },
  },
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: {
        code: 'GUEST_LINK_LIMIT_EXCEEDED',
        message: 'Guest users can only create 10 links per hour. Sign up for unlimited access.',
      },
    });
  },
});

/**
 * Rate limiter specifically for authenticated users
 * Very high limits to avoid blocking legitimate users
 */
export const createLinkLimiterForAuthUsers = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit authenticated users to 1000 link creations per hour (virtually unlimited)
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_USER_LINK_LIMIT_EXCEEDED',
      message: 'You have reached the maximum link creation limit. Please contact support if you need higher limits.',
    },
  },
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_USER_LINK_LIMIT_EXCEEDED',
        message: 'You have reached the maximum link creation limit. Please contact support if you need higher limits.',
      },
    });
  },
});

/**
 * Plan-based rate limiters
 * These can be applied based on user's subscription plan
 *
 * Usage example:
 * router.post('/shorten', authenticateToken, getPlanBasedLimiter, shortenUrlController);
 */

// Free plan: 10 links per hour
export const freePlanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'FREE_PLAN_LIMIT_EXCEEDED',
      message: 'Free plan limit: 10 links per hour. Upgrade to Pro for more.',
    },
  },
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: {
        code: 'FREE_PLAN_LIMIT_EXCEEDED',
        message: 'Free plan limit: 10 links per hour. Upgrade to Pro for more.',
      },
    });
  },
});

// Pro plan: 100 links per hour
export const proPlanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'PRO_PLAN_LIMIT_EXCEEDED',
      message: 'Pro plan limit: 100 links per hour. Upgrade to Business for more.',
    },
  },
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: {
        code: 'PRO_PLAN_LIMIT_EXCEEDED',
        message: 'Pro plan limit: 100 links per hour. Upgrade to Business for more.',
      },
    });
  },
});

// Business plan: 500 links per hour
export const businessPlanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    error: {
      code: 'BUSINESS_PLAN_LIMIT_EXCEEDED',
      message: 'Business plan limit: 500 links per hour.',
    },
  },
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: {
        code: 'BUSINESS_PLAN_LIMIT_EXCEEDED',
        message: 'Business plan limit: 500 links per hour.',
      },
    });
  },
});

// Enterprise plan: No rate limit (very high limit)
export const enterprisePlanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10000, // Effectively unlimited
  skipSuccessfulRequests: false,
});

// No-op limiter for authenticated users (effectively no limit)
export const noOpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100000, // Extremely high limit that will never be reached
  skip: () => true, // Skip all requests
});
