import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../utils/errorHandler';

/**
 * Get all analytics events for a specific link with pagination
 * GET /api/analytics/link/:linkId
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - page: number (default: 1)
 * - limit: number (default: 100, max: 1000)
 */
export const getAnalyticsByLinkController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const { linkId } = req.params;
    const { startDate, endDate, page = 1, limit = 100 } = req.query;

    // Parse dates
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid startDate format');
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid endDate format');
      }
    }

    // Get analytics
    const result = await analyticsService.getAnalyticsByLink(linkId, userId, {
      startDate: start,
      endDate: end,
      page: Number(page),
      limit: Number(limit),
    });

    const response: ApiResponse = {
      success: true,
      data: result,
      message: `Retrieved ${result.data.length} analytics events`,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get analytics by link controller error:', error);
    next(error);
  }
};

/**
 * Get aggregated analytics summary for a link
 * GET /api/analytics/link/:linkId/summary
 *
 * Returns:
 * - Total clicks
 * - Unique visitors
 * - Clicks by date (daily breakdown)
 * - Top 10 countries
 * - Top 10 devices
 * - Top 10 browsers
 * - Top 10 OS
 * - Top 10 referrers
 * - Referrer type breakdown
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
export const getAnalyticsSummaryController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const { linkId } = req.params;
    const { startDate, endDate } = req.query;

    // Parse dates
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid startDate format');
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid endDate format');
      }
    }

    // Get summary
    const summary = await analyticsService.getAnalyticsSummary(linkId, userId, start, end);

    const response: ApiResponse = {
      success: true,
      data: summary,
      message: 'Analytics summary retrieved successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get analytics summary controller error:', error);
    next(error);
  }
};

/**
 * Get geographic analytics for a link
 * GET /api/analytics/link/:linkId/geographic
 *
 * Returns:
 * - Clicks by country (with coordinates for mapping)
 * - Clicks by region
 * - Clicks by city
 * - Percentages for each
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
export const getGeographicAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const { linkId } = req.params;
    const { startDate, endDate } = req.query;

    // Parse dates
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid startDate format');
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid endDate format');
      }
    }

    // Get geographic stats
    const geoStats = await analyticsService.getGeographicStats(linkId, userId, start, end);

    const response: ApiResponse = {
      success: true,
      data: geoStats,
      message: 'Geographic analytics retrieved successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get geographic analytics controller error:', error);
    next(error);
  }
};

/**
 * Get device analytics for a link
 * GET /api/analytics/link/:linkId/devices
 *
 * Returns:
 * - Device type breakdown (mobile/tablet/desktop)
 * - Top device brands
 * - Top device models
 * - OS distribution
 * - Browser distribution
 * - Percentages and trends
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
export const getDeviceAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const { linkId } = req.params;
    const { startDate, endDate } = req.query;

    // Parse dates
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid startDate format');
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid endDate format');
      }
    }

    // Get device stats
    const deviceStats = await analyticsService.getDeviceStats(linkId, userId, start, end);

    const response: ApiResponse = {
      success: true,
      data: deviceStats,
      message: 'Device analytics retrieved successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get device analytics controller error:', error);
    next(error);
  }
};

/**
 * Get referrer analytics for a link
 * GET /api/analytics/link/:linkId/referrers
 *
 * Returns:
 * - Top referrer domains
 * - Referrer type breakdown (direct/search/social/email/other)
 * - UTM campaign performance
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 */
export const getReferrerAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const { linkId } = req.params;
    const { startDate, endDate } = req.query;

    // Parse dates
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid startDate format');
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid endDate format');
      }
    }

    // Get referrer stats
    const referrerStats = await analyticsService.getReferrerStats(linkId, userId, start, end);

    const response: ApiResponse = {
      success: true,
      data: referrerStats,
      message: 'Referrer analytics retrieved successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get referrer analytics controller error:', error);
    next(error);
  }
};

