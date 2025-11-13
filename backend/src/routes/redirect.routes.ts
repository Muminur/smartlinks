import express from 'express';
import {
  redirectController,
  linkPreviewController,
  getRedirectStats,
  serveBotPage,
} from '../controllers/redirect.controller';
import { detectBot, handleBot, isTrustedBot } from '../middleware/botDetection.middleware';
import rateLimit from 'express-rate-limit';

const router = express.Router();

/**
 * Rate limiter for redirect endpoints
 * More lenient than auth endpoints since redirects are the core feature
 * Prevents abuse while allowing legitimate high-traffic links
 */
const redirectLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for trusted bots
  skip: (req) => {
    const userAgent = req.headers['user-agent'] || '';
    return isTrustedBot(userAgent);
  },
});

/**
 * Rate limiter for preview endpoint (less strict)
 */
const previewLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // Max 50 requests per minute per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many preview requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Link preview endpoint - Get link metadata without redirecting
 * GET /api/links/preview/:slug
 *
 * Use cases:
 * - QR code generation
 * - Link preview cards
 * - Analytics dashboard
 * - Link validation
 */
router.get('/api/links/preview/:slug', previewLimiter, linkPreviewController);

/**
 * Redirect statistics endpoint (admin/monitoring)
 * GET /api/redirect/stats
 *
 * Returns cache statistics and hot links
 */
router.get('/api/redirect/stats', getRedirectStats);

/**
 * Main redirect endpoint - The core feature
 * GET /:slug
 *
 * This is the primary redirect handler that:
 * 1. Checks Redis cache for sub-millisecond response
 * 2. Validates link accessibility
 * 3. Tracks analytics asynchronously
 * 4. Performs HTTP redirect
 *
 * Performance target: < 100ms latency (cache hit: 1-5ms)
 */
router.get(
  '/:slug',
  redirectLimiter,
  detectBot, // Detect if request is from a bot
  handleBot, // Handle bot-specific logic
  async (req, res) => {
    // Special handling for trusted bots (search engines, social media)
    const isBot = (req as any).isBot;
    const userAgent = req.headers['user-agent'] || '';

    if (isBot && isTrustedBot(userAgent)) {
      // Serve HTML page with Open Graph meta tags for crawlers
      return serveBotPage(req, res);
    }

    // Normal redirect for users and untrusted bots
    return redirectController(req, res);
  }
);

export default router;
