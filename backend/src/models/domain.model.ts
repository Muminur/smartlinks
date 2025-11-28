import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import crypto from 'crypto';

// Domain interface - represents a custom domain document in MongoDB
export interface IDomain {
  domain: string;
  userId: Types.ObjectId;
  isVerified: boolean;
  verificationToken: string;
  verificationMethod?: 'dns' | 'http' | 'email';
  dnsRecords: {
    type: 'A' | 'CNAME' | 'TXT';
    name: string;
    value: string;
    verified: boolean;
  }[];
  sslEnabled: boolean;
  sslCertificate?: {
    issuer?: string;
    expiresAt?: Date;
    autoRenew: boolean;
  };
  isActive: boolean;
  lastVerifiedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Domain document interface with methods
export interface IDomainDocument extends IDomain, Document {
  generateVerificationToken(): string;
  markAsVerified(): Promise<IDomainDocument>;
  isExpiringSoon(): boolean;
}

// Domain model interface with static methods
export interface IDomainModel extends Model<IDomainDocument> {
  findByDomain(domain: string): Promise<IDomainDocument | null>;
  findByUserId(userId: string): Promise<IDomainDocument[]>;
}

// Domain schema definition
const DomainSchema = new Schema<IDomainDocument, IDomainModel>(
  {
    domain: {
      type: String,
      required: [true, 'Domain is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (domain: string) {
          // Basic domain validation
          const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
          return domainRegex.test(domain);
        },
        message: 'Please provide a valid domain name',
      },
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationToken: {
      type: String,
      required: [true, 'Verification token is required'],
      unique: true,
    },
    verificationMethod: {
      type: String,
      enum: {
        values: ['dns', 'http', 'email'],
        message: 'Verification method must be dns, http, or email',
      },
      default: 'dns',
    },
    dnsRecords: {
      type: [
        {
          type: {
            type: String,
            enum: {
              values: ['A', 'CNAME', 'TXT'],
              message: 'DNS record type must be A, CNAME, or TXT',
            },
            required: [true, 'DNS record type is required'],
          },
          name: {
            type: String,
            required: [true, 'DNS record name is required'],
            trim: true,
          },
          value: {
            type: String,
            required: [true, 'DNS record value is required'],
            trim: true,
          },
          verified: {
            type: Boolean,
            default: false,
          },
        },
      ],
      default: [],
    },
    sslEnabled: {
      type: Boolean,
      default: false,
    },
    sslCertificate: {
      issuer: {
        type: String,
        trim: true,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      autoRenew: {
        type: Boolean,
        default: true,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'domains',
  }
);

// Indexes
DomainSchema.index({ domain: 1 }, { unique: true });
DomainSchema.index({ userId: 1 });
DomainSchema.index({ isVerified: 1, isActive: 1 });
DomainSchema.index({ verificationToken: 1 });

// Pre-save middleware to generate verification token if not present
DomainSchema.pre('save', function (next) {
  const domain = this as IDomainDocument;

  if (!domain.verificationToken || domain.isNew) {
    domain.verificationToken = domain.generateVerificationToken();
  }

  next();
});

// Method to generate verification token
DomainSchema.methods.generateVerificationToken = function (): string {
  return crypto.randomBytes(32).toString('hex');
};

// Method to mark domain as verified
DomainSchema.methods.markAsVerified = async function (): Promise<IDomainDocument> {
  const domain = this as IDomainDocument;

  domain.isVerified = true;
  domain.lastVerifiedAt = new Date();

  // Mark all DNS records as verified
  domain.dnsRecords = domain.dnsRecords.map((record) => ({
    ...record,
    verified: true,
  }));

  return await domain.save();
};

// Method to check if SSL certificate is expiring soon (within 30 days)
DomainSchema.methods.isExpiringSoon = function (): boolean {
  const domain = this as IDomainDocument;

  if (!domain.sslCertificate || !domain.sslCertificate.expiresAt) {
    return false;
  }

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  return domain.sslCertificate.expiresAt <= thirtyDaysFromNow;
};

// Static method to find domain by domain name
DomainSchema.statics.findByDomain = async function (
  domain: string
): Promise<IDomainDocument | null> {
  return await this.findOne({ domain: domain.toLowerCase() });
};

// Static method to find all domains by user ID
DomainSchema.statics.findByUserId = async function (
  userId: string
): Promise<IDomainDocument[]> {
  return await this.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 });
};

// Virtual property to get verification URL
DomainSchema.virtual('verificationUrl').get(function () {
  const domain = this as IDomainDocument;
  return `http://${domain.domain}/.well-known/domain-verification.txt`;
});

// Virtual property to get DNS verification instructions
DomainSchema.virtual('dnsVerificationInstructions').get(function () {
  const domain = this as IDomainDocument;
  return domain.dnsRecords.map((record) => ({
    type: record.type,
    name: record.name,
    value: record.value,
    instruction: `Add a ${record.type} record with name "${record.name}" and value "${record.value}"`,
  }));
});

// Ensure virtuals are included in JSON output
DomainSchema.set('toJSON', { virtuals: true });
DomainSchema.set('toObject', { virtuals: true });

// Create and export the Domain model
const Domain = mongoose.model<IDomainDocument, IDomainModel>('Domain', DomainSchema);

export default Domain;
