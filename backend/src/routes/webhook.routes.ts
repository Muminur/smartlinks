import { Router } from 'express';
import {
  createWebhookController,
  getWebhooksController,
  getWebhookController,
  updateWebhookController,
  deleteWebhookController,
  testWebhookController,
  getWebhookDeliveriesController,
  getWebhookEventsController,
} from '../controllers/webhook.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

// All webhook routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/webhooks/events
 * @desc    Get available webhook event types
 * @access  Private
 */
router.get('/events', getWebhookEventsController);

/**
 * @route   POST /api/webhooks
 * @desc    Create a new webhook
 * @access  Private
 */
router.post('/', createWebhookController);

/**
 * @route   GET /api/webhooks
 * @desc    Get all webhooks for user
 * @access  Private
 */
router.get('/', getWebhooksController);

/**
 * @route   GET /api/webhooks/:id
 * @desc    Get webhook by ID
 * @access  Private
 */
router.get('/:id', getWebhookController);

/**
 * @route   PUT /api/webhooks/:id
 * @desc    Update webhook
 * @access  Private
 */
router.put('/:id', updateWebhookController);

/**
 * @route   DELETE /api/webhooks/:id
 * @desc    Delete webhook
 * @access  Private
 */
router.delete('/:id', deleteWebhookController);

/**
 * @route   POST /api/webhooks/:id/test
 * @desc    Test webhook with sample payload
 * @access  Private
 */
router.post('/:id/test', testWebhookController);

/**
 * @route   GET /api/webhooks/:id/deliveries
 * @desc    Get webhook delivery history
 * @access  Private
 */
router.get('/:id/deliveries', getWebhookDeliveriesController);

export default router;
