import { Router } from 'express';
import {
  getAnalyticsByLinkController,
  getAnalyticsSummaryController,
  getGeographicAnalyticsController,
  getDeviceAnalyticsController,
  getReferrerAnalyticsController,
  getTimeBasedAnalyticsController,
  getUserAnalyticsController,
  compareLinksController,
  exportAnalyticsCSVController,
  exportAnalyticsJSONController,
  getTrendingLinksController,
  getPerformanceMetricsController,
  generateCustomReportController,
  getAnalyticsAlertsController,
} from '../controllers/analytics.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  validateLinkIdParam,
  validateDateRangeQuery,
  validateTimelineQuery,
  validateCompareLinksQuery,
  validateLinkAnalyticsQuery,
} from '../middleware/analytics.validation';
import rateLimit from 'express-rate-limit';

const router = Router();

/**
 * Rate limiter for analytics endpoints
 * 100 requests per minute per IP
 */
const analyticsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many analytics requests. Please try again later.',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

/**
 * Apply rate limiter to all analytics routes
 */
router.use(analyticsRateLimiter);

/**
 * All analytics routes require authentication
 */
router.use(authenticateToken);

/**
 * GET /api/analytics/link/:linkId
 * Get all analytics events for a specific link with pagination
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - page: number (default: 1)
 * - limit: number (default: 100, max: 1000)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     data: [...analytics events],
 *     total: number,
 *     page: number,
 *     limit: number,
 *     totalPages: number
 *   }
 * }
 */
router.get(
  '/link/:linkId',
  validateLinkIdParam,
  validateDateRangeQuery,
  getAnalyticsByLinkController
);

/**
 * GET /api/analytics/link/:linkId/summary
 * Get aggregated analytics summary for a link
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     totalClicks: number,
 *     uniqueVisitors: number,
 *     clicksByDate: [...],
 *     topCountries: [...],
 *     topDevices: [...],
 *     topBrowsers: [...],
 *     topOS: [...],
 *     topReferrers: [...],
 *     referrerTypeBreakdown: [...]
 *   }
 * }
 */
router.get(
  '/link/:linkId/summary',
  validateLinkIdParam,
  validateLinkAnalyticsQuery,
  getAnalyticsSummaryController
);

/**
 * GET /api/analytics/link/:linkId/geographic
 * Get geographic analytics for a link
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     totalClicks: number,
 *     clicksByCountry: [...],
 *     clicksByRegion: [...],
 *     clicksByCity: [...]
 *   }
 * }
 */
router.get(
  '/link/:linkId/geographic',
  validateLinkIdParam,
  validateLinkAnalyticsQuery,
  getGeographicAnalyticsController
);

/**
 * GET /api/analytics/link/:linkId/devices
 * Get device analytics for a link
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     totalClicks: number,
 *     deviceTypeBreakdown: [...],
 *     topDeviceBrands: [...],
 *     topDeviceModels: [...],
 *     osDistribution: [...],
 *     browserDistribution: [...]
 *   }
 * }
 */
router.get(
  '/link/:linkId/devices',
  validateLinkIdParam,
  validateLinkAnalyticsQuery,
  getDeviceAnalyticsController
);

/**
 * GET /api/analytics/link/:linkId/referrers
 * Get referrer analytics for a link
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     totalClicks: number,
 *     topReferrers: [...],
 *     referrerTypeBreakdown: [...],
 *     utmCampaigns: [...]
 *   }
 * }
 */
router.get(
  '/link/:linkId/referrers',
  validateLinkIdParam,
  validateLinkAnalyticsQuery,
  getReferrerAnalyticsController
);

/**
 * GET /api/analytics/link/:linkId/timeline
 * Get time-based analytics for a link
 *
 * Query params:
 * - period: 'hour' | 'day' | 'week' | 'month' | 'year' (default: 'day')
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     period: string,
 *     timeline: [{ period: string, clicks: number }, ...],
 *     dateRange: { startDate: Date | null, endDate: Date | null }
 *   }
 * }
 */
