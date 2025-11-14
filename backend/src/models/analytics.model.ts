import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Analytics interface - represents an analytics event document in MongoDB
export interface IAnalytics {
  linkId: Types.ObjectId;
  userId: Types.ObjectId;
  timestamp: Date;
  ip: string;
  location: {
    country?: string;
    countryCode?: string;
    region?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    brand?: string;
    model?: string;
  };
  os: {
    name?: string;
    version?: string;
  };
  browser: {
    name?: string;
    version?: string;
  };
  referrer: {
    url?: string;
    domain?: string;
    type: 'direct' | 'search' | 'social' | 'email' | 'other';
  };
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  createdAt?: Date;
}

// Analytics document interface
export interface IAnalyticsDocument extends IAnalytics, Document {}

// Analytics model interface with static methods
export interface IAnalyticsModel extends Model<IAnalyticsDocument> {
  // Add static methods here if needed in the future
  getAnalyticsByLink(linkId: string, startDate?: Date, endDate?: Date): Promise<IAnalyticsDocument[]>;
  getAnalyticsByUser(userId: string, startDate?: Date, endDate?: Date): Promise<IAnalyticsDocument[]>;
}

// Analytics schema definition
const AnalyticsSchema = new Schema<IAnalyticsDocument, IAnalyticsModel>(
  {
    linkId: {
      type: Schema.Types.ObjectId,
      ref: 'Link',
      required: [true, 'Link ID is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: [true, 'Timestamp is required'],
    },
    ip: {
      type: String,
      required: [true, 'IP address is required'],
      validate: {
        validator: function (ip: string) {
          // Basic IP validation (IPv4 and IPv6)
          const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
          const ipv6Regex = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;
          return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '::1' || ip === 'localhost';
        },
        message: 'Invalid IP address format',
      },
    },
    location: {
      country: {
        type: String,
        trim: true,
        default: null,
      },
      countryCode: {
        type: String,
        trim: true,
        uppercase: true,
        maxlength: [3, 'Country code cannot exceed 3 characters'],
        default: null,
      },
      region: {
        type: String,
        trim: true,
        default: null,
      },
      city: {
        type: String,
        trim: true,
        default: null,
      },
      latitude: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90'],
        default: null,
      },
      longitude: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180'],
        default: null,
      },
    },
    device: {
      type: {
        type: String,
        enum: {
          values: ['mobile', 'tablet', 'desktop'],
          message: 'Device type must be mobile, tablet, or desktop',
        },
        required: [true, 'Device type is required'],
        default: 'desktop',
      },
      brand: {
        type: String,
        trim: true,
        default: null,
      },
      model: {
        type: String,
        trim: true,
        default: null,
      },
    },
    os: {
      name: {
        type: String,
        trim: true,
        default: null,
      },
      version: {
        type: String,
        trim: true,
        default: null,
      },
    },
    browser: {
      name: {
        type: String,
        trim: true,
        default: null,
      },
      version: {
        type: String,
        trim: true,
        default: null,
      },
    },
    referrer: {
      url: {
        type: String,
        trim: true,
        default: null,
      },
      domain: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
      },
      type: {
        type: String,
        enum: {
          values: ['direct', 'search', 'social', 'email', 'other'],
          message: 'Referrer type must be direct, search, social, email, or other',
        },
        default: 'direct',
      },
    },
    utm: {
      source: {
        type: String,
        trim: true,
        default: null,
      },
      medium: {
        type: String,
        trim: true,
        default: null,
      },
      campaign: {
        type: String,
        trim: true,
        default: null,
      },
      term: {
        type: String,
        trim: true,
        default: null,
      },
      content: {
        type: String,
        trim: true,
        default: null,
      },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only track creation time
    collection: 'analytics',
  }
);

// Indexes
// Compound indexes (these are more specific than single-field indexes)
AnalyticsSchema.index({ linkId: 1, timestamp: -1 }); // For link analytics sorted by time
AnalyticsSchema.index({ userId: 1, timestamp: -1 }); // For user analytics sorted by time
AnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // TTL: 2 years (730 days)
AnalyticsSchema.index({ 'device.type': 1 });
AnalyticsSchema.index({ 'location.countryCode': 1 });
AnalyticsSchema.index({ 'referrer.type': 1 });

// Static method to get analytics by link with date range
AnalyticsSchema.statics.getAnalyticsByLink = async function (
  linkId: string,
  startDate?: Date,
  endDate?: Date
): Promise<IAnalyticsDocument[]> {
  const query: any = { linkId: new Types.ObjectId(linkId) };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return await this.find(query).sort({ timestamp: -1 });
};

// Static method to get analytics by user with date range
AnalyticsSchema.statics.getAnalyticsByUser = async function (
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<IAnalyticsDocument[]> {
  const query: any = { userId: new Types.ObjectId(userId) };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return await this.find(query).sort({ timestamp: -1 });
};

// Pre-save middleware to hash IP address for privacy
AnalyticsSchema.pre('save', async function (next) {
  const analytics = this as IAnalyticsDocument;

  // Hash IP address for privacy (simple hash for demonstration)
  if (analytics.isModified('ip')) {
    const crypto = require('crypto');
    analytics.ip = crypto
      .createHash('sha256')
      .update(analytics.ip + process.env.IP_HASH_SECRET || 'default-secret')
      .digest('hex')
      .substring(0, 16); // Store only first 16 characters for space efficiency
  }

  next();
});

// Create and export the Analytics model
const Analytics = mongoose.model<IAnalyticsDocument, IAnalyticsModel>('Analytics', AnalyticsSchema);

export default Analytics;
