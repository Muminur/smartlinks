import mongoose, { Schema, Document, Model } from 'mongoose';

// Plan interface - represents a subscription plan document in MongoDB
export interface IPlan {
  name: string;
  tier: 'free' | 'pro' | 'business' | 'enterprise';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: {
    linksLimit: number;
    clicksLimit: number;
    customDomains: number;
    analyticsRetention: number; // in days
    customSlugs: boolean;
    qrCodes: boolean;
    passwordProtection: boolean;
    linkExpiration: boolean;
    bulkOperations: boolean;
    apiAccess: boolean;
    advancedAnalytics: boolean;
    whiteLabel: boolean;
    prioritySupport: boolean;
    teamMembers: number;
  };
  limits: {
    maxLinksPerDay: number;
    maxApiCalls: number;
    maxTeamSize: number;
  };
  isActive: boolean;
  displayOrder: number;
  stripePriceId?: string;
  twoCheckoutPlanId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Plan document interface with methods
export interface IPlanDocument extends IPlan, Document {
  isFree(): boolean;
  isPremium(): boolean;
  hasFeature(feature: string): boolean;
}

// Plan model interface with static methods
export interface IPlanModel extends Model<IPlanDocument> {
  getFreePlan(): Promise<IPlanDocument | null>;
  getActivePlans(): Promise<IPlanDocument[]>;
  findByTier(tier: string): Promise<IPlanDocument | null>;
}

// Plan schema definition
const PlanSchema = new Schema<IPlanDocument, IPlanModel>(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Plan name cannot exceed 50 characters'],
    },
    tier: {
      type: String,
      required: [true, 'Plan tier is required'],
      enum: {
        values: ['free', 'pro', 'business', 'enterprise'],
        message: 'Tier must be free, pro, business, or enterprise',
      },
      unique: true,
      index: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
      default: 0,
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      default: 'USD',
      maxlength: [3, 'Currency code must be 3 characters'],
    },
    billingCycle: {
      type: String,
      required: [true, 'Billing cycle is required'],
      enum: {
        values: ['monthly', 'yearly'],
        message: 'Billing cycle must be monthly or yearly',
      },
      default: 'monthly',
    },
    features: {
      linksLimit: {
        type: Number,
        required: [true, 'Links limit is required'],
        min: [0, 'Links limit cannot be negative'],
        default: 50,
      },
      clicksLimit: {
        type: Number,
        required: [true, 'Clicks limit is required'],
        min: [0, 'Clicks limit cannot be negative'],
        default: 1000,
      },
      customDomains: {
        type: Number,
        required: [true, 'Custom domains limit is required'],
        min: [0, 'Custom domains cannot be negative'],
        default: 0,
      },
      analyticsRetention: {
        type: Number,
        required: [true, 'Analytics retention is required'],
        min: [1, 'Analytics retention must be at least 1 day'],
        default: 30, // 30 days for free tier
      },
      customSlugs: {
        type: Boolean,
        default: true,
      },
      qrCodes: {
        type: Boolean,
        default: false,
      },
      passwordProtection: {
        type: Boolean,
        default: false,
      },
      linkExpiration: {
        type: Boolean,
        default: false,
      },
      bulkOperations: {
        type: Boolean,
        default: false,
      },
      apiAccess: {
        type: Boolean,
        default: false,
      },
      advancedAnalytics: {
        type: Boolean,
        default: false,
      },
      whiteLabel: {
        type: Boolean,
        default: false,
      },
      prioritySupport: {
        type: Boolean,
        default: false,
      },
      teamMembers: {
        type: Number,
        min: [1, 'Team members must be at least 1'],
        default: 1,
      },
    },
    limits: {
      maxLinksPerDay: {
        type: Number,
        required: [true, 'Max links per day is required'],
        min: [1, 'Max links per day must be at least 1'],
        default: 10,
      },
      maxApiCalls: {
        type: Number,
        required: [true, 'Max API calls is required'],
        min: [0, 'Max API calls cannot be negative'],
        default: 100,
      },
      maxTeamSize: {
        type: Number,
        required: [true, 'Max team size is required'],
        min: [1, 'Max team size must be at least 1'],
        default: 1,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, 'Display order cannot be negative'],
    },
    stripePriceId: {
      type: String,
      trim: true,
      default: null,
    },
    twoCheckoutPlanId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'plans',
  }
);

// Indexes
PlanSchema.index({ tier: 1 }, { unique: true });
PlanSchema.index({ isActive: 1 });
PlanSchema.index({ displayOrder: 1 });

// Method to check if plan is free
PlanSchema.methods.isFree = function (): boolean {
  const plan = this as IPlanDocument;
  return plan.tier === 'free' || plan.price === 0;
};

// Method to check if plan is premium (pro, business, or enterprise)
PlanSchema.methods.isPremium = function (): boolean {
  const plan = this as IPlanDocument;
  return ['pro', 'business', 'enterprise'].includes(plan.tier);
};

// Method to check if plan has a specific feature
PlanSchema.methods.hasFeature = function (feature: string): boolean {
  const plan = this as IPlanDocument;
  return (plan.features as Record<string, unknown>)[feature] === true;
};

// Static method to get the free plan
PlanSchema.statics.getFreePlan = async function (): Promise<IPlanDocument | null> {
  return await this.findOne({ tier: 'free', isActive: true });
};

// Static method to get all active plans
PlanSchema.statics.getActivePlans = async function (): Promise<IPlanDocument[]> {
  return await this.find({ isActive: true }).sort({ displayOrder: 1 });
};

// Static method to find plan by tier
PlanSchema.statics.findByTier = async function (tier: string): Promise<IPlanDocument | null> {
  return await this.findOne({ tier, isActive: true });
};

// Virtual property to get monthly price (convert yearly to monthly)
PlanSchema.virtual('monthlyPrice').get(function () {
  const plan = this as IPlanDocument;
  if (plan.billingCycle === 'yearly') {
    return plan.price / 12;
  }
  return plan.price;
});

// Virtual property to get savings for yearly plans
PlanSchema.virtual('yearlyDiscount').get(function () {
  const plan = this as IPlanDocument;
  if (plan.billingCycle === 'yearly') {
    // Assuming yearly plans have 20% discount
    const monthlyEquivalent = (plan.price / 12) * 12 * 1.2;
    return monthlyEquivalent - plan.price;
  }
  return 0;
});

// Ensure virtuals are included in JSON output
PlanSchema.set('toJSON', { virtuals: true });
PlanSchema.set('toObject', { virtuals: true });

// Create and export the Plan model
const Plan = mongoose.model<IPlanDocument, IPlanModel>('Plan', PlanSchema);

export default Plan;
