import { Types } from 'mongoose';
import { Response } from 'express';
import Analytics, { IAnalyticsDocument } from '../models/analytics.model';
import Link from '../models/link.model';
import { CacheService } from './cache.service';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errorHandler';
import { getRedisClient } from '../config/redis';
import crypto from 'crypto';

/**
 * Analytics Service - Comprehensive analytics aggregation and reporting
 * Provides high-performance analytics with MongoDB aggregation pipelines and Redis caching
 */

// Cache TTL configurations (in seconds)
const CACHE_TTL = {
  SUMMARY: 600, // 10 minutes
  GEOGRAPHIC: 900, // 15 minutes
  DEVICE: 900, // 15 minutes
  REFERRER: 900, // 15 minutes
  TIMELINE_HOUR: 60, // 1 minute
  TIMELINE_DAY: 300, // 5 minutes
  TIMELINE_WEEK: 1800, // 30 minutes
  TIMELINE_MONTH: 1800, // 30 minutes
  TIMELINE_YEAR: 3600, // 1 hour
  USER_ANALYTICS: 600, // 10 minutes
  COMPARE: 900, // 15 minutes
};

/**
 * Interface for analytics filters
 */
export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Interface for timeline stats
 */
export interface TimelineStats {
  period: string;
  clicks: number;
  uniqueVisitors?: number;
}

/**
 * Generate cache key with hash of filters
 */
function generateCacheKey(type: string, identifier: string, filters?: Record<string, unknown>): string {
  let key = `${type}:${identifier}`;

  if (filters && Object.keys(filters).length > 0) {
    const filterHash = crypto
      .createHash('md5')
      .update(JSON.stringify(filters))
      .digest('hex')
      .substring(0, 8);
    key += `:${filterHash}`;
  }

  return key;
}

/**
 * Build date filter for MongoDB queries
 */
function buildDateFilter(startDate?: Date, endDate?: Date): Record<string, unknown> {
  const dateFilter: Record<string, Date> = {};

  if (startDate || endDate) {
    if (startDate) dateFilter.$gte = startDate;
    if (endDate) dateFilter.$lte = endDate;
    return { timestamp: dateFilter };
  }

  return {};
}

/**
 * Verify user owns the link
 */
async function verifyLinkOwnership(linkId: string, userId: string): Promise<void> {
  const link = await Link.findById(linkId);

  if (!link) {
    throw new NotFoundError('Link not found');
  }

  if (link.userId && link.userId.toString() !== userId) {
    throw new ValidationError('You do not have permission to access analytics for this link');
  }
}

/**
 * Get raw analytics events for a link with pagination
 */
export async function getAnalyticsByLink(
  linkId: string,
  userId: string,
  filters: AnalyticsFilters = {}
): Promise<{
  data: IAnalyticsDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  try {
    // Verify ownership
    await verifyLinkOwnership(linkId, userId);

    const { startDate, endDate, page = 1, limit = 100 } = filters;

    // Build query
    const query: Record<string, unknown> = { linkId: new Types.ObjectId(linkId) };
    Object.assign(query, buildDateFilter(startDate, endDate));

    // Get total count
    const total = await Analytics.countDocuments(query);

    // Get paginated analytics
    const data = await Analytics.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();

    const totalPages = Math.ceil(total / limit);

    logger.debug(`Retrieved ${data.length} analytics events for link ${linkId}`);

    return {
      data: data as unknown as IAnalyticsDocument[],
      total,
      page,
      limit,
      totalPages,
    };
  } catch (error) {
    logger.error('Error getting analytics by link:', error);
    throw error;
  }
}

/**
 * Analytics summary interface
 */
interface AnalyticsSummary {
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDate: Array<{ date: string; clicks: number }>;
  topCountries: Array<{ country: string; countryCode: string; clicks: number; percentage: number }>;
  topDevices: Array<{ device: string; clicks: number; percentage: number }>;
  topBrowsers: Array<{ browser: string; clicks: number; percentage: number }>;
  topOS: Array<{ os: string; clicks: number; percentage: number }>;
  topReferrers: Array<{ referrer: string; type: string; clicks: number; percentage: number }>;
  referrerTypeBreakdown: Array<{ type: string; clicks: number; percentage: number }>;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
}

/**
 * Get aggregated analytics summary for a link
 */
