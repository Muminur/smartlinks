# Database Models Documentation

This directory contains all Mongoose database schemas for the Shortlinks application.

## Overview

All models are built with:
- **TypeScript** for type safety
- **Mongoose 8.x** with proper TypeScript interfaces
- **Comprehensive validation** rules
- **Optimized indexes** for performance
- **Instance and static methods** for common operations
- **Pre-save hooks** for data processing
- **Virtual properties** for computed fields

## Models Summary

### 1. User Model (`user.model.ts`)
**Purpose**: User authentication, authorization, and profile management

**Key Fields**:
- Email (unique, indexed, validated)
- Password (hashed with bcrypt)
- Role (user/admin)
- Plan (nested: type, startDate, endDate, autoRenew)
- Quota (nested: links, clicks, domains - created/limit)
- Email verification tokens
- Password reset tokens
- Two-factor authentication secret

**Methods**:
- `comparePassword()` - Verify password for login
- `generateAuthToken()` - Generate JWT access token
- `generateRefreshToken()` - Generate JWT refresh token

**Indexes**:
- `email` (unique)
- `plan.type`

**Hooks**:
- Pre-save: Hash password with bcrypt (10 rounds)

---

### 2. Link Model (`link.model.ts`)
**Purpose**: Shortened URLs with metadata and tracking

**Key Fields**:
- Slug (unique, indexed, lowercase, validated)
- Original URL (validated)
- Short URL (full shortened URL)
- User ID (ref: User)
- Domain (default: 'short.link')
- Title, description, tags
- Metadata (OG tags for social media)
- QR code (base64)
- Password protection (hashed)
- Expiration date (TTL index)
- Max clicks limit
- Click count
- UTM parameters

**Methods**:
- `incrementClicks()` - Increment click count and update lastClickedAt
- `isExpired()` - Check if link has expired
- `isMaxClicksReached()` - Check if max clicks reached
- `comparePassword()` - Verify password for protected links

**Virtuals**:
- `isAccessible` - Check if link is active, not expired, and not maxed out

**Indexes**:
- `slug` (unique)
- `userId + createdAt` (compound)
- `originalUrl`
- `expiresAt` (TTL, sparse)
- `domain`
- `tags`

**Hooks**:
- Pre-save: Hash password if provided

---

### 3. Analytics Model (`analytics.model.ts`)
**Purpose**: Click tracking and analytics data

**Key Fields**:
- Link ID (ref: Link)
- User ID (ref: User)
- Timestamp
- IP address (hashed for privacy)
- Location (country, region, city, coordinates)
- Device (type, brand, model)
- OS (name, version)
- Browser (name, version)
- Referrer (url, domain, type)
- UTM parameters (source, medium, campaign, term, content)

**Static Methods**:
- `getAnalyticsByLink()` - Get analytics for a specific link with date range
- `getAnalyticsByUser()` - Get analytics for a user with date range

**Indexes**:
- `linkId + timestamp` (compound)
- `userId + timestamp` (compound)
- `timestamp` (TTL: 2 years = 63,072,000 seconds)
- `device.type`
- `location.countryCode`
- `referrer.type`

**Hooks**:
- Pre-save: Hash IP address with SHA-256 for privacy

---

### 4. Domain Model (`domain.model.ts`)
**Purpose**: Custom domain management and verification

**Key Fields**:
- Domain (unique, validated)
- User ID (ref: User)
- Verification status
- Verification token
- Verification method (dns/http/email)
- DNS records (array: type, name, value, verified)
- SSL enabled
- SSL certificate (issuer, expiresAt, autoRenew)
- Active status
- Last verified date

**Methods**:
- `generateVerificationToken()` - Generate random token
- `markAsVerified()` - Mark domain and DNS records as verified
- `isExpiringSoon()` - Check if SSL cert expires within 30 days

**Static Methods**:
- `findByDomain()` - Find domain by name
- `findByUserId()` - Get all domains for a user

**Virtuals**:
- `verificationUrl` - HTTP verification URL
- `dnsVerificationInstructions` - Formatted DNS setup instructions

**Indexes**:
- `domain` (unique)
- `userId`
- `isVerified + isActive` (compound)
- `verificationToken`

**Hooks**:
- Pre-save: Generate verification token if not present

---

### 5. Plan Model (`plan.model.ts`)
**Purpose**: Subscription tier definitions

**Key Fields**:
- Name (unique)
- Tier (free/pro/business/enterprise, unique)
- Price
- Currency (default: USD)
- Billing cycle (monthly/yearly)
- Features (nested object):
  - Links limit
  - Clicks limit
  - Custom domains
  - Analytics retention (days)
  - Boolean flags (QR codes, password protection, API access, etc.)
  - Team members limit
- Limits (nested object):
  - Max links per day
  - Max API calls
  - Max team size
- Active status
- Display order
- Payment gateway IDs (Stripe, 2Checkout)

**Methods**:
- `isFree()` - Check if plan is free
- `isPremium()` - Check if plan is premium tier
- `hasFeature()` - Check if plan includes a specific feature

**Static Methods**:
- `getFreePlan()` - Get the free plan
- `getActivePlans()` - Get all active plans sorted by display order
- `findByTier()` - Find plan by tier

