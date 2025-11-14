import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  LINK: 3600, // 1 hour for link data
  HOT_LINK: 86400, // 24 hours for frequently accessed links
  ANALYTICS: 300, // 5 minutes for analytics data
};

// Cache key prefixes for organization
const CACHE_PREFIX = {
  LINK: 'link:',
  LINK_SLUG: 'link:slug:',
  USER_LINKS: 'user:links:',
  ANALYTICS: 'analytics:',
  HOT_LINKS: 'hot:links',
};

/**
 * Cache Service - High-performance Redis caching layer
 * Provides sub-millisecond access to frequently accessed data
 */
export class CacheService {
  /**
   * Get cached link by slug
   * @param slug - Link slug to retrieve
   * @returns Cached link data or null if not found
   */
  static async getCachedLink(slug: string): Promise<Record<string, unknown> | null> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, return null immediately
      if (!redis) {
        return null;
      }

      // Check if Redis is ready and open before attempting to use it
      if (!redis.isReady || !redis.isOpen) {
        logger.debug(`Redis not available (ready: ${redis.isReady}, open: ${redis.isOpen}), skipping cache for slug: ${slug}`);
        return null;
      }

      const cacheKey = `${CACHE_PREFIX.LINK_SLUG}${slug}`;

      const startTime = Date.now();
      const cached = await redis.get(cacheKey);
      const latency = Date.now() - startTime;

      if (cached && typeof cached === 'string') {
        logger.debug(`Cache HIT for slug: ${slug} (${latency}ms)`);
        return JSON.parse(cached);
      }

