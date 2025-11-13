import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
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
  max: 5, // Limit each IP to 5 login/register requests per windowMs
  skipSuccessfulRequests: true,
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
