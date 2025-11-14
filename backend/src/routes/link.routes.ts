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
import { createLinkLimiter } from '../middleware/rateLimiter';

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
  createLinkLimiter,
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
 */
router.post(
  '/shorten',
  authenticateToken,
  createLinkLimiter,
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

export default router;
