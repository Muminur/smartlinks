import { Request } from 'express';
import Analytics from '../models/analytics.model';
import Link from '../models/link.model';
import { logger } from '../utils/logger';
import {
  parseUserAgent,
  hashIp,
  parseReferrer,
  extractUtmParams,
  getGeolocation,
  getClientIp,
} from '../utils/analytics.utils';
import { CacheService } from '../services/cache.service';

/**
 * Track click event asynchronously
 * This function MUST NOT block the redirect response
 * @param req - Express request object
 * @param linkId - Link document ID
 * @param userId - User ID who owns the link
 * @param slug - Link slug for cache invalidation
 */
export const trackClick = async (
  req: Request,
  linkId: string,
  userId: string,
  slug: string
): Promise<void> => {
  try {
    // Extract request data
    const userAgent = req.headers['user-agent'] || '';
    const referrerUrl = req.headers.referer || req.headers.referrer;
    const ip = getClientIp(req);

    // Check if request is from a bot (skip analytics for bots if configured)
    const skipAnalytics = (req as any).skipAnalytics || false;

    if (skipAnalytics) {
      logger.debug(`Skipping analytics for bot: ${slug}`);
      // Still increment click count for bots
      await incrementClickCount(linkId, slug);
      return;
    }

    // Parse user agent
    const { device, os, browser } = parseUserAgent(userAgent);

    // Hash IP for privacy
    const hashedIp = hashIp(ip);

    // Get geolocation from IP
    const location = getGeolocation(ip);

    // Parse referrer
    const referrer = parseReferrer(referrerUrl as string);

    // Extract UTM parameters
    const utm = extractUtmParams(req);

    // Create analytics record (async, non-blocking)
    const analyticsData = {
      linkId,
      userId,
      timestamp: new Date(),
      ip: hashedIp,
      location,
      device,
      os,
      browser,
      referrer,
      utm,
    };

    // Save to database asynchronously
    Analytics.create(analyticsData).catch((error) => {
      logger.error('Error saving analytics:', error);
    });

    // Increment click count (with optimistic cache update)
    await incrementClickCount(linkId, slug);

    logger.debug(`Tracked click for link: ${slug} from ${location.country || 'Unknown'}`);
  } catch (error) {
    // Log error but don't throw - analytics failure shouldn't break redirects
    logger.error('Error in trackClick:', error);
  }
};

/**
 * Increment link click count in database and cache
 * Uses MongoDB atomic increment for accuracy
 * @param linkId - Link document ID
 * @param slug - Link slug
 */
const incrementClickCount = async (linkId: string, slug: string): Promise<void> => {
  try {
    // Atomic increment in MongoDB
    await Link.findByIdAndUpdate(
      linkId,
      {
        $inc: { clicks: 1 },
        $set: { lastClickedAt: new Date() },
      },
      { new: false } // Don't return the document for performance
    );

    // Optimistically update cache
    await CacheService.incrementCachedClicks(slug);

    logger.debug(`Incremented click count for link: ${slug}`);
  } catch (error) {
    logger.error('Error incrementing click count:', error);
  }
};

/**
 * Batch track multiple clicks (for bulk operations or delayed processing)
 * @param clicks - Array of click events to track
 */
export const batchTrackClicks = async (
  clicks: Array<{
    req: Request;
    linkId: string;
    userId: string;
    slug: string;
  }>
): Promise<void> => {
  try {
    const analyticsRecords = clicks.map((click) => {
      const userAgent = click.req.headers['user-agent'] || '';
      const referrerUrl = click.req.headers.referer || click.req.headers.referrer;
      const ip = getClientIp(click.req);

      const { device, os, browser } = parseUserAgent(userAgent);
      const hashedIp = hashIp(ip);
      const location = getGeolocation(ip);
      const referrer = parseReferrer(referrerUrl as string);
      const utm = extractUtmParams(click.req);

      return {
        linkId: click.linkId,
        userId: click.userId,
        timestamp: new Date(),
        ip: hashedIp,
        location,
        device,
        os,
        browser,
        referrer,
        utm,
      };
    });

    // Bulk insert analytics records
    await Analytics.insertMany(analyticsRecords);

    // Bulk update click counts
    const bulkOps = clicks.map((click) => ({
      updateOne: {
        filter: { _id: click.linkId },
        update: {
          $inc: { clicks: 1 },
          $set: { lastClickedAt: new Date() },
        },
      },
    }));

    await Link.bulkWrite(bulkOps);

    logger.info(`Batch tracked ${clicks.length} clicks`);
  } catch (error) {
    logger.error('Error in batchTrackClicks:', error);
  }
};

