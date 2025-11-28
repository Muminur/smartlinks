import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import crypto from 'crypto';

// LinkShare interface - represents a shared link access
export interface ILinkShare {
  linkId: Types.ObjectId;
  ownerId: Types.ObjectId;
  sharedWithEmail?: string;
  sharedWithUserId?: Types.ObjectId;
  shareToken: string;
  permission: 'view' | 'edit' | 'analytics';
  expiresAt?: Date;
  isPublic: boolean;
  isRevoked: boolean;
  accessCount: number;
  lastAccessedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// LinkShare document interface with methods
export interface ILinkShareDocument extends ILinkShare, Document {
  isExpired(): boolean;
  isValid(): boolean;
  incrementAccessCount(): Promise<ILinkShareDocument>;
}

// LinkShare model interface with static methods
export interface ILinkShareModel extends Model<ILinkShareDocument> {
  generateShareToken(): string;
  findByToken(token: string): Promise<ILinkShareDocument | null>;
}

// LinkShare schema definition
const LinkShareSchema = new Schema<ILinkShareDocument, ILinkShareModel>(
  {
    linkId: {
      type: Schema.Types.ObjectId,
      ref: 'Link',
      required: [true, 'Link ID is required'],
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },
    sharedWithEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    sharedWithUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    shareToken: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    permission: {
      type: String,
      enum: ['view', 'edit', 'analytics'],
      default: 'view',
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
    accessCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: 'link_shares',
  }
);

// Indexes
LinkShareSchema.index({ linkId: 1, sharedWithEmail: 1 });
LinkShareSchema.index({ linkId: 1, sharedWithUserId: 1 });
LinkShareSchema.index({ ownerId: 1, createdAt: -1 });
LinkShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });

// Static method to generate share token
LinkShareSchema.statics.generateShareToken = function (): string {
  return crypto.randomBytes(32).toString('hex');
};

// Static method to find by token
LinkShareSchema.statics.findByToken = async function (token: string): Promise<ILinkShareDocument | null> {
  return this.findOne({ shareToken: token, isRevoked: false })
    .populate('linkId')
    .populate('ownerId', 'name email');
};

// Method to check if share is expired
LinkShareSchema.methods.isExpired = function (): boolean {
  const share = this as ILinkShareDocument;
  if (!share.expiresAt) {
    return false;
  }
  return new Date() > share.expiresAt;
};

// Method to check if share is valid
LinkShareSchema.methods.isValid = function (): boolean {
  const share = this as ILinkShareDocument;
  return !share.isRevoked && !share.isExpired();
};

// Method to increment access count
LinkShareSchema.methods.incrementAccessCount = async function (): Promise<ILinkShareDocument> {
  const share = this as ILinkShareDocument;
  share.accessCount += 1;
  share.lastAccessedAt = new Date();
  return await share.save();
};

// Pre-save middleware to generate token if not set
LinkShareSchema.pre('save', function (next) {
  const share = this as ILinkShareDocument;
  if (!share.shareToken) {
    share.shareToken = crypto.randomBytes(32).toString('hex');
  }
  next();
});

// Create and export the LinkShare model
const LinkShare = mongoose.model<ILinkShareDocument, ILinkShareModel>('LinkShare', LinkShareSchema);

export default LinkShare;