**Virtuals**:
- `monthlyPrice` - Convert yearly price to monthly equivalent
- `yearlyDiscount` - Calculate savings for yearly plans

**Indexes**:
- `tier` (unique)
- `isActive`
- `displayOrder`

---

### 6. Payment Model (`payment.model.ts`)
**Purpose**: Payment transaction tracking

**Key Fields**:
- User ID (ref: User)
- Plan ID (ref: Plan)
- Transaction ID (unique)
- Amount
- Currency (default: USD)
- Status (pending/completed/failed/refunded/cancelled)
- Payment method (credit_card/debit_card/paypal/bank_transfer)
- Payment gateway (2checkout/stripe/paypal)
- Billing details (nested: name, email, address)
- Invoice URL and number
- Receipt URL
- Subscription ID
- Refund details (amount, reason, date)
- Metadata (flexible object)
- Notes

**Methods**:
- `markAsCompleted()` - Mark payment as completed
- `markAsFailed()` - Mark payment as failed with optional reason
- `processRefund()` - Process a refund

**Static Methods**:
- `findByUserId()` - Get user's payment history
- `findByTransactionId()` - Find payment by transaction ID
- `getTotalRevenue()` - Calculate total revenue with date range
- `getRevenueByPlan()` - Calculate revenue for specific plan

**Virtuals**:
- `isSuccessful` - Check if payment completed
- `formattedAmount` - Get formatted amount string

**Indexes**:
- `userId + createdAt` (compound)
- `transactionId` (unique)
- `status`
- `planId`
- `subscriptionId`
- `createdAt`

**Hooks**:
- Pre-save: Generate invoice number (format: INV-YYYYMMDD-RANDOM)

---

## Usage Examples

### Importing Models

```typescript
// Import all models
import { User, Link, Analytics, Domain, Plan, Payment } from './models';

// Import specific model with types
import User, { IUser, IUserDocument } from './models/user.model';
```

### Creating Documents

```typescript
// Create a new user
const user = await User.create({
  email: 'user@example.com',
  password: 'securePassword123',
  name: 'John Doe',
  role: 'user',
  plan: {
    type: 'free',
    startDate: new Date(),
    autoRenew: false,
  },
  quota: {
    linksCreated: 0,
    linksLimit: 50,
    clicksTracked: 0,
    clicksLimit: 1000,
    domainsUsed: 0,
    domainsLimit: 0,
  },
});

// Password is automatically hashed via pre-save hook
```

### Using Methods

```typescript
// User authentication
const user = await User.findOne({ email: 'user@example.com' }).select('+password');
const isValid = await user.comparePassword('userProvidedPassword');

if (isValid) {
  const token = user.generateAuthToken();
  const refreshToken = user.generateRefreshToken();
}

// Link operations
const link = await Link.findOne({ slug: 'my-link' });
await link.incrementClicks(); // Increment and save

if (link.isExpired() || link.isMaxClicksReached()) {
  // Handle inaccessible link
}

// Analytics queries
const analytics = await Analytics.getAnalyticsByLink('linkId', startDate, endDate);

// Revenue calculations
const totalRevenue = await Payment.getTotalRevenue(startDate, endDate);
```

### Relationships

```typescript
// Populate related documents
const link = await Link.findById('linkId')
  .populate('userId', 'name email')
  .exec();

const payment = await Payment.findById('paymentId')
  .populate('userId')
  .populate('planId')
  .exec();
```

## Best Practices

1. **Always use interfaces**: Import and use TypeScript interfaces for type safety
2. **Select password fields explicitly**: Password fields are excluded by default (select: false)
3. **Use methods over direct manipulation**: Use provided methods like `incrementClicks()` instead of manual updates
4. **Leverage indexes**: Queries are optimized with compound indexes
5. **Handle errors**: All methods can throw errors - use try-catch blocks
6. **Validate before save**: Mongoose validators run automatically, but pre-validate when possible
7. **Use transactions**: For operations affecting multiple collections, use MongoDB transactions

## Environment Variables Required

```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# IP Hashing (Analytics)
IP_HASH_SECRET=your-ip-hash-secret
```

## Migration Notes

When deploying to production:

1. Ensure all indexes are created: `db.collection.getIndexes()`
2. Set up TTL indexes for analytics and expired links
3. Configure proper MongoDB user permissions
4. Enable authentication and SSL/TLS
5. Set up regular backups
6. Monitor index usage and query performance

## Performance Considerations

- **Analytics collection** grows rapidly - TTL index automatically removes data after 2 years
- **Links with expiration** are removed by MongoDB TTL index
- **Compound indexes** optimize common query patterns
- **IP hashing** protects user privacy while allowing analytics
- **Password hashing** uses bcrypt with cost factor 10 (balance of security/performance)

## File Statistics

- **Total Lines**: ~1,700 lines
- **Total Models**: 6
- **Total Indexes**: 25+
- **Instance Methods**: 15+
- **Static Methods**: 10+
- **Pre-save Hooks**: 6
- **Virtual Properties**: 8+

## Support

For questions or issues with the database models, refer to:
- Mongoose 8 Documentation: https://mongoosejs.com/docs/8.x/
- MongoDB Manual: https://docs.mongodb.com/manual/
- TypeScript Handbook: https://www.typescriptlang.org/docs/

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Mongoose Version**: 8.x
**MongoDB Version**: 7.x
