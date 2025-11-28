import { Request, Response, NextFunction } from 'express';
import LinkShare from '../models/linkShare.model';
import Link from '../models/link.model';
import User from '../models/user.model';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError, UnauthorizedError } from '../utils/errorHandler';
import { config } from '../config/env';

/**
 * Create a share link
 * POST /api/shares
 */
export const createShareController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { linkId, sharedWithEmail, permission, expiresAt, isPublic } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    // Verify link ownership
    const link = await Link.findOne({ _id: linkId, userId });
    if (!link) {
      throw new NotFoundError('Link not found or you do not have permission to share it');
    }

    // Generate share token
    const shareToken = LinkShare.generateShareToken();

    // Check if shared with user exists
    let sharedWithUserId = null;
    if (sharedWithEmail) {
      const sharedUser = await User.findOne({ email: sharedWithEmail.toLowerCase() });
      if (sharedUser) {
        sharedWithUserId = sharedUser._id;
      }
    }

    // Create share
    const share = new LinkShare({
      linkId,
      ownerId: userId,
      sharedWithEmail: sharedWithEmail?.toLowerCase(),
      sharedWithUserId,
      shareToken,
      permission: permission || 'view',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isPublic: isPublic || false,
    });

    await share.save();

    // Generate share URL
    const shareUrl = `${config.FRONTEND_URL}/shared/${shareToken}`;

    const response: ApiResponse = {
      success: true,
      data: {
        share,
        shareUrl,
      },
      message: 'Share link created successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Create share controller error:', error);
    next(error);
  }
};

/**
 * Get shares for a link
 * GET /api/shares/link/:linkId
 */
export const getSharesForLinkController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { linkId } = req.params;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    // Verify link ownership
    const link = await Link.findOne({ _id: linkId, userId });
    if (!link) {
      throw new NotFoundError('Link not found or you do not have permission');
    }

    const shares = await LinkShare.find({ linkId, isRevoked: false })
      .populate('sharedWithUserId', 'name email avatar')
      .sort({ createdAt: -1 });

    const response: ApiResponse = {
      success: true,
      data: { shares },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get shares for link controller error:', error);
    next(error);
  }
};

/**
 * Get links shared with me
 * GET /api/shares/shared-with-me
 */
export const getSharedWithMeController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const userEmail = authReq.user?.email;

    if (!userId || !userEmail) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    const shares = await LinkShare.find({
      $or: [
        { sharedWithUserId: userId },
        { sharedWithEmail: userEmail.toLowerCase() },
      ],
      isRevoked: false,
    })
      .populate('linkId')
      .populate('ownerId', 'name email avatar')
      .sort({ createdAt: -1 });

    // Filter out expired shares
    const validShares = shares.filter(share => share.isValid());

    const response: ApiResponse = {
      success: true,
      data: { shares: validShares },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get shared with me controller error:', error);
    next(error);
  }
};

/**
 * Access shared link by token
 * GET /api/shares/access/:token
 */
export const accessShareController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;

    const share = await LinkShare.findByToken(token);
    if (!share) {
      throw new NotFoundError('Share link not found or has been revoked');
    }

    if (!share.isValid()) {
      throw new UnauthorizedError('This share link has expired or been revoked');
    }

    // Increment access count
    await share.incrementAccessCount();

    // Return link data based on permission level
    const link = await Link.findById(share.linkId);
    if (!link) {
      throw new NotFoundError('Shared link no longer exists');
    }

    const responseData: Record<string, unknown> = {
      link: {
        _id: link._id,
        slug: link.slug,
        originalUrl: link.originalUrl,
        shortUrl: link.shortUrl,
        title: link.title,
        description: link.description,
        clicks: share.permission === 'analytics' ? link.clicks : undefined,
        createdAt: link.createdAt,
      },
      permission: share.permission,
      sharedBy: share.ownerId,
    };

    const response: ApiResponse = {
      success: true,
      data: responseData,
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Access share controller error:', error);
    next(error);
  }
};

/**
 * Revoke a share
 * DELETE /api/shares/:id
 */
export const revokeShareController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    const share = await LinkShare.findOne({ _id: id, ownerId: userId });
    if (!share) {
      throw new NotFoundError('Share not found or you do not have permission');
    }

    share.isRevoked = true;
    await share.save();

    const response: ApiResponse = {
      success: true,
      message: 'Share link revoked successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Revoke share controller error:', error);
    next(error);
  }
};

/**
 * Update share permissions
 * PUT /api/shares/:id
 */
export const updateShareController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;
    const { permission, expiresAt } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    const share = await LinkShare.findOne({ _id: id, ownerId: userId });
    if (!share) {
      throw new NotFoundError('Share not found or you do not have permission');
    }

    if (permission) {
      share.permission = permission;
    }
    if (expiresAt !== undefined) {
      share.expiresAt = expiresAt ? new Date(expiresAt) : undefined;
    }

    await share.save();

    const response: ApiResponse = {
      success: true,
      data: { share },
      message: 'Share updated successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Update share controller error:', error);
    next(error);
  }
};
