import { Router } from 'express';
import {
  shortenUrlController,
  shortenUrlPublicController,
  getLinksController,
  getLinkByIdController,
  updateLinkController,
  deleteLinkController,
  bulkDeleteController,
  toggleLinkStatusController,
  getLinkAnalyticsController,
  getQrCodeController,
  getUrlPreviewController,
} from '../controllers/link.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validateRequest, validateQuery, validateParams } from '../middleware/validateRequest';
import {
  shortenUrlSchema,
  getLinksSchema,
  updateLinkSchema,
  bulkDeleteSchema,
  linkIdSchema,
  analyticsQuerySchema,
} from '../middleware/link.validation';
import { createLinkLimiterForGuests } from '../middleware/rateLimiter';

const router = Router();

/**
 * Public routes (no authentication required)
 */

/**
 * @route   POST /api/links/public/shorten
 * @desc    Shorten a URL (public endpoint for landing page)
 * @access  Public
 * @body    originalUrl, customSlug
 */
router.post(
  '/public/shorten',
  createLinkLimiterForGuests, // Use guest-specific rate limiter for public endpoint
  validateRequest(shortenUrlSchema),
  shortenUrlPublicController
);

/**
 * Authenticated routes (require login)
 */

/**
 * @route   POST /api/links/shorten
 * @desc    Shorten a URL (create a shortened link)
 * @access  Private
 * @body    originalUrl, customSlug, title, description, tags, expiresAt, maxClicks, password, domain, utm
 * @note   No rate limiting for authenticated users - they have plan-based quotas instead
 */
router.post(
  '/shorten',
  authenticateToken,
  // Rate limiting removed for authenticated users - they have plan-based quotas
  // If you want to add a very high safety limit, use: conditionalRateLimit(createLinkLimiterForAuthUsers)
  validateRequest(shortenUrlSchema),
  shortenUrlController
);

/**
 * @route   GET /api/links
 * @desc    Get all links for authenticated user with filters and pagination
 * @access  Private
 * @query   page, limit, sortBy, order, search, tags, isActive, domain
 */
router.get(
  '/',
  authenticateToken,
  validateQuery(getLinksSchema),
  getLinksController
);

/**
 * @route   GET /api/links/:id
 * @desc    Get single link by ID
 * @access  Private
 * @params  id - Link ID
 */
router.get(
  '/:id',
  authenticateToken,
  validateParams(linkIdSchema),
  getLinkByIdController
);

/**
 * @route   PUT /api/links/:id
 * @desc    Update link
 * @access  Private
 * @params  id - Link ID
 * @body    title, description, tags, expiresAt, maxClicks, isActive, metadata
 */
router.put(
  '/:id',
  authenticateToken,
  validateParams(linkIdSchema),
  validateRequest(updateLinkSchema),
  updateLinkController
);

/**
 * @route   DELETE /api/links/:id
 * @desc    Delete link (soft delete by default, hard delete with ?hard=true)
 * @access  Private
 * @params  id - Link ID
 * @query   hard - Boolean flag for hard delete (optional)
 */
router.delete(
  '/:id',
  authenticateToken,
  validateParams(linkIdSchema),
  deleteLinkController
);

/**
 * @route   POST /api/links/preview
 * @desc    Get URL preview metadata (title, description, image, favicon)
 * @access  Private
 * @body    url - URL to fetch preview for
 */
router.post(
  '/preview',
  authenticateToken,
  getUrlPreviewController
);

/**
 * @route   POST /api/links/bulk-delete
 * @desc    Bulk delete multiple links
 * @access  Private
 * @body    linkIds - Array of link IDs, hard - Boolean flag for hard delete
 */
router.post(
  '/bulk-delete',
  authenticateToken,
  validateRequest(bulkDeleteSchema),
  bulkDeleteController
);

/**
 * @route   PATCH /api/links/:id/toggle
 * @desc    Toggle link active status
 * @access  Private
 * @params  id - Link ID
 */
router.patch(
  '/:id/toggle',
  authenticateToken,
  validateParams(linkIdSchema),
  toggleLinkStatusController
);

/**
 * @route   GET /api/links/:id/analytics
 * @desc    Get analytics summary for a link
 * @access  Private
 * @params  id - Link ID
 * @query   startDate, endDate - Date range filters (optional)
 */
router.get(
  '/:id/analytics',
  authenticateToken,
  validateParams(linkIdSchema),
  validateQuery(analyticsQuerySchema),
  getLinkAnalyticsController
);

/**
 * @route   GET /api/links/:id/qr
 * @desc    Get QR code for a link (supports multiple formats)
 * @access  Private
 * @params  id - Link ID
 * @query   format - Output format: 'png' (default), 'base64', 'download'
 */
router.get(
  '/:id/qr',
  authenticateToken,
  validateParams(linkIdSchema),
  getQrCodeController
);

export default router;