/**
 * Get time-based analytics for a link
 * GET /api/analytics/link/:linkId/timeline
 *
 * Returns clicks over time grouped by period
 *
 * Query params:
 * - period: 'hour' | 'day' | 'week' | 'month' | 'year' (default: 'day')
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Format: [{ period: '2025-11-13', clicks: 150 }, ...]
 */
export const getTimeBasedAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const { linkId } = req.params;
    const { period = 'day', startDate, endDate } = req.query;

    // Validate period
    const validPeriods = ['hour', 'day', 'week', 'month', 'year'];
    if (!validPeriods.includes(period as string)) {
      throw new ValidationError(
        `Invalid period. Must be one of: ${validPeriods.join(', ')}`
      );
    }

    // Parse dates
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid startDate format');
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid endDate format');
      }
    }

    // Get timeline stats
    const timeline = await analyticsService.getTimelineStats(
      linkId,
      userId,
      period as 'hour' | 'day' | 'week' | 'month' | 'year',
      start,
      end
    );

    const response: ApiResponse = {
      success: true,
      data: {
        period,
        timeline,
        dateRange: {
          startDate: start || null,
          endDate: end || null,
        },
      },
      message: `Timeline analytics (${period}) retrieved successfully`,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get time-based analytics controller error:', error);
    next(error);
  }
};

/**
 * Get analytics summary for all user's links
 * GET /api/analytics/user
 *
 * Returns:
 * - Total clicks across all links
 * - Total unique visitors
 * - Total number of links
 * - Top performing links
 * - Overall geographic distribution
 * - Overall device/browser stats
 */
export const getUserAnalyticsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    // Get user analytics
    const userAnalytics = await analyticsService.getUserAnalytics(userId);

    const response: ApiResponse = {
      success: true,
      data: userAnalytics,
      message: 'User analytics retrieved successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get user analytics controller error:', error);
    next(error);
  }
};

/**
 * Compare performance of multiple links side-by-side
 * GET /api/analytics/compare
 *
 * Query params:
 * - linkIds: Array of link IDs or comma-separated string (max 10)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Returns:
 * - Clicks, unique visitors, top countries, top devices for each link
 */
export const compareLinksController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    let { linkIds, startDate, endDate } = req.query;

    // Parse linkIds (can be array or comma-separated string)
    let linkIdArray: string[] = [];

    if (Array.isArray(linkIds)) {
      linkIdArray = linkIds as string[];
    } else if (typeof linkIds === 'string') {
      linkIdArray = linkIds.split(',').map((id) => id.trim());
    } else {
      throw new ValidationError('linkIds parameter is required');
    }

    // Validate linkIds array
    if (linkIdArray.length === 0) {
      throw new ValidationError('At least one link ID is required');
    }

    if (linkIdArray.length > 10) {
      throw new ValidationError('Cannot compare more than 10 links at once');
    }

    // Validate each link ID format
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    for (const id of linkIdArray) {
      if (!objectIdRegex.test(id)) {
        throw new ValidationError(`Invalid link ID format: ${id}`);
      }
    }

    // Parse dates
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid startDate format');
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid endDate format');
      }
    }

    // Compare links
    const comparison = await analyticsService.compareLinks(linkIdArray, userId, start, end);

    const response: ApiResponse = {
      success: true,
      data: comparison,
      message: `Compared ${linkIdArray.length} links successfully`,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Compare links controller error:', error);
    next(error);
  }
};

/**
 * Export analytics to CSV format
 * GET /api/analytics/link/:linkId/export/csv
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Returns: CSV file download
 */
export const exportAnalyticsCSVController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const { linkId } = req.params;
    const { startDate, endDate } = req.query;

    // Parse dates
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid startDate format');
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid endDate format');
      }
    }

    // Export to CSV
    await analyticsService.exportAnalyticsCSV(linkId, userId, res, start, end);
  } catch (error) {
    logger.error('Export analytics CSV controller error:', error);
    next(error);
  }
};

/**
 * Export analytics to JSON format
 * GET /api/analytics/link/:linkId/export/json
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Returns: JSON file download
 */
