import mongoose, { Schema, Document, Model, Types } from 'mongoose';

// Payment interface - represents a payment transaction document in MongoDB
export interface IPayment {
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  transactionId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer' | 'other';
  paymentGateway: '2checkout' | 'stripe' | 'paypal' | 'other';
  billingDetails: {
    name?: string;
    email?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  invoiceUrl?: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  subscriptionId?: string;
  refundAmount?: number;
  refundReason?: string;
  refundedAt?: Date;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Payment document interface with methods
export interface IPaymentDocument extends IPayment, Document {
  markAsCompleted(): Promise<IPaymentDocument>;
  markAsFailed(reason?: string): Promise<IPaymentDocument>;
  processRefund(amount: number, reason: string): Promise<IPaymentDocument>;
}

// Payment model interface with static methods
export interface IPaymentModel extends Model<IPaymentDocument> {
  findByUserId(userId: string, limit?: number): Promise<IPaymentDocument[]>;
  findByTransactionId(transactionId: string): Promise<IPaymentDocument | null>;
  getTotalRevenue(startDate?: Date, endDate?: Date): Promise<number>;
  getRevenueByPlan(planId: string, startDate?: Date, endDate?: Date): Promise<number>;
}

// Payment schema definition
const PaymentSchema = new Schema<IPaymentDocument, IPaymentModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'Plan',
      required: [true, 'Plan ID is required'],
      index: true,
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      default: 'USD',
      maxlength: [3, 'Currency code must be 3 characters'],
    },
    status: {
      type: String,
      required: [true, 'Payment status is required'],
      enum: {
        values: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
        message: 'Status must be pending, completed, failed, refunded, or cancelled',
      },
      default: 'pending',
      index: true,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'other'],
        message: 'Payment method must be credit_card, debit_card, paypal, bank_transfer, or other',
      },
      default: 'credit_card',
    },
    paymentGateway: {
      type: String,
      required: [true, 'Payment gateway is required'],
      enum: {
        values: ['2checkout', 'stripe', 'paypal', 'other'],
        message: 'Payment gateway must be 2checkout, stripe, paypal, or other',
      },
      default: '2checkout',
    },
    billingDetails: {
      name: {
        type: String,
        trim: true,
        default: null,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
      },
      address: {
        line1: {
          type: String,
          trim: true,
          default: null,
        },
        line2: {
          type: String,
          trim: true,
          default: null,
        },
        city: {
          type: String,
          trim: true,
          default: null,
        },
        state: {
          type: String,
          trim: true,
          default: null,
        },
        postalCode: {
          type: String,
          trim: true,
          default: null,
        },
        country: {
          type: String,
          trim: true,
          uppercase: true,
          maxlength: [2, 'Country code must be 2 characters'],
          default: null,
        },
      },
    },
    invoiceUrl: {
      type: String,
      trim: true,
      default: null,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
      default: null,
    },
    subscriptionId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    refundAmount: {
      type: Number,
      min: [0, 'Refund amount cannot be negative'],
      default: null,
    },
    refundReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Refund reason cannot exceed 500 characters'],
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'payments',
  }
);

// Indexes
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ transactionId: 1 }, { unique: true });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ planId: 1 });
PaymentSchema.index({ subscriptionId: 1 });
PaymentSchema.index({ createdAt: -1 });

// Method to mark payment as completed
PaymentSchema.methods.markAsCompleted = async function (): Promise<IPaymentDocument> {
  const payment = this as IPaymentDocument;

  payment.status = 'completed';

  return await payment.save();
};

// Method to mark payment as failed
PaymentSchema.methods.markAsFailed = async function (
  reason?: string
): Promise<IPaymentDocument> {
  const payment = this as IPaymentDocument;

  payment.status = 'failed';
  if (reason) {
    payment.notes = reason;
  }

  return await payment.save();
};

// Method to process refund
PaymentSchema.methods.processRefund = async function (
  amount: number,
  reason: string
): Promise<IPaymentDocument> {
  const payment = this as IPaymentDocument;

  if (payment.status !== 'completed') {
    throw new Error('Can only refund completed payments');
  }

  if (amount > payment.amount) {
    throw new Error('Refund amount cannot exceed payment amount');
  }

  payment.status = 'refunded';
  payment.refundAmount = amount;
  payment.refundReason = reason;
  payment.refundedAt = new Date();

  return await payment.save();
};

// Static method to find payments by user ID
PaymentSchema.statics.findByUserId = async function (
  userId: string,
  limit: number = 50
): Promise<IPaymentDocument[]> {
  return await this.find({ userId: new Types.ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('planId');
};

// Static method to find payment by transaction ID
PaymentSchema.statics.findByTransactionId = async function (
  transactionId: string
): Promise<IPaymentDocument | null> {
  return await this.findOne({ transactionId });
};

// Static method to calculate total revenue
PaymentSchema.statics.getTotalRevenue = async function (
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  const query: any = { status: 'completed' };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const result = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalRevenue : 0;
};

// Static method to get revenue by plan
PaymentSchema.statics.getRevenueByPlan = async function (
  planId: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  const query: any = {
    planId: new Types.ObjectId(planId),
    status: 'completed',
  };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  const result = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
      },
    },
  ]);

  return result.length > 0 ? result[0].totalRevenue : 0;
};

// Pre-save middleware to generate invoice number if not present
PaymentSchema.pre('save', function (next) {
  const payment = this as IPaymentDocument;

  if (!payment.invoiceNumber && payment.isNew) {
    // Generate invoice number: INV-YYYYMMDD-RANDOM
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    payment.invoiceNumber = `INV-${dateStr}-${random}`;
  }

  next();
});

// Virtual property to check if payment is successful
PaymentSchema.virtual('isSuccessful').get(function () {
  const payment = this as IPaymentDocument;
  return payment.status === 'completed';
});

// Virtual property to get formatted amount
PaymentSchema.virtual('formattedAmount').get(function () {
  const payment = this as IPaymentDocument;
  return `${payment.currency} ${payment.amount.toFixed(2)}`;
});

// Ensure virtuals are included in JSON output
PaymentSchema.set('toJSON', { virtuals: true });
PaymentSchema.set('toObject', { virtuals: true });

// Create and export the Payment model
const Payment = mongoose.model<IPaymentDocument, IPaymentModel>('Payment', PaymentSchema);

export default Payment;
