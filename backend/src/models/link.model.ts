import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

// Link interface - represents a shortened link document in MongoDB
export interface ILink {
  slug: string;
  originalUrl: string;
  shortUrl: string;
  userId?: Types.ObjectId;
  folderId?: Types.ObjectId;
  domain: string;
  title?: string;
  description?: string;
  tags: string[];
  metadata: {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
  };
  qrCode?: string;
  password?: string;
  expiresAt?: Date;
  maxClicks?: number;
  clicks: number;
  lastClickedAt?: Date;
  isActive: boolean;
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// Link document interface with methods
export interface ILinkDocument extends ILink, Document {
  incrementClicks(): Promise<ILinkDocument>;
  isExpired(): boolean;
  isMaxClicksReached(): boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Link model interface with static methods
export type ILinkModel = Model<ILinkDocument>;

// Link schema definition
const LinkSchema = new Schema<ILinkDocument, ILinkModel>(
  {
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9-_]+$/,
        'Slug can only contain lowercase letters, numbers, hyphens, and underscores',
      ],
      minlength: [3, 'Slug must be at least 3 characters long'],
      maxlength: [50, 'Slug cannot exceed 50 characters'],
    },
    originalUrl: {
      type: String,
      required: [true, 'Original URL is required'],
      trim: true,
      validate: {
        validator: function (url: string) {
          // Basic URL validation
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        },
        message: 'Please provide a valid URL',
      },
    },
    shortUrl: {
      type: String,
      required: [true, 'Short URL is required'],
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: 'Folder',
      default: null,
    },
    domain: {
      type: String,
      default: 'short.link',
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 10;
        },
        message: 'Cannot have more than 10 tags',
      },
    },
    metadata: {
      ogTitle: {
        type: String,
        trim: true,
        maxlength: [200, 'OG Title cannot exceed 200 characters'],
      },
      ogDescription: {
        type: String,
        trim: true,
        maxlength: [500, 'OG Description cannot exceed 500 characters'],
      },
      ogImage: {
        type: String,
        trim: true,
      },
    },
    qrCode: {
      type: String,
      default: null,
    },
    password: {
      type: String,
      default: null,
      select: false, // Don't return password by default
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    maxClicks: {
      type: Number,
      default: null,
      min: [1, 'Max clicks must be at least 1'],
    },
    clicks: {
      type: Number,
      default: 0,
      min: [0, 'Clicks cannot be negative'],
    },
    lastClickedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    utm: {
      source: {
        type: String,
        trim: true,
      },
      medium: {
        type: String,
        trim: true,
      },
      campaign: {
        type: String,
        trim: true,
      },
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'links',
  }
);

// Indexes
// slug index is already created by unique: true constraint on line 54
LinkSchema.index({ userId: 1, createdAt: -1 }); // Compound index for user's links sorted by creation date
LinkSchema.index({ userId: 1, folderId: 1 }); // Index for folder-based queries
LinkSchema.index({ folderId: 1 }); // Index for folder lookups
LinkSchema.index({ originalUrl: 1 });
LinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true }); // TTL index
LinkSchema.index({ domain: 1 });
LinkSchema.index({ tags: 1 });
// isActive index is created by index: true on line 164

// Pre-save middleware to hash password if provided
LinkSchema.pre('save', async function (next) {
  const link = this as ILinkDocument;

  // Only hash password if it exists and has been modified
  if (!link.password || !link.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    link.password = await bcrypt.hash(link.password, salt);
    next();
  } catch (error: unknown) {
    next(error instanceof Error ? error : new Error('Password hashing failed'));
  }
});

// Method to increment click count
LinkSchema.methods.incrementClicks = async function (): Promise<ILinkDocument> {
  const link = this as ILinkDocument;

  link.clicks += 1;
  link.lastClickedAt = new Date();

  return await link.save();
};

// Method to check if link is expired
LinkSchema.methods.isExpired = function (): boolean {
  const link = this as ILinkDocument;

  if (!link.expiresAt) {
    return false;
  }

  return new Date() > link.expiresAt;
};

// Method to check if max clicks reached
LinkSchema.methods.isMaxClicksReached = function (): boolean {
  const link = this as ILinkDocument;

  if (!link.maxClicks) {
    return false;
  }

  return link.clicks >= link.maxClicks;
};

// Method to compare password for protected links
LinkSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    const link = this as ILinkDocument;

    if (!link.password) {
      return true; // No password set
    }

    return await bcrypt.compare(candidatePassword, link.password);
  } catch {
    return false;
  }
};

// Virtual property to check if link is accessible
LinkSchema.virtual('isAccessible').get(function () {
  const link = this as ILinkDocument;
  return link.isActive && !link.isExpired() && !link.isMaxClicksReached();
});

// Ensure virtuals are included in JSON output
LinkSchema.set('toJSON', { virtuals: true });
LinkSchema.set('toObject', { virtuals: true });

// Create and export the Link model
const Link = mongoose.model<ILinkDocument, ILinkModel>('Link', LinkSchema);

export default Link;