export async function getAnalyticsSummary(
  linkId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<AnalyticsSummary> {
  try {
    // Verify ownership
    await verifyLinkOwnership(linkId, userId);

    // Check cache
    const cacheKey = generateCacheKey('summary', linkId, { startDate, endDate });
    const cached = await CacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT for analytics summary: ${linkId}`);
      return cached as unknown as AnalyticsSummary;
    }

    logger.debug(`Cache MISS for analytics summary: ${linkId}`);

    const matchStage: Record<string, unknown> = { linkId: new Types.ObjectId(linkId) };
    Object.assign(matchStage, buildDateFilter(startDate, endDate));

    // Get total clicks
    const totalClicks = await Analytics.countDocuments(matchStage);

    // Get unique visitors from Redis
    const redis = getRedisClient();
    const uniqueVisitorsKey = `unique:${linkId}`;
    const uniqueVisitors = redis ? await redis.sCard(uniqueVisitorsKey) : 0;

    // Get clicks by date (daily breakdown)
    const clicksByDate = await Analytics.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', clicks: 1, _id: 0 } },
    ]);

    // Get top 10 countries
    const topCountries = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'location.country': { $ne: null } } },
      {
        $group: {
          _id: '$location.country',
          clicks: { $sum: 1 },
          countryCode: { $first: '$location.countryCode' },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $project: {
          country: '$_id',
          countryCode: 1,
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Get top 10 devices
    const topDevices = await Analytics.aggregate([
      { $match: matchStage },
      { $group: { _id: '$device.type', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $project: {
          device: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Get top 10 browsers
    const topBrowsers = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'browser.name': { $ne: null } } },
      { $group: { _id: '$browser.name', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $project: {
          browser: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Get top 10 operating systems
    const topOS = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'os.name': { $ne: null } } },
      { $group: { _id: '$os.name', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $project: {
          os: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Get top 10 referrers
    const topReferrers = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'referrer.domain': { $ne: null } } },
      {
        $group: {
          _id: '$referrer.domain',
          clicks: { $sum: 1 },
          type: { $first: '$referrer.type' },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $project: {
          referrer: '$_id',
          type: 1,
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Get referrer type breakdown
    const referrerTypeBreakdown = await Analytics.aggregate([
      { $match: matchStage },
      { $group: { _id: '$referrer.type', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      {
        $project: {
          type: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    const summary = {
      totalClicks,
      uniqueVisitors,
      clicksByDate,
      topCountries,
      topDevices,
      topBrowsers,
      topOS,
      topReferrers,
      referrerTypeBreakdown,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };

    // Cache the result
    await CacheService.cacheAnalytics(cacheKey, summary, CACHE_TTL.SUMMARY);

    return summary;
  } catch (error) {
    logger.error('Error getting analytics summary:', error);
    throw error;
  }
}

/**
 * Geographic stats interface
 */
interface GeographicStats {
  totalClicks: number;
  clicksByCountry: Array<{
    country: string;
    countryCode: string;
    clicks: number;
    coordinates: { latitude: number | null; longitude: number | null };
    percentage: number;
  }>;
  clicksByRegion: Array<{
    country: string;
    region: string;
    clicks: number;
    percentage: number;
  }>;
  clicksByCity: Array<{
    country: string;
    region: string;
    city: string;
    clicks: number;
    percentage: number;
  }>;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
}

/**
 * Get geographic analytics for a link
 */
export async function getGeographicStats(
  linkId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<GeographicStats> {
  try {
    // Verify ownership
    await verifyLinkOwnership(linkId, userId);

    // Check cache
    const cacheKey = generateCacheKey('geographic', linkId, { startDate, endDate });
    const cached = await CacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT for geographic analytics: ${linkId}`);
      return cached as unknown as GeographicStats;
    }

    logger.debug(`Cache MISS for geographic analytics: ${linkId}`);

    const matchStage: Record<string, unknown> = { linkId: new Types.ObjectId(linkId) };
    Object.assign(matchStage, buildDateFilter(startDate, endDate));

    const totalClicks = await Analytics.countDocuments(matchStage);

    // Clicks by country with coordinates
    const clicksByCountry = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'location.country': { $ne: null } } },
      {
        $group: {
          _id: '$location.country',
          clicks: { $sum: 1 },
          countryCode: { $first: '$location.countryCode' },
          latitude: { $first: '$location.latitude' },
          longitude: { $first: '$location.longitude' },
        },
      },
      { $sort: { clicks: -1 } },
      {
        $project: {
          country: '$_id',
          countryCode: 1,
          clicks: 1,
          coordinates: {
            latitude: '$latitude',
            longitude: '$longitude',
          },
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Clicks by region
    const clicksByRegion = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'location.region': { $ne: null } } },
      {
        $group: {
          _id: {
            country: '$location.country',
            region: '$location.region',
          },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 20 },
      {
        $project: {
          country: '$_id.country',
          region: '$_id.region',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Clicks by city
    const clicksByCity = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'location.city': { $ne: null } } },
      {
        $group: {
          _id: {
            country: '$location.country',
            region: '$location.region',
            city: '$location.city',
          },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 20 },
      {
        $project: {
          country: '$_id.country',
          region: '$_id.region',
          city: '$_id.city',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    const geoStats = {
      totalClicks,
      clicksByCountry,
      clicksByRegion,
      clicksByCity,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };

    // Cache the result
    await CacheService.cacheAnalytics(cacheKey, geoStats, CACHE_TTL.GEOGRAPHIC);

    return geoStats;
  } catch (error) {
    logger.error('Error getting geographic stats:', error);
    throw error;
  }
}

/**
 * Device stats interface
 */
interface DeviceStats {
  totalClicks: number;
  deviceTypeBreakdown: Array<{ deviceType: string; clicks: number; percentage: number }>;
  topDeviceBrands: Array<{ brand: string; clicks: number; percentage: number }>;
  topDeviceModels: Array<{ model: string; brand: string; clicks: number; percentage: number }>;
  osDistribution: Array<{ os: string; clicks: number; percentage: number }>;
  browserDistribution: Array<{ browser: string; clicks: number; percentage: number }>;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
}

/**
 * Get device analytics for a link
 */
export async function getDeviceStats(
  linkId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<DeviceStats> {
  try {
    // Verify ownership
    await verifyLinkOwnership(linkId, userId);

    // Check cache
    const cacheKey = generateCacheKey('device', linkId, { startDate, endDate });
    const cached = await CacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT for device analytics: ${linkId}`);
      return cached as unknown as DeviceStats;
    }

    logger.debug(`Cache MISS for device analytics: ${linkId}`);

    const matchStage: Record<string, unknown> = { linkId: new Types.ObjectId(linkId) };
    Object.assign(matchStage, buildDateFilter(startDate, endDate));

    const totalClicks = await Analytics.countDocuments(matchStage);

    // Device type breakdown
    const deviceTypeBreakdown = await Analytics.aggregate([
      { $match: matchStage },
      { $group: { _id: '$device.type', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      {
        $project: {
          deviceType: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Top device brands
    const topDeviceBrands = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'device.brand': { $ne: null } } },
      { $group: { _id: '$device.brand', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $project: {
          brand: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Top device models
    const topDeviceModels = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'device.model': { $ne: null } } },
      {
        $group: {
          _id: '$device.model',
          clicks: { $sum: 1 },
          brand: { $first: '$device.brand' },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $project: {
          model: '$_id',
          brand: 1,
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // OS distribution
    const osDistribution = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'os.name': { $ne: null } } },
      { $group: { _id: '$os.name', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      {
        $project: {
          os: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Browser distribution
    const browserDistribution = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'browser.name': { $ne: null } } },
      { $group: { _id: '$browser.name', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      {
        $project: {
          browser: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    const deviceStats = {
      totalClicks,
      deviceTypeBreakdown,
      topDeviceBrands,
      topDeviceModels,
      osDistribution,
      browserDistribution,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };

    // Cache the result
    await CacheService.cacheAnalytics(cacheKey, deviceStats, CACHE_TTL.DEVICE);

    return deviceStats;
  } catch (error) {
    logger.error('Error getting device stats:', error);
    throw error;
  }
}

/**
 * Referrer stats interface
 */
interface ReferrerStats {
  totalClicks: number;
  topReferrers: Array<{ domain: string; type: string; clicks: number; percentage: number }>;
  referrerTypeBreakdown: Array<{ type: string; clicks: number; percentage: number }>;
  utmCampaigns: Array<{
    campaign: string;
    source: string;
    medium: string;
    clicks: number;
    percentage: number;
  }>;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
}

/**
 * Get referrer analytics for a link
 */
export async function getReferrerStats(
  linkId: string,
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ReferrerStats> {
  try {
    // Verify ownership
    await verifyLinkOwnership(linkId, userId);

    // Check cache
    const cacheKey = generateCacheKey('referrer', linkId, { startDate, endDate });
    const cached = await CacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT for referrer analytics: ${linkId}`);
      return cached as unknown as ReferrerStats;
    }

    logger.debug(`Cache MISS for referrer analytics: ${linkId}`);

    const matchStage: Record<string, unknown> = { linkId: new Types.ObjectId(linkId) };
    Object.assign(matchStage, buildDateFilter(startDate, endDate));

    const totalClicks = await Analytics.countDocuments(matchStage);

    // Top referrer domains
    const topReferrers = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'referrer.domain': { $ne: null } } },
      {
        $group: {
          _id: '$referrer.domain',
          clicks: { $sum: 1 },
          type: { $first: '$referrer.type' },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 20 },
      {
        $project: {
          domain: '$_id',
          type: 1,
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Referrer type breakdown
    const referrerTypeBreakdown = await Analytics.aggregate([
      { $match: matchStage },
      { $group: { _id: '$referrer.type', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      {
        $project: {
          type: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // UTM campaign performance
    const utmCampaigns = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'utm.campaign': { $ne: null } } },
      {
        $group: {
          _id: {
            campaign: '$utm.campaign',
            source: '$utm.source',
            medium: '$utm.medium',
          },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 20 },
      {
        $project: {
          campaign: '$_id.campaign',
          source: '$_id.source',
          medium: '$_id.medium',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    const referrerStats = {
      totalClicks,
      topReferrers,
      referrerTypeBreakdown,
      utmCampaigns,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };

    // Cache the result
    await CacheService.cacheAnalytics(cacheKey, referrerStats, CACHE_TTL.REFERRER);

    return referrerStats;
  } catch (error) {
    logger.error('Error getting referrer stats:', error);
    throw error;
  }
}

/**
 * Get timeline analytics for a link
 */
export async function getTimelineStats(
  linkId: string,
  userId: string,
  period: 'hour' | 'day' | 'week' | 'month' | 'year',
  startDate?: Date,
  endDate?: Date
): Promise<TimelineStats[]> {
  try {
    // Verify ownership
    await verifyLinkOwnership(linkId, userId);

    // Check cache
    const cacheKey = generateCacheKey('timeline', linkId, { period, startDate, endDate });
    const cached = await CacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT for timeline analytics: ${linkId}`);
      return cached as unknown as TimelineStats[];
    }

    logger.debug(`Cache MISS for timeline analytics: ${linkId}`);

    const matchStage: Record<string, unknown> = { linkId: new Types.ObjectId(linkId) };
    Object.assign(matchStage, buildDateFilter(startDate, endDate));

    // Define date format based on period
    const dateFormats: Record<string, string> = {
      hour: '%Y-%m-%d %H:00',
      day: '%Y-%m-%d',
      week: '%Y-W%U', // Year-Week format
      month: '%Y-%m',
      year: '%Y',
    };

    const dateFormat = dateFormats[period];

    // Get timeline data
    const timeline = await Analytics.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$timestamp' } },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { period: '$_id', clicks: 1, _id: 0 } },
    ]);

    // Determine cache TTL based on period
    const cacheTTL =
      CACHE_TTL[`TIMELINE_${period.toUpperCase()}` as keyof typeof CACHE_TTL] ||
      CACHE_TTL.TIMELINE_DAY;

    // Cache the result
    await CacheService.cacheAnalytics(cacheKey, timeline as unknown as Record<string, unknown>, cacheTTL);

    return timeline;
  } catch (error) {
    logger.error('Error getting timeline stats:', error);
    throw error;
  }
}

/**
 * User analytics interface
 */
interface UserAnalytics {
  totalClicks: number;
  uniqueVisitors: number;
  totalLinks: number;
  topLinks: Array<{
    linkId: string;
    slug: string;
    shortUrl: string;
    title: string;
    clicks: number;
  }>;
  geoDistribution: Array<{ country: string; clicks: number; percentage: number }>;
  deviceStats: Array<{ deviceType: string; clicks: number; percentage: number }>;
  browserStats: Array<{ browser: string; clicks: number; percentage: number }>;
}

/**
 * Get analytics summary for all user's links
 */
export async function getUserAnalytics(userId: string): Promise<UserAnalytics> {
  try {
    // Check cache
    const cacheKey = generateCacheKey('user', userId);
    const cached = await CacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT for user analytics: ${userId}`);
      return cached as unknown as UserAnalytics;
    }

    logger.debug(`Cache MISS for user analytics: ${userId}`);

    const matchStage = { userId: new Types.ObjectId(userId) };

    // Get total clicks across all links
    const totalClicks = await Analytics.countDocuments(matchStage);

    // Get unique visitors from Redis (sum across all user's links)
    const redis = getRedisClient();
    const userLinks = await Link.find({ userId: new Types.ObjectId(userId) }).select('_id');
    let uniqueVisitors = 0;

    for (const link of userLinks) {
      const uniqueKey = `unique:${link._id}`;
      const count = redis ? await redis.sCard(uniqueKey) : 0;
      uniqueVisitors += count;
    }

    // Get top performing links
    const topLinks = await Analytics.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$linkId',
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'links',
          localField: '_id',
          foreignField: '_id',
          as: 'linkInfo',
        },
      },
      { $unwind: '$linkInfo' },
      {
        $project: {
          linkId: '$_id',
          slug: '$linkInfo.slug',
          shortUrl: '$linkInfo.shortUrl',
          title: '$linkInfo.title',
          clicks: 1,
          _id: 0,
        },
      },
    ]);

    // Overall geographic distribution
    const geoDistribution = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'location.country': { $ne: null } } },
      { $group: { _id: '$location.country', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $project: {
          country: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Overall device stats
    const deviceStats = await Analytics.aggregate([
      { $match: matchStage },
      { $group: { _id: '$device.type', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      {
        $project: {
          deviceType: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Overall browser stats
    const browserStats = await Analytics.aggregate([
      { $match: matchStage },
      { $match: { 'browser.name': { $ne: null } } },
      { $group: { _id: '$browser.name', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 },
      {
        $project: {
          browser: '$_id',
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    const userAnalytics = {
      totalClicks,
      uniqueVisitors,
      totalLinks: userLinks.length,
      topLinks,
      geoDistribution,
      deviceStats,
      browserStats,
    };

    // Cache the result
    await CacheService.cacheAnalytics(cacheKey, userAnalytics, CACHE_TTL.USER_ANALYTICS);

    return userAnalytics;
  } catch (error) {
    logger.error('Error getting user analytics:', error);
    throw error;
  }
}

/**
 * Compare links result interface
 */
interface CompareLinksResult {
  comparison: Array<{
    linkId: string;
    slug: string;
    shortUrl: string;
    title: string;
    clicks: number;
    uniqueVisitors: number;
    uniqueCountries: number;
    deviceTypes: string[];
    topCountries: Array<{ country: string; clicks: number }>;
  }>;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
}

/**
 * Compare performance of multiple links
 */
export async function compareLinks(
  linkIds: string[],
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CompareLinksResult> {
  try {
    // Verify all links belong to the user
    const links = await Link.find({
      _id: { $in: linkIds.map((id) => new Types.ObjectId(id)) },
    });

    if (links.length !== linkIds.length) {
      throw new NotFoundError('One or more links not found');
    }

    const unauthorizedLink = links.find((link) => link.userId && link.userId.toString() !== userId);
    if (unauthorizedLink) {
      throw new ValidationError('You do not have permission to access one or more links');
    }

    // Check cache
    const cacheKey = generateCacheKey('compare', linkIds.sort().join('-'), {
      startDate,
      endDate,
    });
    const cached = await CacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT for compare analytics`);
      return cached as unknown as CompareLinksResult;
    }

    logger.debug(`Cache MISS for compare analytics`);

    const matchStage: Record<string, unknown> = {
      linkId: { $in: linkIds.map((id) => new Types.ObjectId(id)) },
    };
    Object.assign(matchStage, buildDateFilter(startDate, endDate));

    // Get comparison data for each link
    const comparison = await Analytics.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$linkId',
          clicks: { $sum: 1 },
          countries: { $addToSet: '$location.country' },
          devices: { $addToSet: '$device.type' },
        },
      },
      {
        $lookup: {
          from: 'links',
          localField: '_id',
          foreignField: '_id',
          as: 'linkInfo',
        },
      },
      { $unwind: '$linkInfo' },
      {
        $project: {
          linkId: '$_id',
          slug: '$linkInfo.slug',
          shortUrl: '$linkInfo.shortUrl',
          title: '$linkInfo.title',
          clicks: 1,
          uniqueCountries: { $size: { $ifNull: ['$countries', []] } },
          deviceTypes: '$devices',
          _id: 0,
        },
      },
    ]);

    // Get unique visitors for each link from Redis
    const redis = getRedisClient();
    for (const item of comparison) {
      const uniqueKey = `unique:${item.linkId}`;
      const uniqueVisitors = redis ? await redis.sCard(uniqueKey) : 0;
      item.uniqueVisitors = uniqueVisitors;
    }

    // Get top countries for each link
    for (const item of comparison) {
      const topCountries = await Analytics.aggregate([
        {
          $match: {
            linkId: new Types.ObjectId(item.linkId.toString()),
            'location.country': { $ne: null },
            ...buildDateFilter(startDate, endDate),
          },
        },
        { $group: { _id: '$location.country', clicks: { $sum: 1 } } },
        { $sort: { clicks: -1 } },
        { $limit: 5 },
        { $project: { country: '$_id', clicks: 1, _id: 0 } },
      ]);
      item.topCountries = topCountries;
    }

    const result = {
      comparison,
      dateRange: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };

    // Cache the result
    await CacheService.cacheAnalytics(cacheKey, result, CACHE_TTL.COMPARE);

    return result;
  } catch (error) {
    logger.error('Error comparing links:', error);
    throw error;
  }
}

/**
 * Export analytics to CSV file
 */
export async function exportAnalyticsCSV(
  linkId: string,
  userId: string,
  res: Response,
  startDate?: Date,
  endDate?: Date
): Promise<void> {
  try {
    // Verify ownership
    await verifyLinkOwnership(linkId, userId);

    // Get link info for filename
    const link = await Link.findById(linkId);
    if (!link) {
      throw new NotFoundError('Link not found');
    }

    const { streamCSVExport } = await import('../utils/exportUtils');

    // Build query
    const query: Record<string, unknown> = { linkId: new Types.ObjectId(linkId) };
    Object.assign(query, buildDateFilter(startDate, endDate));

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `analytics-${link.slug}-${dateStr}.csv`;

    // Create query for streaming
    const streamQuery = Analytics.find(query).sort({ timestamp: -1 });

    // Stream CSV export
    await streamCSVExport(streamQuery, res, filename);
  } catch (error) {
    logger.error('Error exporting analytics to CSV:', error);
    throw error;
  }
}

/**
 * Export analytics to JSON file
 */
export async function exportAnalyticsJSON(
  linkId: string,
  userId: string,
  res: Response,
  startDate?: Date,
  endDate?: Date
): Promise<void> {
  try {
    // Verify ownership
    await verifyLinkOwnership(linkId, userId);

    // Get link info for filename
    const link = await Link.findById(linkId);
    if (!link) {
      throw new NotFoundError('Link not found');
    }

    const { exportAnalyticsToJSON } = await import('../utils/exportUtils');

    // Build query
    const query: Record<string, unknown> = { linkId: new Types.ObjectId(linkId) };
    Object.assign(query, buildDateFilter(startDate, endDate));

    // Get total count
    const totalRecords = await Analytics.countDocuments(query);

    // Get analytics data (limit to 10000 records for JSON)
    const analytics = await Analytics.find(query)
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean()
      .exec();

    // Generate JSON
    const jsonData = exportAnalyticsToJSON(analytics as unknown as IAnalyticsDocument[], {
      slug: link.slug,
      startDate,
      endDate,
      totalRecords,
    });

    // Generate filename
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `analytics-${link.slug}-${dateStr}.json`;

    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send JSON
    res.send(jsonData);
  } catch (error) {
    logger.error('Error exporting analytics to JSON:', error);
    throw error;
  }
}

/**
 * Get trending links based on recent growth
 */
export async function getTrendingLinks(
  userId: string,
  period: 'day' | 'week' | 'month' = 'week',
  limit: number = 10
): Promise<unknown[]> {
  try {
    // Check cache
    const cacheKey = generateCacheKey('trending', userId, { period, limit });
    const redis = getRedisClient();
    const cached = redis ? await redis.get(cacheKey) : null;

    if (cached) {
      logger.debug(`Cache HIT for trending links: ${userId}`);
      return JSON.parse(cached);
    }

    logger.debug(`Cache MISS for trending links: ${userId}`);

    // Calculate date ranges
    const now = new Date();
    let currentPeriodStart: Date;
    let previousPeriodStart: Date;
    let previousPeriodEnd: Date;

    switch (period) {
      case 'day':
        currentPeriodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        previousPeriodEnd = currentPeriodStart;
        break;
      case 'week':
        currentPeriodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        previousPeriodEnd = currentPeriodStart;
        break;
      case 'month':
        currentPeriodStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousPeriodStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        previousPeriodEnd = currentPeriodStart;
        break;
    }

    // Get user's links
    const userLinks = await Link.find({ userId: new Types.ObjectId(userId) }).select('_id');
    const linkIds = userLinks.map((link) => link._id);

    if (linkIds.length === 0) {
      return [];
    }

    // Get current period clicks
    const currentPeriodClicks = await Analytics.aggregate([
      {
        $match: {
          linkId: { $in: linkIds },
          timestamp: { $gte: currentPeriodStart, $lte: now },
        },
      },
      {
        $group: {
          _id: '$linkId',
          clicks: { $sum: 1 },
        },
      },
    ]);

    // Get previous period clicks
    const previousPeriodClicks = await Analytics.aggregate([
      {
        $match: {
          linkId: { $in: linkIds },
          timestamp: { $gte: previousPeriodStart, $lte: previousPeriodEnd },
        },
      },
      {
        $group: {
          _id: '$linkId',
          clicks: { $sum: 1 },
        },
      },
    ]);

    // Create maps for easy lookup
    const currentMap = new Map(
      currentPeriodClicks.map((item) => [item._id.toString(), item.clicks])
    );
    const previousMap = new Map(
      previousPeriodClicks.map((item) => [item._id.toString(), item.clicks])
    );

    // Calculate growth for each link
    const trending = [];
    for (const linkId of linkIds) {
      const linkIdStr = (linkId as Types.ObjectId).toString();
      const current = currentMap.get(linkIdStr) || 0;
      const previous = previousMap.get(linkIdStr) || 0;

      // Calculate growth rate
      let growthRate = 0;
      let growthPercentage = 0;

      if (previous === 0 && current > 0) {
        // New link with clicks
        growthRate = current;
        growthPercentage = 100;
      } else if (previous > 0) {
        growthRate = current - previous;
        growthPercentage = ((current - previous) / previous) * 100;
      }

      // Only include links with positive growth or significant clicks
      if (current > 0) {
        trending.push({
          linkId: linkIdStr,
          currentClicks: current,
          previousClicks: previous,
          growthRate,
          growthPercentage: Math.round(growthPercentage * 100) / 100,
        });
      }
    }

    // Sort by growth percentage (descending)
    trending.sort((a, b) => b.growthPercentage - a.growthPercentage);

    // Limit results
    const limitedTrending = trending.slice(0, limit);

    // Get link details
    const enrichedTrending = await Promise.all(
      limitedTrending.map(async (item) => {
        const link = await Link.findById(item.linkId);
        return {
          ...item,
          slug: link?.slug,
          shortUrl: link?.shortUrl,
          title: link?.title,
        };
      })
    );

    // Cache for 1 hour
    if (redis) {
      await redis.setEx(cacheKey, 3600, JSON.stringify(enrichedTrending));
    }

    return enrichedTrending;
  } catch (error) {
    logger.error('Error getting trending links:', error);
    throw error;
  }
}

/**
 * Get performance metrics for a link
 */
export async function getPerformanceMetrics(linkId: string, userId: string): Promise<Record<string, unknown>> {
  try {
    // Verify ownership
    await verifyLinkOwnership(linkId, userId);

    // Check cache
    const cacheKey = generateCacheKey('performance', linkId);
    const cached = await CacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT for performance metrics: ${linkId}`);
      return cached;
    }

    logger.debug(`Cache MISS for performance metrics: ${linkId}`);

    const matchStage: Record<string, unknown> = { linkId: new Types.ObjectId(linkId) };

    // Get total clicks
    const totalClicks = await Analytics.countDocuments(matchStage);

    // Peak traffic hours (0-23)
    const hourlyDistribution = await Analytics.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { clicks: -1 } },
    ]);

    const peakHour = hourlyDistribution.length > 0 ? hourlyDistribution[0]._id : null;

    // Day-of-week distribution (0 = Sunday, 6 = Saturday)
    const dayOfWeekDistribution = await Analytics.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dayOfWeek: '$timestamp' },
          clicks: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          day: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 1] }, then: 'Sunday' },
                { case: { $eq: ['$_id', 2] }, then: 'Monday' },
                { case: { $eq: ['$_id', 3] }, then: 'Tuesday' },
                { case: { $eq: ['$_id', 4] }, then: 'Wednesday' },
                { case: { $eq: ['$_id', 5] }, then: 'Thursday' },
                { case: { $eq: ['$_id', 6] }, then: 'Friday' },
                { case: { $eq: ['$_id', 7] }, then: 'Saturday' },
              ],
              default: 'Unknown',
            },
          },
          clicks: 1,
          percentage: {
            $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
          },
          _id: 0,
        },
      },
    ]);

    // Geographic diversity
    const uniqueCountries = await Analytics.distinct('location.country', matchStage);
    const uniqueRegions = await Analytics.distinct('location.region', matchStage);
    const uniqueCities = await Analytics.distinct('location.city', matchStage);

    // Unique visitors (from Redis)
    const redis = getRedisClient();
    const uniqueVisitorsKey = `unique:${linkId}`;
    const uniqueVisitors = redis ? await redis.sCard(uniqueVisitorsKey) : 0;

    // Calculate engagement rate (unique visitors / total clicks)
    const engagementRate = totalClicks > 0 ? (uniqueVisitors / totalClicks) * 100 : 0;

    const metrics = {
      totalClicks,
      uniqueVisitors,
      engagementRate: Math.round(engagementRate * 100) / 100,
      peakHour,
      hourlyDistribution: hourlyDistribution.map((h) => ({
        hour: h._id,
        clicks: h.clicks,
        percentage: Math.round((h.clicks / totalClicks) * 10000) / 100,
      })),
      dayOfWeekDistribution,
      geographicDiversity: {
        uniqueCountries: uniqueCountries.length,
        uniqueRegions: uniqueRegions.length,
        uniqueCities: uniqueCities.length,
      },
    };

    // Cache for 30 minutes
    await CacheService.cacheAnalytics(cacheKey, metrics, 1800);

    return metrics;
  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    throw error;
  }
}

