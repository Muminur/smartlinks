import { Request, Response, NextFunction } from 'express';
import { predictionService } from '../services/prediction.service';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errorHandler';

/**
 * Get click prediction for a link
 * GET /api/predictions/:linkId
 */
export const getPredictionController = async (
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

    const prediction = await predictionService.predictClicks(linkId, userId);
    if (!prediction) {
      throw new NotFoundError('Link not found or you do not have permission');
    }

    const response: ApiResponse = {
      success: true,
      data: { prediction },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get prediction controller error:', error);
    next(error);
  }
};

/**
 * Get predictions for multiple links
 * POST /api/predictions/batch
 */
export const getBatchPredictionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { linkIds } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'linkIds array is required' },
      };
      res.status(400).json(response);
      return;
    }

    // Limit batch size
    const limitedLinkIds = linkIds.slice(0, 20);
    const predictions = await predictionService.predictMultipleLinks(limitedLinkIds, userId);

    const response: ApiResponse = {
      success: true,
      data: {
        predictions: Object.fromEntries(predictions),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get batch predictions controller error:', error);
    next(error);
  }
};

/**
 * Get trending links
 * GET /api/predictions/trending
 */
export const getTrendingLinksController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { limit = '10' } = req.query;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    const trendingLinks = await predictionService.getTrendingLinks(
      userId,
      Math.min(parseInt(limit as string, 10), 50)
    );

    const response: ApiResponse = {
      success: true,
      data: { trendingLinks },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get trending links controller error:', error);
    next(error);
  }
};
