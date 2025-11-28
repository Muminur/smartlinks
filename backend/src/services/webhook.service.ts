import axios from 'axios';
import { Webhook, WebhookDelivery, IWebhookDocument, WebhookEventType } from '../models/webhook.model';
import { logger } from '../utils/logger';

interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

class WebhookService {
  private retryDelays = [1000, 5000, 30000]; // Retry delays in ms

  /**
   * Trigger webhooks for a specific event
   */
  async triggerWebhooks(
    userId: string,
    event: WebhookEventType,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      const webhooks = await Webhook.findActiveByEvent(userId, event);

      if (webhooks.length === 0) {
        return;
      }

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      // Send webhooks in parallel
      await Promise.allSettled(
        webhooks.map(webhook => this.sendWebhook(webhook, payload))
      );
    } catch (error) {
      logger.error('Error triggering webhooks:', error);
    }
  }

  /**
   * Send webhook request
   */
  private async sendWebhook(
    webhook: IWebhookDocument,
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    const startTime = Date.now();
    const payloadString = JSON.stringify(payload);
    const signature = webhook.generateSignature(payloadString);

    try {
      // Update last triggered
      webhook.lastTriggeredAt = new Date();
      await webhook.save();

      // Build headers
      const webhookHeaders = webhook.headers as Map<string, string> | undefined;
      const customHeaders: Record<string, string> = webhookHeaders instanceof Map
        ? Object.fromEntries(webhookHeaders)
        : {};
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
        ...customHeaders,
      };

      // Send request
      const response = await axios.post(webhook.url, payload, {
        headers,
        timeout: 30000, // 30 second timeout
        validateStatus: () => true, // Don't throw on any status code
      });

      const duration = Date.now() - startTime;
      const success = response.status >= 200 && response.status < 300;

      // Log delivery
      await WebhookDelivery.create({
        webhookId: webhook._id,
        event: payload.event,
        payload: payload.data,
        statusCode: response.status,
        responseBody: typeof response.data === 'string'
          ? response.data.slice(0, 10000)
          : JSON.stringify(response.data).slice(0, 10000),
        duration,
        success,
        attempt,
      });

      if (success) {
        await webhook.resetFailures();
        logger.info(`Webhook delivered successfully: ${webhook.name} (${payload.event})`);
      } else {
        // Retry on failure
        await this.handleFailure(webhook, payload, attempt, `HTTP ${response.status}`);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed delivery
      await WebhookDelivery.create({
        webhookId: webhook._id,
        event: payload.event,
        payload: payload.data,
        duration,
        success: false,
        error: errorMessage,
        attempt,
      });

      await this.handleFailure(webhook, payload, attempt, errorMessage);
    }
  }

  /**
   * Handle webhook failure with retry logic
   */
  private async handleFailure(
    webhook: IWebhookDocument,
    payload: WebhookPayload,
    attempt: number,
    error: string
  ): Promise<void> {
    await webhook.incrementFailure();
    logger.warn(`Webhook delivery failed: ${webhook.name} - ${error} (attempt ${attempt})`);

    // Retry if under max retries
    if (attempt < webhook.maxRetries) {
      const delay = this.retryDelays[attempt - 1] || this.retryDelays[this.retryDelays.length - 1];
      setTimeout(() => {
        this.sendWebhook(webhook, payload, attempt + 1);
      }, delay);
    } else {
      logger.error(`Webhook delivery failed after ${attempt} attempts: ${webhook.name}`);
    }
  }

  /**
   * Create a new webhook
   */
  async createWebhook(
    userId: string,
    data: {
      name: string;
      url: string;
      events: WebhookEventType[];
      headers?: Record<string, string>;
    }
  ): Promise<IWebhookDocument> {
    const webhook = new Webhook({
      userId,
      name: data.name,
      url: data.url,
      events: data.events,
      headers: data.headers,
    });

    await webhook.save();
    logger.info(`Webhook created: ${webhook.name} for user ${userId}`);
    return webhook;
  }

  /**
   * Get all webhooks for a user
   */
  async getUserWebhooks(userId: string): Promise<IWebhookDocument[]> {
    return Webhook.find({ userId }).sort({ createdAt: -1 });
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(webhookId: string, userId: string): Promise<IWebhookDocument | null> {
    return Webhook.findOne({ _id: webhookId, userId });
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    userId: string,
    data: Partial<{
      name: string;
      url: string;
      events: WebhookEventType[];
      isActive: boolean;
      headers: Record<string, string>;
    }>
  ): Promise<IWebhookDocument | null> {
    const webhook = await Webhook.findOneAndUpdate(
      { _id: webhookId, userId },
      { $set: data },
      { new: true }
    );

    if (webhook) {
      logger.info(`Webhook updated: ${webhook.name}`);
    }

    return webhook;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string, userId: string): Promise<boolean> {
    const result = await Webhook.deleteOne({ _id: webhookId, userId });
    return result.deletedCount > 0;
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveryHistory(webhookId: string, limit: number = 50): Promise<typeof WebhookDelivery[]> {
    return WebhookDelivery.find({ webhookId })
      .sort({ createdAt: -1 })
      .limit(limit) as unknown as typeof WebhookDelivery[];
  }

  /**
   * Test webhook with sample payload
   */
  async testWebhook(webhook: IWebhookDocument): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
  }> {
    const testPayload: WebhookPayload = {
      event: 'link.clicked',
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook delivery',
      },
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = webhook.generateSignature(payloadString);

    try {
      const webhookHeaders = webhook.headers as Map<string, string> | undefined;
      const customHeaders: Record<string, string> = webhookHeaders instanceof Map
        ? Object.fromEntries(webhookHeaders)
        : {};
      const response = await axios.post(webhook.url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': testPayload.event,
          'X-Webhook-Timestamp': testPayload.timestamp,
          ...customHeaders,
        },
        timeout: 10000,
        validateStatus: () => true,
      });

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const webhookService = new WebhookService();