/**
 * Generate custom analytics report
 */
interface ReportConfig {
  linkIds: string[];
  startDate?: Date;
  endDate?: Date;
  groupBy?: string;
  includeDevices?: boolean;
  includeGeo?: boolean;
  includeReferrers?: boolean;
}

interface CustomReport {
  generatedAt: string;
  config: {
    linkIds: string[];
    startDate: Date | null;
    endDate: Date | null;
    groupBy: string | null;
  };
  links: Record<string, unknown>[];
}

export async function generateCustomReport(userId: string, config: ReportConfig): Promise<CustomReport> {
  try {
    // Verify all links belong to the user
    const links = await Link.find({
      _id: { $in: config.linkIds.map((id: string) => new Types.ObjectId(id)) },
    });

    if (links.length !== config.linkIds.length) {
      throw new NotFoundError('One or more links not found');
    }

    const unauthorizedLink = links.find((link) => link.userId && link.userId.toString() !== userId);
    if (unauthorizedLink) {
      throw new ValidationError('You do not have permission to access one or more links');
    }

    // Check cache
    const cacheKey = generateCacheKey('custom-report', userId, config as unknown as Record<string, unknown>);
    const cached = await CacheService.getCachedAnalytics(cacheKey);
    if (cached) {
      logger.debug(`Cache HIT for custom report`);
      return cached as unknown as CustomReport;
    }

    logger.debug(`Cache MISS for custom report`);

    // Build match stage
    const matchStage: Record<string, unknown> = {
      linkId: { $in: config.linkIds.map((id: string) => new Types.ObjectId(id)) },
    };

    if (config.startDate || config.endDate) {
      Object.assign(matchStage, buildDateFilter(config.startDate, config.endDate));
    }

    // Build report structure
    const report: CustomReport = {
      generatedAt: new Date().toISOString(),
      config: {
        linkIds: config.linkIds,
        startDate: config.startDate || null,
        endDate: config.endDate || null,
        groupBy: config.groupBy || null,
      },
      links: [],
    };

    // Get detailed stats for each link
    for (const link of links) {
      const linkIdStr = (link._id as Types.ObjectId).toString();
      const linkStats: Record<string, unknown> = {
        linkId: linkIdStr,
        slug: link.slug,
        shortUrl: link.shortUrl,
        title: link.title,
      };

      // Get basic metrics
      const linkMatchStage = {
        ...matchStage,
        linkId: new Types.ObjectId(linkIdStr),
      };
      const totalClicks = await Analytics.countDocuments(linkMatchStage);
      linkStats.totalClicks = totalClicks;

      // Include geographic data if requested
      if (config.includeGeo) {
        const geoStats = await Analytics.aggregate([
          { $match: linkMatchStage },
          { $match: { 'location.country': { $ne: null } } },
          {
            $group: {
              _id: '$location.country',
              clicks: { $sum: 1 },
            },
          },
          { $sort: { clicks: -1 } },
          { $limit: 10 },
          {
            $project: {
              country: '$_id',
              clicks: 1,
              percentage: {
                $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
              },
              _id: 0,
            },
          },
        ]);
        linkStats.topCountries = geoStats;
      }

      // Include device data if requested
      if (config.includeDevices) {
        const deviceStats = await Analytics.aggregate([
          { $match: linkMatchStage },
          {
            $group: {
              _id: '$device.type',
              clicks: { $sum: 1 },
            },
          },
          { $sort: { clicks: -1 } },
          {
            $project: {
              deviceType: '$_id',
              clicks: 1,
              percentage: {
                $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
              },
              _id: 0,
            },
          },
        ]);
        linkStats.deviceBreakdown = deviceStats;
      }

      // Include referrer data if requested
      if (config.includeReferrers) {
        const referrerStats = await Analytics.aggregate([
          { $match: linkMatchStage },
          { $match: { 'referrer.domain': { $ne: null } } },
          {
            $group: {
              _id: '$referrer.domain',
              clicks: { $sum: 1 },
              type: { $first: '$referrer.type' },
            },
          },
          { $sort: { clicks: -1 } },
          { $limit: 10 },
          {
            $project: {
              domain: '$_id',
              type: 1,
              clicks: 1,
              percentage: {
                $multiply: [{ $divide: ['$clicks', totalClicks || 1] }, 100],
              },
              _id: 0,
            },
          },
        ]);
        linkStats.topReferrers = referrerStats;
      }

      report.links.push(linkStats);
    }

    // Cache for 15 minutes
    await CacheService.cacheAnalytics(cacheKey, report as unknown as Record<string, unknown>, 900);

    return report;
  } catch (error) {
    logger.error('Error generating custom report:', error);
    throw error;
  }
}

