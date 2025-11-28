import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import crypto from 'crypto';

// Webhook event types
export type WebhookEventType =
  | 'link.created'
  | 'link.updated'
  | 'link.deleted'
  | 'link.clicked'
  | 'link.milestone' // e.g., 100 clicks, 1000 clicks
  | 'analytics.daily_summary'
  | 'analytics.weekly_summary';

// Webhook interface
export interface IWebhook {
  userId: Types.ObjectId;
  name: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  isActive: boolean;
  headers?: Record<string, string>;
  retryCount: number;
  maxRetries: number;
  lastTriggeredAt?: Date;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  failureCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Webhook document interface
export interface IWebhookDocument extends IWebhook, Document {
  generateSignature(payload: string): string;
  incrementFailure(): Promise<IWebhookDocument>;
  resetFailures(): Promise<IWebhookDocument>;
}

// Webhook model interface
export interface IWebhookModel extends Model<IWebhookDocument> {
  findActiveByEvent(userId: string, event: WebhookEventType): Promise<IWebhookDocument[]>;
}

// Webhook delivery log interface
export interface IWebhookDelivery {
  webhookId: Types.ObjectId;
  event: WebhookEventType;
  payload: Record<string, unknown>;
  statusCode?: number;
  responseBody?: string;
  duration?: number;
  success: boolean;
  error?: string;
  attempt: number;
  createdAt?: Date;
}

// Webhook delivery document interface
export interface IWebhookDeliveryDocument extends IWebhookDelivery, Document {}

// Webhook delivery model interface
export type IWebhookDeliveryModel = Model<IWebhookDeliveryDocument>;

// Webhook schema
const WebhookSchema = new Schema<IWebhookDocument, IWebhookModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Webhook name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    url: {
      type: String,
      required: [true, 'Webhook URL is required'],
      trim: true,
      validate: {
        validator: function (url: string) {
          try {
            new URL(url);
            return url.startsWith('https://') || url.startsWith('http://');
          } catch {
            return false;
          }
        },
        message: 'Please provide a valid HTTP/HTTPS URL',
      },
    },
    secret: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      required: [true, 'At least one event type is required'],
      validate: {
        validator: function (events: string[]) {
          return events.length > 0 && events.length <= 10;
        },
        message: 'Must have between 1 and 10 event types',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    headers: {
      type: Map,
      of: String,
      default: {},
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    lastTriggeredAt: {
      type: Date,
      default: null,
    },
    lastSuccessAt: {
      type: Date,
      default: null,
    },
    lastFailureAt: {
      type: Date,
      default: null,
    },
    failureCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    collection: 'webhooks',
  }
);

// Indexes
WebhookSchema.index({ userId: 1, events: 1 });
WebhookSchema.index({ userId: 1, isActive: 1 });

// Pre-save to generate secret if not set
WebhookSchema.pre('save', function (next) {
  const webhook = this as IWebhookDocument;
  if (!webhook.secret) {
    webhook.secret = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Method to generate HMAC signature
WebhookSchema.methods.generateSignature = function (payload: string): string {
  const webhook = this as IWebhookDocument;
  return crypto
    .createHmac('sha256', webhook.secret)
    .update(payload)
    .digest('hex');
};

// Method to increment failure count
WebhookSchema.methods.incrementFailure = async function (): Promise<IWebhookDocument> {
  const webhook = this as IWebhookDocument;
  webhook.failureCount += 1;
  webhook.lastFailureAt = new Date();

  // Disable webhook after too many failures
  if (webhook.failureCount >= 10) {
    webhook.isActive = false;
  }

  return await webhook.save();
};

// Method to reset failures after success
WebhookSchema.methods.resetFailures = async function (): Promise<IWebhookDocument> {
  const webhook = this as IWebhookDocument;
  webhook.failureCount = 0;
  webhook.lastSuccessAt = new Date();
  return await webhook.save();
};

// Static method to find active webhooks by event
WebhookSchema.statics.findActiveByEvent = async function (
  userId: string,
  event: WebhookEventType
): Promise<IWebhookDocument[]> {
  return this.find({
    userId,
    events: event,
    isActive: true,
  });
};

// Webhook delivery schema
const WebhookDeliverySchema = new Schema<IWebhookDeliveryDocument, IWebhookDeliveryModel>(
  {
    webhookId: {
      type: Schema.Types.ObjectId,
      ref: 'Webhook',
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      required: true,
    },
    statusCode: {
      type: Number,
    },
    responseBody: {
      type: String,
      maxlength: 10000, // Limit response body size
    },
    duration: {
      type: Number, // in milliseconds
    },
    success: {
      type: Boolean,
      required: true,
    },
    error: {
      type: String,
    },
    attempt: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    collection: 'webhook_deliveries',
  }
);

// Indexes for webhook deliveries
WebhookDeliverySchema.index({ webhookId: 1, createdAt: -1 });
WebhookDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days TTL

// Create and export models
const Webhook = mongoose.model<IWebhookDocument, IWebhookModel>('Webhook', WebhookSchema);
const WebhookDelivery = mongoose.model<IWebhookDeliveryDocument, IWebhookDeliveryModel>('WebhookDelivery', WebhookDeliverySchema);

export { Webhook, WebhookDelivery };
export default Webhook;
