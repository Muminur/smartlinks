import { Request, Response, NextFunction } from 'express';
import { linkService, CreateLinkData } from '../services/link.service';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { ValidationError } from '../utils/errorHandler';

/**
 * Shorten a URL (Create a shortened link)
 * POST /api/links/shorten
 */
export const shortenUrlController = async (
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

    const linkData: CreateLinkData = {
      originalUrl: req.body.originalUrl,
      customSlug: req.body.customSlug,
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags,
      expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
      maxClicks: req.body.maxClicks ? parseInt(req.body.maxClicks, 10) : undefined,
      password: req.body.password,
      domain: req.body.domain,
      utm: req.body.utm,
    };

    // Create shortened link
    const link = await linkService.shortenUrl(userId, linkData);

    const response: ApiResponse = {
      success: true,
      data: { link },
      message: 'Link shortened successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Shorten URL controller error:', error);
    next(error);
  }
};

/**
 * Get all links for authenticated user with filters and pagination
 * GET /api/links
 */
export const getLinksController = async (
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

    // Extract query parameters
    const {
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      order = 'desc',
      search = '',
      tags,
      isActive,
      domain,
    } = req.query;

    // Parse and validate parameters
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      throw new ValidationError('Invalid page number');
    }

    if (isNaN(limitNum) || limitNum < 1) {
      throw new ValidationError('Invalid limit number');
    }

    // Parse tags (can be comma-separated string or array)
    let tagsArray: string[] = [];
    if (tags) {
      if (Array.isArray(tags)) {
        tagsArray = tags as string[];
      } else if (typeof tags === 'string') {
        tagsArray = tags.split(',').map((tag) => tag.trim());
      }
    }

    // Parse isActive (convert string to boolean)
    let isActiveFilter: boolean | undefined;
    if (isActive !== undefined) {
      isActiveFilter = isActive === 'true' || isActive === '1';
    }

    // Get links from service
    const result = await linkService.getUserLinks(userId, {
      page: pageNum,
      limit: limitNum,
      sortBy: sortBy as string,
      order: (order as string).toLowerCase() === 'asc' ? 'asc' : 'desc',
      search: search as string,
      tags: tagsArray,
      isActive: isActiveFilter,
      domain: domain as string,
    });

    const response: ApiResponse = {
      success: true,
      data: result,
      message: `Retrieved ${result.data.length} links`,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get links controller error:', error);
    next(error);
  }
};

/**
 * Get single link by ID
 * GET /api/links/:id
 */
export const getLinkByIdController = async (
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

    const { id } = req.params;

    // Get link from service
    const link = await linkService.getLinkById(id, userId);

    const response: ApiResponse = {
      success: true,
      data: { link },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get link by ID controller error:', error);
    next(error);
  }
};

/**
 * Update link
 * PUT /api/links/:id
 */
export const updateLinkController = async (
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

    const { id } = req.params;
    const updateData = req.body;

    // Prevent updating immutable fields
    const forbiddenFields = ['slug', 'originalUrl', 'shortUrl', 'userId', 'clicks'];
    const hasForbiddenFields = forbiddenFields.some((field) => field in updateData);

    if (hasForbiddenFields) {
      throw new ValidationError(
        `Cannot update the following fields: ${forbiddenFields.join(', ')}`
      );
    }

    // Parse expiresAt and maxClicks (convert null string to null)
    if (updateData.expiresAt === 'null' || updateData.expiresAt === '') {
      updateData.expiresAt = null;
    } else if (updateData.expiresAt) {
      updateData.expiresAt = new Date(updateData.expiresAt);
    }

    if (updateData.maxClicks === 'null' || updateData.maxClicks === '') {
      updateData.maxClicks = null;
    } else if (updateData.maxClicks) {
      updateData.maxClicks = parseInt(updateData.maxClicks, 10);
    }

    // Update link
    const updatedLink = await linkService.updateLink(id, userId, updateData);

    const response: ApiResponse = {
      success: true,
      data: { link: updatedLink },
      message: 'Link updated successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Update link controller error:', error);
    next(error);
  }
};

/**
 * Delete link
 * DELETE /api/links/:id
 */
export const deleteLinkController = async (
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

    const { id } = req.params;
    const { hard = 'false' } = req.query;

    // Parse hard delete flag
    const hardDelete = hard === 'true' || hard === '1';

    // Delete link
    await linkService.deleteLink(id, userId, hardDelete);

    const response: ApiResponse = {
      success: true,
      message: hardDelete ? 'Link permanently deleted' : 'Link deactivated successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Delete link controller error:', error);
    next(error);
  }
};

/**
 * Bulk delete links
 * POST /api/links/bulk-delete
 */
export const bulkDeleteController = async (
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

    const { linkIds, hard = false } = req.body;

    // Validate linkIds
    if (!Array.isArray(linkIds) || linkIds.length === 0) {
      throw new ValidationError('linkIds must be a non-empty array');
    }

    // Delete links
    const deletedCount = await linkService.bulkDeleteLinks(linkIds, userId, hard);

    const response: ApiResponse = {
      success: true,
      data: { deletedCount },
      message: `${deletedCount} link(s) ${hard ? 'permanently deleted' : 'deactivated'}`,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Bulk delete controller error:', error);
    next(error);
  }
};

/**
 * Toggle link active status
 * PATCH /api/links/:id/toggle
 */
export const toggleLinkStatusController = async (
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

    const { id } = req.params;

    // Toggle link status
    const updatedLink = await linkService.toggleLinkStatus(id, userId);

    const response: ApiResponse = {
      success: true,
      data: { link: updatedLink },
      message: `Link ${updatedLink.isActive ? 'activated' : 'deactivated'} successfully`,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Toggle link status controller error:', error);
    next(error);
  }
};

/**
 * Get analytics summary for a link
 * GET /api/links/:id/analytics
 */
export const getLinkAnalyticsController = async (
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

    const { id } = req.params;
    const { startDate, endDate } = req.query;

    // Parse date parameters
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

    // Get analytics summary
    const analytics = await linkService.getLinkAnalyticsSummary(id, userId, start, end);

    const response: ApiResponse = {
      success: true,
      data: { analytics },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get link analytics controller error:', error);
    next(error);
  }
};