/**
 * Get analytics alerts for unusual activity
 */
export async function getAnalyticsAlerts(userId: string): Promise<unknown[]> {
  try {
    // Check cache
    const cacheKey = generateCacheKey('alerts', userId);
    const redis = getRedisClient();
    const cached = redis ? await redis.get(cacheKey) : null;

    if (cached) {
      logger.debug(`Cache HIT for analytics alerts: ${userId}`);
      return JSON.parse(cached);
    }

    logger.debug(`Cache MISS for analytics alerts: ${userId}`);

    // Get user's links
    const userLinks = await Link.find({ userId: new Types.ObjectId(userId) }).select('_id slug');
    const linkIds = userLinks.map((link) => link._id);

    if (linkIds.length === 0) {
      return [];
    }

    const alerts = [];

    // Calculate time ranges
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const previous24Hours = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Get clicks for last 24 hours
    const last24HoursClicks = await Analytics.aggregate([
      {
        $match: {
          linkId: { $in: linkIds },
          timestamp: { $gte: last24Hours, $lte: now },
        },
      },
      {
        $group: {
          _id: '$linkId',
          clicks: { $sum: 1 },
          countries: { $addToSet: '$location.country' },
          referrers: { $addToSet: '$referrer.domain' },
          deviceTypes: { $addToSet: '$device.type' },
        },
      },
    ]);

    // Get clicks for previous 24 hours
    const previous24HoursClicks = await Analytics.aggregate([
      {
        $match: {
          linkId: { $in: linkIds },
          timestamp: { $gte: previous24Hours, $lte: last24Hours },
        },
      },
      {
        $group: {
          _id: '$linkId',
          clicks: { $sum: 1 },
        },
      },
    ]);

    // Create maps for easy lookup
    const lastMap = new Map(last24HoursClicks.map((item) => [item._id.toString(), item]));
    const previousMap = new Map(
      previous24HoursClicks.map((item) => [item._id.toString(), item.clicks])
    );

    // Check for anomalies
    for (const link of userLinks) {
      const linkIdStr = (link._id as Types.ObjectId).toString();
      const lastData = lastMap.get(linkIdStr);
      const previousClicks = previousMap.get(linkIdStr) || 0;

      if (!lastData) continue;

      const currentClicks = lastData.clicks;

      // Check for traffic spike (> 300% increase)
      if (previousClicks > 0 && currentClicks / previousClicks > 3) {
        alerts.push({
          linkId: linkIdStr,
          slug: link.slug,
          type: 'traffic_spike',
          severity: 'warning',
          message: `Traffic increased by ${Math.round(((currentClicks - previousClicks) / previousClicks) * 100)}% in the last 24 hours`,
          data: {
            currentClicks,
            previousClicks,
            increase: currentClicks - previousClicks,
          },
        });
      }

      // Check for traffic drop (> 70% decrease)
      if (previousClicks > 10 && currentClicks / previousClicks < 0.3) {
        alerts.push({
          linkId: linkIdStr,
          slug: link.slug,
          type: 'traffic_drop',
          severity: 'critical',
          message: `Traffic decreased by ${Math.round(((previousClicks - currentClicks) / previousClicks) * 100)}% in the last 24 hours`,
          data: {
            currentClicks,
            previousClicks,
            decrease: previousClicks - currentClicks,
          },
        });
      }

      // Check for new countries
      const historicalCountries = await Analytics.distinct('location.country', {
        linkId: link._id,
        timestamp: { $lt: last24Hours },
      });

      const newCountries = lastData.countries.filter(
        (country: string) => country && !historicalCountries.includes(country)
      );

      if (newCountries.length > 0) {
        alerts.push({
          linkId: linkIdStr,
          slug: link.slug,
          type: 'new_countries',
          severity: 'info',
          message: `Link accessed from ${newCountries.length} new ${newCountries.length === 1 ? 'country' : 'countries'}`,
          data: {
            newCountries,
          },
        });
      }

      // Check for unusual referrers
      const knownReferrers = await Analytics.distinct('referrer.domain', {
        linkId: link._id,
        timestamp: { $lt: last24Hours },
      });

      const newReferrers = lastData.referrers.filter(
        (referrer: string) => referrer && !knownReferrers.includes(referrer)
      );

      if (newReferrers.length > 0 && currentClicks > 10) {
        alerts.push({
          linkId: linkIdStr,
          slug: link.slug,
          type: 'new_referrers',
          severity: 'info',
          message: `Link accessed from ${newReferrers.length} new referrer${newReferrers.length === 1 ? '' : 's'}`,
          data: {
            newReferrers: newReferrers.slice(0, 5), // Limit to 5
          },
        });
      }
    }

    // Cache for 5 minutes
    if (redis) {
      await redis.setEx(cacheKey, 300, JSON.stringify(alerts));
    }

    return alerts;
  } catch (error) {
    logger.error('Error getting analytics alerts:', error);
    throw error;
  }
}

export const analyticsService = {
  getAnalyticsByLink,
  getAnalyticsSummary,
  getGeographicStats,
  getDeviceStats,
  getReferrerStats,
  getTimelineStats,
  getUserAnalytics,
  compareLinks,
  exportAnalyticsCSV,
  exportAnalyticsJSON,
  getTrendingLinks,
  getPerformanceMetrics,
  generateCustomReport,
  getAnalyticsAlerts,
};
