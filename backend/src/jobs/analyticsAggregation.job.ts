import cron from 'node-cron';
import { Types } from 'mongoose';
import Analytics from '../models/analytics.model';
import Link from '../models/link.model';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * Analytics Aggregation Jobs
 * Scheduled cron jobs for aggregating analytics data and updating trending links
 */

/**
 * Aggregate daily statistics for all links
 * Runs daily at midnight (0 0 * * *)
 */
export async function aggregateDailyStats(): Promise<void> {
  try {
    logger.info('Starting daily analytics aggregation job');

    const redis = getRedisClient();

    // Calculate yesterday's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(today.getTime() - 1);

    // Get all unique links that had activity yesterday
    const activeLinks = await Analytics.distinct('linkId', {
      timestamp: {
        $gte: yesterday,
        $lte: yesterdayEnd,
      },
    });

    logger.info(`Aggregating daily stats for ${activeLinks.length} links`);

    // Aggregate stats for each link
    for (const linkId of activeLinks) {
      try {
        // Get daily clicks
        const clicks = await Analytics.countDocuments({
          linkId: new Types.ObjectId(linkId.toString()),
          timestamp: {
            $gte: yesterday,
            $lte: yesterdayEnd,
          },
        });

        // Get unique visitors for the day
        const visitors = await Analytics.distinct('ipHash', {
          linkId: new Types.ObjectId(linkId.toString()),
          timestamp: {
            $gte: yesterday,
            $lte: yesterdayEnd,
          },
        });

        // Get top countries for the day
        const topCountries = await Analytics.aggregate([
          {
            $match: {
              linkId: new Types.ObjectId(linkId.toString()),
              timestamp: {
                $gte: yesterday,
                $lte: yesterdayEnd,
              },
              'location.country': { $ne: null },
            },
          },
          {
            $group: {
              _id: '$location.country',
              clicks: { $sum: 1 },
            },
          },
          { $sort: { clicks: -1 } },
          { $limit: 5 },
        ]);

        // Build stats object
        const dailyStats = {
          date: yesterday.toISOString().split('T')[0],
          clicks,
          uniqueVisitors: visitors.length,
          topCountries: topCountries.map((c) => ({
            country: c._id,
            clicks: c.clicks,
          })),
          aggregatedAt: new Date().toISOString(),
        };

        // Store in Redis with 90-day expiration
        const cacheKey = `daily-stats:${linkId}:${dailyStats.date}`;
        await redis.setEx(cacheKey, 90 * 24 * 60 * 60, JSON.stringify(dailyStats));

        logger.debug(`Daily stats aggregated for link ${linkId}: ${clicks} clicks`);
      } catch (error) {
        logger.error(`Error aggregating daily stats for link ${linkId}:`, error);
      }
    }

    logger.info(`Daily analytics aggregation completed: ${activeLinks.length} links processed`);
  } catch (error) {
    logger.error('Error in daily analytics aggregation job:', error);
  }
}

/**
 * Aggregate weekly statistics for all links
 * Runs weekly on Sundays at 1 AM (0 1 * * 0)
 */