export const exportAnalyticsJSONController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const { linkId } = req.params;
    const { startDate, endDate } = req.query;

    // Parse dates
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid startDate format');
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid endDate format');
      }
    }

    // Export to JSON
    await analyticsService.exportAnalyticsJSON(linkId, userId, res, start, end);
  } catch (error) {
    logger.error('Export analytics JSON controller error:', error);
    next(error);
  }
};

/**
 * Get trending links for the user
 * GET /api/analytics/trending
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' (default: 'week')
 * - limit: number (default: 10, max: 50)
 *
 * Returns:
 * - Array of trending links with growth metrics
 */
export const getTrendingLinksController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const { period = 'week', limit = 10 } = req.query;

    // Validate period
    const validPeriods = ['day', 'week', 'month'];
    if (!validPeriods.includes(period as string)) {
      throw new ValidationError(`Invalid period. Must be one of: ${validPeriods.join(', ')}`);
    }

    // Validate limit
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      throw new ValidationError('Limit must be between 1 and 50');
    }

    // Get trending links
    const trending = await analyticsService.getTrendingLinks(
      userId,
      period as 'day' | 'week' | 'month',
      limitNum
    );

    const response: ApiResponse = {
      success: true,
      data: trending,
      message: 'Trending links retrieved successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get trending links controller error:', error);
    next(error);
  }
};

/**
 * Get performance metrics for a link
 * GET /api/analytics/link/:linkId/performance
 *
 * Returns:
 * - Peak traffic hours
 * - Day-of-week distribution
 * - Geographic diversity
 * - Other performance indicators
 */
export const getPerformanceMetricsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const { linkId } = req.params;

    // Get performance metrics
    const metrics = await analyticsService.getPerformanceMetrics(linkId, userId);

    const response: ApiResponse = {
      success: true,
      data: metrics,
      message: 'Performance metrics retrieved successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get performance metrics controller error:', error);
    next(error);
  }
};

/**
 * Generate custom analytics report
 * POST /api/analytics/custom-report
 *
 * Body:
 * - linkIds: Array of link IDs (required)
 * - metrics: Array of metrics to include (optional)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - groupBy: 'day' | 'week' | 'month' (optional)
 * - includeGeo: boolean (optional)
 * - includeDevices: boolean (optional)
 * - includeReferrers: boolean (optional)
 *
 * Returns:
 * - Custom report based on configuration
 */
export const generateCustomReportController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const config = req.body;

    // Validate required fields
    if (!config.linkIds || !Array.isArray(config.linkIds) || config.linkIds.length === 0) {
      throw new ValidationError('linkIds array is required');
    }

    // Validate linkIds limit
    if (config.linkIds.length > 20) {
      throw new ValidationError('Cannot generate report for more than 20 links at once');
    }

    // Parse dates if provided
    if (config.startDate) {
      config.startDate = new Date(config.startDate);
      if (isNaN(config.startDate.getTime())) {
        throw new ValidationError('Invalid startDate format');
      }
    }

    if (config.endDate) {
      config.endDate = new Date(config.endDate);
      if (isNaN(config.endDate.getTime())) {
        throw new ValidationError('Invalid endDate format');
      }
    }

    // Generate custom report
    const report = await analyticsService.generateCustomReport(userId, config);

    const response: ApiResponse = {
      success: true,
      data: report,
      message: 'Custom report generated successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Generate custom report controller error:', error);
    next(error);
  }
};

/**
 * Get analytics alerts for the user
 * GET /api/analytics/alerts
 *
 * Returns:
 * - Array of alerts for unusual activity
 */
export const getAnalyticsAlertsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    // Get analytics alerts
    const alerts = await analyticsService.getAnalyticsAlerts(userId);

    const response: ApiResponse = {
      success: true,
      data: alerts,
      message: 'Analytics alerts retrieved successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get analytics alerts controller error:', error);
    next(error);
  }
};
