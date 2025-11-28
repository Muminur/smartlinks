import { Router } from 'express';
import {
  getPredictionController,
  getBatchPredictionsController,
  getTrendingLinksController,
} from '../controllers/prediction.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All prediction routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/predictions/trending
 * @desc    Get trending links based on growth rate
 * @access  Private
 */
router.get('/trending', getTrendingLinksController);

/**
 * @route   POST /api/predictions/batch
 * @desc    Get predictions for multiple links
 * @access  Private
 */
router.post('/batch', getBatchPredictionsController);

/**
 * @route   GET /api/predictions/:linkId
 * @desc    Get click prediction for a single link
 * @access  Private
 */
router.get('/:linkId', getPredictionController);

export default router;
