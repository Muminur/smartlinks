import { Request, Response } from 'express';
import Link from '../models/link.model';
import { logger } from '../utils/logger';
import { CacheService } from '../services/cache.service';
import { trackClick, isLegitimateClick, trackUniqueVisitor } from '../middleware/clickTracking.middleware';

// Link data interface for cached/fetched links
interface LinkData {
  _id?: string;
  userId?: string;
  slug: string;
  originalUrl: string;
  shortUrl?: string;
  title?: string;
  description?: string;
  isActive: boolean;
  expiresAt?: Date | string;
  maxClicks?: number;
  clicks: number;
  password?: string;
  metadata?: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
}

/**
 * Redirect Controller - High-performance link redirect handler
 * Target: Sub-100ms redirect latency with Redis caching
 *
 * Flow:
 * 1. Check Redis cache (1-2ms)
 * 2. If miss, query MongoDB (10-50ms)
 * 3. Validate link (active, not expired, not max clicks)
 * 4. Cache link in Redis
 * 5. Trigger async click tracking (non-blocking)
 * 6. Perform redirect (301/302)
 */
export const redirectController = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { slug } = req.params;

  try {
    // Validate slug parameter
    if (!slug || slug.length < 3) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SLUG',
          message: 'Invalid link slug',
        },
      });
      return;
    }

    // Step 1: Check Redis cache first (fastest path - 1-2ms)
    let link: LinkData | null = await CacheService.getCachedLink(slug) as LinkData | null;
    let cacheHit = false;

    if (link) {
      cacheHit = true;
      logger.debug(`Cache HIT for slug: ${slug} (${Date.now() - startTime}ms)`);
    } else {
      // Step 2: Cache miss - query MongoDB
      const dbStartTime = Date.now();
      const linkDoc = await Link.findOne({ slug }).lean();

      if (!linkDoc) {
        // Link not found - return 404
        const latency = Date.now() - startTime;
        logger.warn(`Link not found: ${slug} (${latency}ms)`);

        res.status(404).json({
          success: false,
          error: {
            code: 'LINK_NOT_FOUND',
            message: 'This short link does not exist or has been removed.',
          },
        });
        return;
      }

      link = linkDoc as unknown as LinkData;
      logger.debug(`DB query for slug: ${slug} (${Date.now() - dbStartTime}ms)`);

      // Cache the link for future requests (1 hour TTL)
      await CacheService.setCachedLink(slug, link as unknown as Record<string, unknown>);
    }

    // Step 3: Validate link is accessible
    const validationError = validateLink(link);
    if (validationError) {
      const latency = Date.now() - startTime;
      logger.warn(`Link validation failed: ${slug} - ${validationError.message} (${latency}ms)`);

      res.status(validationError.statusCode).json({
        success: false,
        error: {
          code: validationError.code,
          message: validationError.message,
        },
      });
      return;
    }

    // Step 4: Handle password-protected links
    if (link.password) {
      // Check if password is provided in query params
      const { pwd } = req.query;

      if (!pwd) {
        // Return password prompt page (you can customize this response)
        const latency = Date.now() - startTime;
        logger.debug(`Password required for link: ${slug} (${latency}ms)`);

        res.status(200).json({
          success: false,
          requiresPassword: true,
          error: {
            code: 'PASSWORD_REQUIRED',
            message: 'This link is password protected. Please provide a password.',
          },
          link: {
            slug,
            title: link.title,
            description: link.description,
          },
        });
        return;
      }

      // Verify password (need to fetch full document with password field)
      if (!cacheHit) {
        const linkWithPassword = await Link.findOne({ slug }).select('+password');
        if (linkWithPassword) {
          const isPasswordCorrect = await linkWithPassword.comparePassword(pwd as string);
          if (!isPasswordCorrect) {
            const latency = Date.now() - startTime;
            logger.warn(`Incorrect password for link: ${slug} (${latency}ms)`);

            res.status(401).json({
              success: false,
              error: {
                code: 'INCORRECT_PASSWORD',
                message: 'Incorrect password. Please try again.',
              },
            });
            return;
          }
        }
      } else {
        // For cached links, we need to verify password against DB
        const linkWithPassword = await Link.findOne({ slug }).select('+password');
        if (linkWithPassword) {
          const isPasswordCorrect = await linkWithPassword.comparePassword(pwd as string);
          if (!isPasswordCorrect) {
            const latency = Date.now() - startTime;
            logger.warn(`Incorrect password for link: ${slug} (${latency}ms)`);

            res.status(401).json({
              success: false,
              error: {
                code: 'INCORRECT_PASSWORD',
                message: 'Incorrect password. Please try again.',
              },
            });
            return;
          }
        }
      }
    }

    // Step 5: Validate click legitimacy (fraud prevention)
    const isLegitimate = await isLegitimateClick(req, slug);

    if (isLegitimate) {
      // Step 6: Track click asynchronously (non-blocking)
      // Use setImmediate to defer execution without blocking redirect
      setImmediate(() => {
        const linkId = '_id' in link && link._id ? link._id.toString() : '';
        const userId = 'userId' in link && link.userId ? link.userId.toString() : '';
        trackClick(req, linkId, userId, slug);
        trackUniqueVisitor(slug, req.ip || 'unknown');
      });
    } else {
      logger.warn(`Suspicious click blocked for link: ${slug}`);
    }

    // Step 7: Perform redirect (301 = permanent, 302 = temporary)
    // Use 302 for tracking purposes (allows re-tracking on repeated visits)
    const redirectType = link.expiresAt ? 302 : 301;
    const latency = Date.now() - startTime;

    logger.info(`Redirecting ${slug} → ${link.originalUrl} (${latency}ms, cache: ${cacheHit})`);

    // Set headers for better SEO and security
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Redirect-Latency', `${latency}ms`);

    // Perform the redirect
    res.redirect(redirectType, link.originalUrl);
  } catch (error: unknown) {
    const latency = Date.now() - startTime;
    logger.error(`Error in redirectController for slug ${slug} (${latency}ms):`, error);

    // Don't expose internal errors to users
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while processing your request. Please try again.',
      },
    });
  }
};

