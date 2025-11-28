import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// User interface - represents a user document in MongoDB
export interface IUser {
  email: string;
  password: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  plan: {
    type: 'free' | 'pro' | 'business' | 'enterprise';
    startDate: Date;
    endDate?: Date;
    autoRenew: boolean;
  };
  quota: {
    linksCreated: number;
    linksLimit: number;
    clicksTracked: number;
    clicksLimit: number;
    domainsUsed: number;
    domainsLimit: number;
  };
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  refreshToken?: string;
  twoFactorSecret?: string;
  lastLogin?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// User document interface with methods
export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
  generateEmailVerificationToken(): string;
  generatePasswordResetToken(): string;
}

// User model interface with static methods
export type IUserModel = Model<IUserDocument>;

// User schema definition
const UserSchema = new Schema<IUserDocument, IUserModel>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
      select: false, // Don't return password by default
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'Role must be either user or admin',
      },
      default: 'user',
    },
    plan: {
      type: {
        type: String,
        enum: {
          values: ['free', 'pro', 'business', 'enterprise'],
          message: 'Plan type must be free, pro, business, or enterprise',
        },
        default: 'free',
      },
      startDate: {
        type: Date,
        default: Date.now,
      },
      endDate: {
        type: Date,
        default: null,
      },
      autoRenew: {
        type: Boolean,
        default: false,
      },
    },
    quota: {
      linksCreated: {
        type: Number,
        default: 0,
        min: [0, 'Links created cannot be negative'],
      },
      linksLimit: {
        type: Number,
        default: 50, // Free tier limit
      },
      clicksTracked: {
        type: Number,
        default: 0,
        min: [0, 'Clicks tracked cannot be negative'],
      },
      clicksLimit: {
        type: Number,
        default: 1000, // Free tier limit
      },
      domainsUsed: {
        type: Number,
        default: 0,
        min: [0, 'Domains used cannot be negative'],
      },
      domainsLimit: {
        type: Number,
        default: 0, // Free tier has no custom domains
      },
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'users',
  }
);

// Indexes
// email index is already created by unique: true constraint on line 59
UserSchema.index({ 'plan.type': 1 });
UserSchema.index({ emailVerificationToken: 1 });
UserSchema.index({ resetPasswordToken: 1 });

// Pre-save middleware to hash password
UserSchema.pre('save', async function (next) {
  const user = this as IUserDocument;

  // Only hash password if it has been modified
  if (!user.isModified('password')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// Method to compare password for login
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    const user = this as IUserDocument;
    return await bcrypt.compare(candidatePassword, user.password);
  } catch {
    return false;
  }
};

// Method to generate JWT access token
UserSchema.methods.generateAuthToken = function (): string {
  const user = this as IUserDocument;

  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE as jwt.SignOptions['expiresIn'],
  });
};

// Method to generate JWT refresh token
UserSchema.methods.generateRefreshToken = function (): string {
  const user = this as IUserDocument;

  const payload = {
    id: user._id,
  };

  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRE as jwt.SignOptions['expiresIn'],
  });
};

// Generate email verification token
UserSchema.methods.generateEmailVerificationToken = function (): string {
  const user = this as IUserDocument;
  const token = Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15);

  user.emailVerificationToken = token;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  return token;
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function (): string {
  const user = this as IUserDocument;
  const token = Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15);

  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  return token;
};

// Create and export the User model
const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);

export default User;