/**
 * Track unique visitors using Redis sets
 * Tracks unique IPs per link per day
 * @param slug - Link slug
 * @param ip - Client IP address
 * @returns true if unique visitor, false if already seen today
 */
export const trackUniqueVisitor = async (slug: string, ip: string): Promise<boolean> => {
  try {
    const { getRedisClient } = await import('../config/redis');
    const redis = getRedisClient();
    const hashedIp = hashIp(ip);

    // Create daily unique visitor key
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const uniqueKey = `unique:${slug}:${today}`;

    // Check if IP already visited today
    const isUnique = await redis.sAdd(uniqueKey, hashedIp);

    // Set expiration to 48 hours (cleanup old data)
    await redis.expire(uniqueKey, 172800);

    return isUnique === 1; // 1 = new member, 0 = already exists
  } catch (error) {
    logger.error('Error tracking unique visitor:', error);
    return false;
  }
};

/**
 * Get unique visitor count for a link
 * @param slug - Link slug
 * @returns Number of unique visitors today
 */
export const getUniqueVisitorCount = async (slug: string): Promise<number> => {
  try {
    const { getRedisClient } = await import('../config/redis');
    const redis = getRedisClient();
    const today = new Date().toISOString().split('T')[0];
    const uniqueKey = `unique:${slug}:${today}`;

    const count = await redis.sCard(uniqueKey);
    return count;
  } catch (error) {
    logger.error('Error getting unique visitor count:', error);
    return 0;
  }
};

/**
 * Track click with real-time event emitter
 * Useful for WebSocket notifications or real-time dashboards
 * @param slug - Link slug
 * @param clickData - Click event data
 */
export const emitClickEvent = (slug: string, clickData: any): void => {
  // This can be extended to use Socket.io or other event emitters
  // For now, just log for debugging
  logger.debug(`Click event emitted for ${slug}:`, {
    device: clickData.device,
    location: clickData.location,
    timestamp: clickData.timestamp,
  });

  // Example: emit to WebSocket clients
  // io.to(`link:${slug}`).emit('click', clickData);
};

/**
 * Validate click legitimacy (prevent click fraud)
 * Checks for suspicious patterns that might indicate fraud
 * @param req - Express request object
 * @param slug - Link slug
 * @returns true if click seems legitimate, false if suspicious
 */
export const isLegitimateClick = async (req: Request, slug: string): Promise<boolean> => {
  try {
    const { getRedisClient } = await import('../config/redis');
    const redis = getRedisClient();
    const ip = getClientIp(req);
    const hashedIp = hashIp(ip);

    // Check 1: Rate limit per IP (max 10 clicks per minute per link)
    const rateLimitKey = `click-rate:${slug}:${hashedIp}`;
    const clickCount = await redis.incr(rateLimitKey);
    await redis.expire(rateLimitKey, 60); // 1 minute TTL

    if (clickCount > 10) {
      logger.warn(`Suspicious click activity from IP: ${ip} for link: ${slug}`);
      return false;
    }

    // Check 2: Bot detection
    const isBot = (req as any).isBot || false;
    if (isBot && !(req as any).isTrustedBot) {
      logger.debug(`Untrusted bot detected: ${slug}`);
      return false; // Don't count untrusted bots
    }

    // Check 3: Missing critical headers (likely automation)
    if (!req.headers['user-agent'] && !req.headers.accept) {
      logger.warn(`Missing headers detected for link: ${slug}`);
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Error validating click legitimacy:', error);
    return true; // Default to allowing click on error
  }
};

/**
 * Clean up old analytics data (called by cron job)
 * Removes analytics records older than retention period
 * @param retentionDays - Number of days to keep analytics (default: 730 = 2 years)
 */
export const cleanupOldAnalytics = async (retentionDays: number = 730): Promise<number> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await Analytics.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    logger.info(`Cleaned up ${result.deletedCount} old analytics records`);
    return result.deletedCount || 0;
  } catch (error) {
    logger.error('Error cleaning up old analytics:', error);
    return 0;
  }
};

export default {
  trackClick,
  batchTrackClicks,
  trackUniqueVisitor,
  getUniqueVisitorCount,
  emitClickEvent,
  isLegitimateClick,
  cleanupOldAnalytics,
};