      logger.debug(`Cache MISS for slug: ${slug} (${latency}ms)`);
      return null;
    } catch (error) {
      logger.error('Error getting cached link:', error);
      return null; // Fail gracefully, don't break the redirect
    }
  }

  /**
   * Cache link data with automatic expiration
   * @param slug - Link slug
   * @param link - Link document to cache
   * @param ttl - Optional custom TTL in seconds (default: 1 hour)
   */
  static async setCachedLink(slug: string, link: Record<string, unknown>, ttl?: number): Promise<void> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, skip caching silently
      if (!redis) {
        return;
      }

      // Check if Redis is ready and open before attempting to use it
      if (!redis.isReady || !redis.isOpen) {
        logger.debug(`Redis not available (ready: ${redis.isReady}, open: ${redis.isOpen}), skipping cache set for slug: ${slug}`);
        return;
      }

      const cacheKey = `${CACHE_PREFIX.LINK_SLUG}${slug}`;

      // Serialize link data (exclude sensitive fields)
      const cacheData = {
        _id: link._id,
        slug: link.slug,
        originalUrl: link.originalUrl,
        shortUrl: link.shortUrl,
        userId: link.userId,
        domain: link.domain,
        title: link.title,
        description: link.description,
        metadata: link.metadata,
        expiresAt: link.expiresAt,
        maxClicks: link.maxClicks,
        clicks: link.clicks,
        isActive: link.isActive,
        hasPassword: !!link.password, // Don't cache actual password
      };

      const cacheTTL = ttl || CACHE_TTL.LINK;

      await redis.setEx(cacheKey, cacheTTL, JSON.stringify(cacheData));

      logger.debug(`Cached link: ${slug} (TTL: ${cacheTTL}s)`);

      // Track hot links (links with many cache hits)
      await this.trackHotLink(slug);
    } catch (error) {
      logger.error('Error caching link:', error);
      // Don't throw - caching failure shouldn't break the app
    }
  }

  /**
   * Invalidate cached link (when link is updated or deleted)
   * @param slug - Link slug to invalidate
   */
  static async invalidateLinkCache(slug: string): Promise<void> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, skip invalidation silently
      if (!redis) {
        return;
      }

      const cacheKey = `${CACHE_PREFIX.LINK_SLUG}${slug}`;

      await redis.del(cacheKey);
      logger.debug(`Invalidated cache for slug: ${slug}`);

      // Remove from hot links tracking
      await redis.zRem(CACHE_PREFIX.HOT_LINKS, slug);
    } catch (error) {
      logger.error('Error invalidating cache:', error);
    }
  }

  /**
   * Invalidate all cached links for a user
   * @param userId - User ID
   */
  static async invalidateUserLinksCache(userId: string): Promise<void> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, skip invalidation silently
      if (!redis) {
        return;
      }

      const cacheKey = `${CACHE_PREFIX.USER_LINKS}${userId}`;

      await redis.del(cacheKey);
      logger.debug(`Invalidated user links cache for user: ${userId}`);
    } catch (error) {
      logger.error('Error invalidating user links cache:', error);
    }
  }

  /**
   * Track hot links (frequently accessed links)
   * Uses Redis sorted set to track access frequency
   * @param slug - Link slug
   */
  static async trackHotLink(slug: string): Promise<void> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, skip tracking silently
      if (!redis) {
        return;
      }

      // Increment score in sorted set (score = access count)
      await redis.zIncrBy(CACHE_PREFIX.HOT_LINKS, 1, slug);

      // Keep only top 1000 hot links
      const count = await redis.zCard(CACHE_PREFIX.HOT_LINKS);
      if (count > 1000) {
        // Remove lowest scoring entries
        await redis.zRemRangeByRank(CACHE_PREFIX.HOT_LINKS, 0, count - 1001);
      }
    } catch (error) {
      logger.error('Error tracking hot link:', error);
    }
  }

  /**
   * Get top hot links
   * @param limit - Number of top links to retrieve (default: 100)
   * @returns Array of {slug, score} objects
   */
  static async getHotLinks(limit: number = 100): Promise<Array<{ slug: string; score: number }>> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, return empty array
      if (!redis) {
        return [];
      }

      // Get top N links with highest scores
      const results = await redis.zRangeWithScores(
        CACHE_PREFIX.HOT_LINKS,
        -limit,
        -1,
        { REV: true }
      );

      return results.map((item) => ({
        slug: item.value,
        score: item.score,
      }));
    } catch (error) {
      logger.error('Error getting hot links:', error);
      return [];
    }
  }

  /**
   * Cache analytics data temporarily
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - TTL in seconds (default: 5 minutes)
   */
  static async cacheAnalytics(key: string, data: Record<string, unknown>, ttl?: number): Promise<void> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, skip caching silently
      if (!redis) {
        return;
      }

      const cacheKey = `${CACHE_PREFIX.ANALYTICS}${key}`;
      const cacheTTL = ttl || CACHE_TTL.ANALYTICS;

      await redis.setEx(cacheKey, cacheTTL, JSON.stringify(data));
      logger.debug(`Cached analytics: ${key} (TTL: ${cacheTTL}s)`);
    } catch (error) {
      logger.error('Error caching analytics:', error);
    }
  }

  /**
   * Get cached analytics data
   * @param key - Cache key
   * @returns Cached data or null
   */
  static async getCachedAnalytics(key: string): Promise<Record<string, unknown> | null> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, return null
      if (!redis) {
        return null;
      }

      const cacheKey = `${CACHE_PREFIX.ANALYTICS}${key}`;

      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === 'string') {
        return JSON.parse(cached);
      }

      return null;
    } catch (error) {
      logger.error('Error getting cached analytics:', error);
      return null;
    }
  }

  /**
   * Clear all cache entries (use with caution)
   */
  static async clearAllCache(): Promise<void> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, skip silently
      if (!redis) {
        logger.debug('Redis not available, skipping cache clear');
        return;
      }

      // Get all keys matching our prefixes
      const linkKeys = await redis.keys(`${CACHE_PREFIX.LINK}*`);
      const analyticsKeys = await redis.keys(`${CACHE_PREFIX.ANALYTICS}*`);
      const userKeys = await redis.keys(`${CACHE_PREFIX.USER_LINKS}*`);

      const allKeys = [...linkKeys, ...analyticsKeys, ...userKeys];

      if (allKeys.length > 0) {
        await redis.del(allKeys);
        logger.info(`Cleared ${allKeys.length} cache entries`);
      }
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns Cache statistics object
   */
  static async getCacheStats(): Promise<{
    totalKeys: number;
    linkKeys: number;
    analyticsKeys: number;
    hotLinksCount: number;
  }> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, return zeros
      if (!redis) {
        return {
          totalKeys: 0,
          linkKeys: 0,
          analyticsKeys: 0,
          hotLinksCount: 0,
        };
      }

      const linkKeys = await redis.keys(`${CACHE_PREFIX.LINK}*`);
      const analyticsKeys = await redis.keys(`${CACHE_PREFIX.ANALYTICS}*`);
      const hotLinksCount = await redis.zCard(CACHE_PREFIX.HOT_LINKS);

      return {
        totalKeys: linkKeys.length + analyticsKeys.length,
        linkKeys: linkKeys.length,
        analyticsKeys: analyticsKeys.length,
        hotLinksCount,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        linkKeys: 0,
        analyticsKeys: 0,
        hotLinksCount: 0,
      };
    }
  }

  /**
   * Increment link click count in cache (optimistic update)
   * @param slug - Link slug
   */
  static async incrementCachedClicks(slug: string): Promise<void> {
    try {
      const redis = getRedisClient();

      // If Redis is not available, skip increment silently
      if (!redis) {
        return;
      }

      const cacheKey = `${CACHE_PREFIX.LINK_SLUG}${slug}`;

      const cached = await redis.get(cacheKey);
      if (cached && typeof cached === 'string') {
        const linkData = JSON.parse(cached);
        linkData.clicks += 1;

        // Update cache with incremented clicks (keep original TTL)
        const ttl = await redis.ttl(cacheKey);
        if (ttl > 0) {
          await redis.setEx(cacheKey, ttl, JSON.stringify(linkData));
        }
      }
    } catch (error) {
      logger.error('Error incrementing cached clicks:', error);
    }
  }
}

export default CacheService;