export async function aggregateWeeklyStats(): Promise<void> {
  try {
    logger.info('Starting weekly analytics aggregation job');

    const redis = getRedisClient();

    // Calculate last week's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - today.getDay());
    const previousSunday = new Date(lastSunday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(lastSunday.getTime() - 1);

    // Get all unique links that had activity last week
    const activeLinks = await Analytics.distinct('linkId', {
      timestamp: {
        $gte: previousSunday,
        $lte: weekEnd,
      },
    });

    logger.info(`Aggregating weekly stats for ${activeLinks.length} links`);

    // Aggregate stats for each link
    for (const linkId of activeLinks) {
      try {
        // Get weekly clicks
        const clicks = await Analytics.countDocuments({
          linkId: new Types.ObjectId(linkId.toString()),
          timestamp: {
            $gte: previousSunday,
            $lte: weekEnd,
          },
        });

        // Get unique visitors for the week
        const visitors = await Analytics.distinct('ipHash', {
          linkId: new Types.ObjectId(linkId.toString()),
          timestamp: {
            $gte: previousSunday,
            $lte: weekEnd,
          },
        });

        // Get daily breakdown
        const dailyBreakdown = await Analytics.aggregate([
          {
            $match: {
              linkId: new Types.ObjectId(linkId.toString()),
              timestamp: {
                $gte: previousSunday,
                $lte: weekEnd,
              },
            },
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              clicks: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        // Build stats object
        const weekNumber = Math.ceil(
          ((previousSunday.getTime() - new Date(previousSunday.getFullYear(), 0, 1).getTime()) /
            86400000 +
            1) /
            7
        );
        const weekKey = `${previousSunday.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;

        const weeklyStats = {
          week: weekKey,
          startDate: previousSunday.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
          clicks,
          uniqueVisitors: visitors.length,
          dailyBreakdown: dailyBreakdown.map((d) => ({
            date: d._id,
            clicks: d.clicks,
          })),
          aggregatedAt: new Date().toISOString(),
        };

        // Store in Redis with 1-year expiration
        const cacheKey = `weekly-stats:${linkId}:${weekKey}`;
        await redis.setEx(cacheKey, 365 * 24 * 60 * 60, JSON.stringify(weeklyStats));

        logger.debug(`Weekly stats aggregated for link ${linkId}: ${clicks} clicks`);
      } catch (error) {
        logger.error(`Error aggregating weekly stats for link ${linkId}:`, error);
      }
    }

    logger.info(`Weekly analytics aggregation completed: ${activeLinks.length} links processed`);
  } catch (error) {
    logger.error('Error in weekly analytics aggregation job:', error);
  }
}

/**
 * Aggregate monthly statistics for all links
 * Runs monthly on 1st at 2 AM (0 2 1 * *)
 */
export async function aggregateMonthlyStats(): Promise<void> {
  try {
    logger.info('Starting monthly analytics aggregation job');

    const redis = getRedisClient();

    // Calculate last month's date range
    const today = new Date();
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    // Get all unique links that had activity last month
    const activeLinks = await Analytics.distinct('linkId', {
      timestamp: {
        $gte: lastMonthStart,
        $lte: lastMonthEnd,
      },
    });

    logger.info(`Aggregating monthly stats for ${activeLinks.length} links`);

    // Aggregate stats for each link
    for (const linkId of activeLinks) {
      try {
        // Get monthly clicks
        const clicks = await Analytics.countDocuments({
          linkId: new Types.ObjectId(linkId.toString()),
          timestamp: {
            $gte: lastMonthStart,
            $lte: lastMonthEnd,
          },
        });

        // Get unique visitors for the month
        const visitors = await Analytics.distinct('ipHash', {
          linkId: new Types.ObjectId(linkId.toString()),
          timestamp: {
            $gte: lastMonthStart,
            $lte: lastMonthEnd,
          },
        });

        // Get weekly breakdown
        const weeklyBreakdown = await Analytics.aggregate([
          {
            $match: {
              linkId: new Types.ObjectId(linkId.toString()),
              timestamp: {
                $gte: lastMonthStart,
                $lte: lastMonthEnd,
              },
            },
          },
          {
            $group: {
              _id: { $week: '$timestamp' },
              clicks: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]);

        // Get top countries for the month
        const topCountries = await Analytics.aggregate([
          {
            $match: {
              linkId: new Types.ObjectId(linkId.toString()),
              timestamp: {
                $gte: lastMonthStart,
                $lte: lastMonthEnd,
              },
              'location.country': { $ne: null },
            },
          },
          {
            $group: {
              _id: '$location.country',
              clicks: { $sum: 1 },
            },
          },
          { $sort: { clicks: -1 } },
          { $limit: 10 },
        ]);

        // Build stats object
        const monthKey = `${lastMonthStart.getFullYear()}-${(lastMonthStart.getMonth() + 1).toString().padStart(2, '0')}`;

        const monthlyStats = {
          month: monthKey,
          startDate: lastMonthStart.toISOString().split('T')[0],
          endDate: lastMonthEnd.toISOString().split('T')[0],
          clicks,
          uniqueVisitors: visitors.length,
          weeklyBreakdown: weeklyBreakdown.map((w) => ({
            week: w._id,
            clicks: w.clicks,
          })),
          topCountries: topCountries.map((c) => ({
            country: c._id,
            clicks: c.clicks,
          })),
          aggregatedAt: new Date().toISOString(),
        };

        // Store in Redis with 2-year expiration
        const cacheKey = `monthly-stats:${linkId}:${monthKey}`;
        await redis.setEx(cacheKey, 2 * 365 * 24 * 60 * 60, JSON.stringify(monthlyStats));

        logger.debug(`Monthly stats aggregated for link ${linkId}: ${clicks} clicks`);
      } catch (error) {
        logger.error(`Error aggregating monthly stats for link ${linkId}:`, error);
      }
    }

    logger.info(`Monthly analytics aggregation completed: ${activeLinks.length} links processed`);
  } catch (error) {
    logger.error('Error in monthly analytics aggregation job:', error);
  }
}

/**
 * Clean up old analytics records
 * Runs daily at 3 AM (0 3 * * *)
 * Note: MongoDB TTL index should handle this, but this job verifies cleanup
 */
export async function cleanupOldAnalytics(): Promise<void> {
  try {
    logger.info('Starting analytics cleanup job');

    // Calculate cutoff date (2 years ago)
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);

    // Count records older than 2 years
    const oldRecordsCount = await Analytics.countDocuments({
      timestamp: { $lt: cutoffDate },
    });

    if (oldRecordsCount > 0) {
      logger.info(`Found ${oldRecordsCount} analytics records older than 2 years`);

      // Delete old records (TTL index should have handled this, but verify)
      const deleteResult = await Analytics.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      logger.info(`Cleaned up ${deleteResult.deletedCount} old analytics records`);
    } else {
      logger.info('No old analytics records found (TTL index working correctly)');
    }
  } catch (error) {
    logger.error('Error in analytics cleanup job:', error);
  }
}

/**
 * Update trending links for all users
 * Runs hourly (0 * * * *)
 */
export async function updateTrendingLinks(): Promise<void> {
  try {
    logger.info('Starting trending links update job');

    const redis = getRedisClient();

    // Get all users who have links
    const usersWithLinks = await Link.distinct('userId');

    logger.info(`Updating trending links for ${usersWithLinks.length} users`);

    // Calculate date ranges for trending (last 7 days vs previous 7 days)
    const now = new Date();
    const last7DaysStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7DaysStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    for (const userId of usersWithLinks) {
      try {
        // Get user's links
        const userLinks = await Link.find({ userId: new Types.ObjectId(userId.toString()) }).select(
          '_id slug shortUrl title'
        );
        const linkIds = userLinks.map((link) => link._id);

        if (linkIds.length === 0) continue;

        // Get current period clicks
        const currentPeriodClicks = await Analytics.aggregate([
          {
            $match: {
              linkId: { $in: linkIds },
              timestamp: { $gte: last7DaysStart, $lte: now },
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
              timestamp: { $gte: previous7DaysStart, $lte: last7DaysStart },
            },
          },
          {
            $group: {
              _id: '$linkId',
              clicks: { $sum: 1 },
            },
          },
        ]);

        // Create maps
        const currentMap = new Map(
          currentPeriodClicks.map((item) => [item._id.toString(), item.clicks])
        );
        const previousMap = new Map(
          previousPeriodClicks.map((item) => [item._id.toString(), item.clicks])
        );

        // Calculate trending
        const trending = [];
        for (const link of userLinks) {
          const linkIdStr = (link._id as Types.ObjectId).toString();
          const current = currentMap.get(linkIdStr) || 0;
          const previous = previousMap.get(linkIdStr) || 0;

          if (current > 0) {
            let growthRate = 0;
            let growthPercentage = 0;

            if (previous === 0) {
              growthRate = current;
              growthPercentage = 100;
            } else {
              growthRate = current - previous;
              growthPercentage = ((current - previous) / previous) * 100;
            }

            trending.push({
              linkId: linkIdStr,
              slug: link.slug,
              shortUrl: link.shortUrl,
              title: link.title,
              currentClicks: current,
              previousClicks: previous,
              growthRate,
              growthPercentage: Math.round(growthPercentage * 100) / 100,
            });
          }
        }

        // Sort by growth percentage
        trending.sort((a, b) => b.growthPercentage - a.growthPercentage);

        // Store top 50 trending links for this user
        const cacheKey = `trending:${userId}`;
        await redis.setEx(cacheKey, 3600, JSON.stringify(trending.slice(0, 50)));

        logger.debug(`Updated trending links for user ${userId}: ${trending.length} links`);
      } catch (error) {
        logger.error(`Error updating trending links for user ${userId}:`, error);
      }
    }

    logger.info(`Trending links update completed: ${usersWithLinks.length} users processed`);
  } catch (error) {
    logger.error('Error in trending links update job:', error);
  }
}

/**
 * Start all analytics cron jobs
 * Should only be called in production environment
 */
export function startAnalyticsJobs(): void {
  logger.info('Initializing analytics cron jobs');

  // Daily aggregation at midnight
  cron.schedule('0 0 * * *', () => {
    logger.info('Running daily analytics aggregation');
    aggregateDailyStats();
  });

  // Weekly aggregation on Sundays at 1 AM
  cron.schedule('0 1 * * 0', () => {
    logger.info('Running weekly analytics aggregation');
    aggregateWeeklyStats();
  });

  // Monthly aggregation on 1st at 2 AM
  cron.schedule('0 2 1 * *', () => {
    logger.info('Running monthly analytics aggregation');
    aggregateMonthlyStats();
  });

  // Cleanup old analytics daily at 3 AM
  cron.schedule('0 3 * * *', () => {
    logger.info('Running analytics cleanup');
    cleanupOldAnalytics();
  });

  // Update trending links hourly
  cron.schedule('0 * * * *', () => {
    logger.info('Running trending links update');
    updateTrendingLinks();
  });

  logger.info('Analytics cron jobs initialized successfully');
}
