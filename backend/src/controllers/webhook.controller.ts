import { Request, Response, NextFunction } from 'express';
import { webhookService } from '../services/webhook.service';
import { Webhook, WebhookDelivery, WebhookEventType } from '../models/webhook.model';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';
import { NotFoundError, ValidationError } from '../utils/errorHandler';

const validEventTypes: WebhookEventType[] = [
  'link.created',
  'link.updated',
  'link.deleted',
  'link.clicked',
  'link.milestone',
  'analytics.daily_summary',
  'analytics.weekly_summary',
];

/**
 * Create a new webhook
 * POST /api/webhooks
 */
export const createWebhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { name, url, events, headers } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      throw new ValidationError('At least one event type is required');
    }

    const invalidEvents = events.filter((e: string) => !validEventTypes.includes(e as WebhookEventType));
    if (invalidEvents.length > 0) {
      throw new ValidationError(`Invalid event types: ${invalidEvents.join(', ')}`);
    }

    // Check webhook limit (e.g., max 10 per user)
    const existingCount = await Webhook.countDocuments({ userId });
    if (existingCount >= 10) {
      throw new ValidationError('Maximum number of webhooks (10) reached');
    }

    const webhook = await webhookService.createWebhook(userId, {
      name,
      url,
      events,
      headers,
    });

    const response: ApiResponse = {
      success: true,
      data: { webhook },
      message: 'Webhook created successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Create webhook controller error:', error);
    next(error);
  }
};

/**
 * Get all webhooks for user
 * GET /api/webhooks
 */
export const getWebhooksController = async (
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
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    const webhooks = await webhookService.getUserWebhooks(userId);

    const response: ApiResponse = {
      success: true,
      data: { webhooks },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get webhooks controller error:', error);
    next(error);
  }
};

/**
 * Get webhook by ID
 * GET /api/webhooks/:id
 */
export const getWebhookController = async (
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

    const webhook = await webhookService.getWebhook(id, userId);
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const response: ApiResponse = {
      success: true,
      data: { webhook },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get webhook controller error:', error);
    next(error);
  }
};

/**
 * Update webhook
 * PUT /api/webhooks/:id
 */
export const updateWebhookController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;
    const { name, url, events, isActive, headers } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    // Validate events if provided
    if (events) {
      const invalidEvents = events.filter((e: string) => !validEventTypes.includes(e as WebhookEventType));
      if (invalidEvents.length > 0) {
        throw new ValidationError(`Invalid event types: ${invalidEvents.join(', ')}`);
      }
    }

    const webhook = await webhookService.updateWebhook(id, userId, {
      name,
      url,
      events,
      isActive,
      headers,
    });

    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const response: ApiResponse = {
      success: true,
      data: { webhook },
      message: 'Webhook updated successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Update webhook controller error:', error);
    next(error);
  }
};

/**
 * Delete webhook
 * DELETE /api/webhooks/:id
 */
export const deleteWebhookController = async (
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

    const deleted = await webhookService.deleteWebhook(id, userId);
    if (!deleted) {
      throw new NotFoundError('Webhook not found');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Webhook deleted successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Delete webhook controller error:', error);
    next(error);
  }
};

/**
 * Test webhook
 * POST /api/webhooks/:id/test
 */
export const testWebhookController = async (
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

    const webhook = await webhookService.getWebhook(id, userId);
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const result = await webhookService.testWebhook(webhook);

    const response: ApiResponse = {
      success: true,
      data: result,
      message: result.success ? 'Webhook test successful' : 'Webhook test failed',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Test webhook controller error:', error);
    next(error);
  }
};

/**
 * Get webhook delivery history
 * GET /api/webhooks/:id/deliveries
 */
export const getWebhookDeliveriesController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { id } = req.params;
    const { limit = '50' } = req.query;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
      };
      res.status(401).json(response);
      return;
    }

    // Verify webhook ownership
    const webhook = await webhookService.getWebhook(id, userId);
    if (!webhook) {
      throw new NotFoundError('Webhook not found');
    }

    const deliveries = await WebhookDelivery.find({ webhookId: id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string, 10));

    const response: ApiResponse = {
      success: true,
      data: { deliveries },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get webhook deliveries controller error:', error);
    next(error);
  }
};

/**
 * Get available webhook event types
 * GET /api/webhooks/events
 */
export const getWebhookEventsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const response: ApiResponse = {
      success: true,
      data: {
        events: validEventTypes.map(event => ({
          type: event,
          description: getEventDescription(event),
        })),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get webhook events controller error:', error);
    next(error);
  }
};

function getEventDescription(event: WebhookEventType): string {
  const descriptions: Record<WebhookEventType, string> = {
    'link.created': 'Triggered when a new link is created',
    'link.updated': 'Triggered when a link is updated',
    'link.deleted': 'Triggered when a link is deleted',
    'link.clicked': 'Triggered when a link receives a click',
    'link.milestone': 'Triggered when a link reaches a click milestone (100, 1000, etc.)',
    'analytics.daily_summary': 'Daily analytics summary for all links',
    'analytics.weekly_summary': 'Weekly analytics summary for all links',
  };
  return descriptions[event] || event;
}