router.get(
  '/link/:linkId/timeline',
  validateLinkIdParam,
  validateTimelineQuery,
  getTimeBasedAnalyticsController
);

/**
 * GET /api/analytics/user
 * Get analytics summary for all user's links
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     totalClicks: number,
 *     uniqueVisitors: number,
 *     totalLinks: number,
 *     topLinks: [...],
 *     geoDistribution: [...],
 *     deviceStats: [...],
 *     browserStats: [...]
 *   }
 * }
 */
router.get('/user', getUserAnalyticsController);

/**
 * GET /api/analytics/compare
 * Compare performance of multiple links side-by-side
 *
 * Query params:
 * - linkIds: Array of link IDs or comma-separated string (max 10)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     comparison: [
 *       {
 *         linkId: string,
 *         slug: string,
 *         shortUrl: string,
 *         title: string,
 *         clicks: number,
 *         uniqueVisitors: number,
 *         uniqueCountries: number,
 *         deviceTypes: [...],
 *         topCountries: [...]
 *       },
 *       ...
 *     ],
 *     dateRange: { startDate: Date | null, endDate: Date | null }
 *   }
 * }
 */
router.get('/compare', validateCompareLinksQuery, compareLinksController);

/**
 * GET /api/analytics/link/:linkId/export/csv
 * Export analytics to CSV file
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Response: CSV file download
 */
router.get(
  '/link/:linkId/export/csv',
  validateLinkIdParam,
  validateDateRangeQuery,
  exportAnalyticsCSVController
);

/**
 * GET /api/analytics/link/:linkId/export/json
 * Export analytics to JSON file
 *
 * Query params:
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 *
 * Response: JSON file download
 */
router.get(
  '/link/:linkId/export/json',
  validateLinkIdParam,
  validateDateRangeQuery,
  exportAnalyticsJSONController
);

/**
 * GET /api/analytics/trending
 * Get trending links based on recent growth
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' (default: 'week')
 * - limit: number (default: 10, max: 50)
 *
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       linkId: string,
 *       slug: string,
 *       shortUrl: string,
 *       title: string,
 *       currentClicks: number,
 *       previousClicks: number,
 *       growthRate: number,
 *       growthPercentage: number
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/trending', getTrendingLinksController);

/**
 * GET /api/analytics/link/:linkId/performance
 * Get performance metrics for a link
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     totalClicks: number,
 *     uniqueVisitors: number,
 *     engagementRate: number,
 *     peakHour: number,
 *     hourlyDistribution: [...],
 *     dayOfWeekDistribution: [...],
 *     geographicDiversity: {...}
 *   }
 * }
 */
router.get(
  '/link/:linkId/performance',
  validateLinkIdParam,
  getPerformanceMetricsController
);

/**
 * POST /api/analytics/custom-report
 * Generate custom analytics report
 *
 * Body:
 * {
 *   linkIds: string[],
 *   metrics?: string[],
 *   startDate?: string,
 *   endDate?: string,
 *   groupBy?: 'day' | 'week' | 'month',
 *   includeGeo?: boolean,
 *   includeDevices?: boolean,
 *   includeReferrers?: boolean
 * }
 *
 * Response:
 * {
 *   success: true,
 *   data: {
 *     generatedAt: string,
 *     config: {...},
 *     links: [...]
 *   }
 * }
 */
router.post('/custom-report', generateCustomReportController);

/**
 * GET /api/analytics/alerts
 * Get analytics alerts for unusual activity
 *
 * Response:
 * {
 *   success: true,
 *   data: [
 *     {
 *       linkId: string,
 *       slug: string,
 *       type: 'traffic_spike' | 'traffic_drop' | 'new_countries' | 'new_referrers',
 *       severity: 'info' | 'warning' | 'critical',
 *       message: string,
 *       data: {...}
 *     },
 *     ...
 *   ]
 * }
 */
router.get('/alerts', getAnalyticsAlertsController);

export default router;