/**
 * Link Preview Controller - Returns link metadata without redirecting
 * Used for showing preview cards, QR codes, or link details
 */
export const linkPreviewController = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const { slug } = req.params;

  try {
    // Validate slug
    if (!slug || slug.length < 3) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SLUG',
          message: 'Invalid link slug',
        },
      });
      return;
    }

    // Check cache first
    let link = await CacheService.getCachedLink(slug);

    if (!link) {
      // Query database
      const linkDoc = await Link.findOne({ slug }).select('-password').lean();

      if (!linkDoc) {
        res.status(404).json({
          success: false,
          error: {
            code: 'LINK_NOT_FOUND',
            message: 'Link not found',
          },
        });
        return;
      }

      link = linkDoc;
      await CacheService.setCachedLink(slug, link);
    }

    const latency = Date.now() - startTime;

    // Return link metadata
    res.status(200).json({
      success: true,
      data: {
        slug: link.slug,
        shortUrl: link.shortUrl,
        originalUrl: link.originalUrl,
        title: link.title,
        description: link.description,
        metadata: link.metadata,
        qrCode: link.qrCode,
        clicks: link.clicks,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt,
        isActive: link.isActive,
        requiresPassword: link.hasPassword || false,
      },
      meta: {
        latency: `${latency}ms`,
      },
    });
  } catch (error: unknown) {
    const latency = Date.now() - startTime;
    logger.error(`Error in linkPreviewController for slug ${slug} (${latency}ms):`, error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch link preview',
      },
    });
  }
};

/**
 * Get redirect statistics (for monitoring/debugging)
 */
export const getRedirectStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const cacheStats = await CacheService.getCacheStats();
    const hotLinks = await CacheService.getHotLinks(10);

    res.status(200).json({
      success: true,
      data: {
        cache: cacheStats,
        hotLinks,
        uptime: process.uptime(),
      },
    });
  } catch (error: unknown) {
    logger.error('Error getting redirect stats:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch redirect statistics',
      },
    });
  }
};

/**
 * Validate link accessibility
 * Checks if link is active, not expired, and hasn't reached max clicks
 * @param link - Link document
 * @returns Error object if invalid, null if valid
 */
const validateLink = (link: LinkData): { statusCode: number; code: string; message: string } | null => {
  // Check if link is active
  if (!link.isActive) {
    return {
      statusCode: 410,
      code: 'LINK_INACTIVE',
      message: 'This link has been deactivated by the owner.',
    };
  }

  // Check if link is expired
  if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
    return {
      statusCode: 410,
      code: 'LINK_EXPIRED',
      message: 'This link has expired and is no longer accessible.',
    };
  }

  // Check if max clicks reached
  if (link.maxClicks && link.clicks >= link.maxClicks) {
    return {
      statusCode: 410,
      code: 'MAX_CLICKS_REACHED',
      message: 'This link has reached its maximum click limit.',
    };
  }

  return null;
};

/**
 * Serve crawler-friendly HTML page for bots
 * Provides Open Graph meta tags for social media sharing
 */
export const serveBotPage = async (req: Request, res: Response): Promise<void> => {
  const { slug } = req.params;

  try {
    let link: LinkData | null = await CacheService.getCachedLink(slug) as LinkData | null;

    if (!link) {
      const linkDoc = await Link.findOne({ slug }).lean();
      if (!linkDoc) {
        res.status(404).send('Link not found');
        return;
      }
      link = linkDoc as unknown as LinkData;
    }

    // Generate HTML with Open Graph meta tags
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${link.title || link.originalUrl}</title>

  <!-- Open Graph meta tags for social sharing -->
  <meta property="og:title" content="${link.metadata?.ogTitle || link.title || link.originalUrl}">
  <meta property="og:description" content="${link.metadata?.ogDescription || link.description || 'Shortened link'}">
  ${link.metadata?.ogImage ? `<meta property="og:image" content="${link.metadata.ogImage}">` : ''}
  <meta property="og:url" content="${link.shortUrl}">
  <meta property="og:type" content="website">

  <!-- Twitter Card meta tags -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${link.metadata?.ogTitle || link.title || link.originalUrl}">
  <meta name="twitter:description" content="${link.metadata?.ogDescription || link.description || 'Shortened link'}">
  ${link.metadata?.ogImage ? `<meta name="twitter:image" content="${link.metadata.ogImage}">` : ''}

  <!-- Canonical URL -->
  <meta name="canonical" content="${link.originalUrl}">

  <!-- Redirect after 1 second -->
  <meta http-equiv="refresh" content="1;url=${link.originalUrl}">
</head>
<body>
  <h1>Redirecting...</h1>
  <p>You will be redirected to <a href="${link.originalUrl}">${link.originalUrl}</a> in a moment.</p>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error('Error serving bot page:', error);
    res.status(500).send('Internal Server Error');
  }
};

export default {
  redirectController,
  linkPreviewController,
  getRedirectStats,
  serveBotPage,
};
