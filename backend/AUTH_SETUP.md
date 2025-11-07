# Authentication System Setup Guide

## Overview
This document provides comprehensive information about the authentication system implemented in the TinyURL Clone backend.

## Features Implemented

### Core Authentication
- User registration with email verification
- Login with JWT access tokens
- Refresh token mechanism (httpOnly cookies)
- Password reset flow
- Email verification
- Change password (for authenticated users)
- Logout with token invalidation

### Security Features
- Password hashing with bcrypt (10 rounds)
- JWT tokens with short expiration (15 minutes for access, 7 days for refresh)
- httpOnly cookies for refresh tokens
- Rate limiting (5 requests/15min for auth endpoints)
- Input validation with Joi
- Role-based access control (RBAC)
- Email verification requirement option

### Middleware
- `authenticateToken` - Verify JWT from Authorization header
- `authorizeRoles(...roles)` - Check user role permissions
- `requireEmailVerification` - Ensure email is verified
- `optionalAuth` - Attach user if token exists, but don't fail
- `requireOwnershipOrAdmin` - Resource ownership validation
- `extractUserId` - Extract user ID without full validation

## API Endpoints

### Public Endpoints

#### 1. Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "plan": "free",
      "isEmailVerified": false,
      "createdAt": "2024-11-07T...",
      "updatedAt": "2024-11-07T..."
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Registration successful. Please check your email to verify your account."
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

#### 3. Verify Email
```http
GET /api/auth/verify-email/:token
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... }
  },
  "message": "Email verified successfully"
}
```

#### 4. Resend Verification Email
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "user@example.com"
}
```

#### 5. Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

#### 6. Reset Password
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "password": "NewSecurePass123",
  "confirmPassword": "NewSecurePass123"
}
```

#### 7. Refresh Token
```http
POST /api/auth/refresh-token
Content-Type: application/json
Cookie: refreshToken=...

{
  "refreshToken": "optional-if-not-in-cookie"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Token refreshed successfully"
}
```

### Protected Endpoints

#### 8. Get Current User
```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

#### 9. Change Password
```http
PUT /api/auth/change-password
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "currentPassword": "OldPass123",
  "newPassword": "NewSecurePass123",
  "confirmPassword": "NewSecurePass123"
}
```

#### 10. Logout
```http
POST /api/auth/logout
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

## Environment Variables

Required environment variables in `.env`:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production-min-32-chars
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@tinyurl.com

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://admin:admin123@localhost:27017/tinyurl?authSource=admin
```

## File Structure

```
backend/src/
├── models/
│   └── User.ts                    # User schema with auth methods
├── services/
│   ├── auth.service.ts           # Authentication business logic
│   └── email.service.ts          # Email sending service
├── controllers/
│   └── auth.controller.ts        # Auth endpoint handlers
├── middleware/
│   ├── auth.middleware.ts        # JWT verification & authorization
│   ├── auth.validation.ts        # Joi validation schemas
│   ├── rateLimiter.ts           # Rate limiting configuration
│   └── validateRequest.ts       # Request validation helper
├── routes/
│   ├── auth.routes.ts           # Auth route definitions
│   └── index.ts                 # Main router
└── config/
    └── env.ts                   # Environment configuration
```

## Usage Examples

### Using Authentication in Routes

```typescript
import { Router } from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { UserRole } from '../types';

const router = Router();

// Public route
router.get('/public', publicHandler);

// Protected route (any authenticated user)
router.get('/protected', authenticateToken, protectedHandler);

// Admin only route
router.get('/admin',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN),
  adminHandler
);

// Multiple roles allowed
router.get('/moderator',
  authenticateToken,
  authorizeRoles(UserRole.ADMIN, UserRole.MODERATOR),
  moderatorHandler
);

// Require email verification
router.post('/create-link',
  authenticateToken,
  requireEmailVerification,
  createLinkHandler
);
```

### Accessing User in Controllers

```typescript
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';

export const myController = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  const userEmail = authReq.user?.email;
  const userRole = authReq.user?.role;

  // Use user information
  console.log(`User ${userEmail} (${userId}) is accessing this endpoint`);
};
```

## Validation Rules

### Registration
- Email: Valid email format, lowercase, trimmed
- Password: Min 8 chars, max 128 chars, must contain uppercase, lowercase, and number
- First Name: 2-50 characters
- Last Name: 2-50 characters

### Password Reset
- Same password requirements as registration
- Password and confirmPassword must match

## Rate Limiting

### Auth Endpoints
- 5 requests per 15 minutes per IP
- Applied to: register, login, forgot-password, reset-password, resend-verification
- Skips successful requests (only counts failures)

### API Endpoints
- 100 requests per 15 minutes per IP
- Applied to all other endpoints

## Email Templates

The system sends the following emails:

1. **Verification Email** - Sent on registration
   - Contains verification link (expires in 24 hours)
   - Frontend URL: `${FRONTEND_URL}/verify-email/${token}`

2. **Password Reset Email** - Sent on forgot password
   - Contains reset link (expires in 1 hour)
   - Frontend URL: `${FRONTEND_URL}/reset-password/${token}`

3. **Welcome Email** - Sent after email verification
   - Welcomes user and provides getting started info

4. **Password Changed Email** - Sent after successful password reset
   - Security notification

## Testing

### Manual Testing with cURL

#### Register
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "firstName": "Test",
    "lastName": "User"
  }'
```

#### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

#### Get Current User
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Security Best Practices

1. **JWT Secrets**: Always use strong, random secrets in production
   ```bash
   # Generate secure secret
   openssl rand -base64 64
   ```

2. **HTTPS Only**: In production, ensure `secure: true` for cookies

3. **CORS**: Configure proper CORS settings for your frontend domain

4. **Rate Limiting**: Monitor and adjust rate limits based on usage

5. **Email Security**: Use app-specific passwords for Gmail or dedicated email service

6. **Environment Variables**: Never commit `.env` files to version control

7. **Password Hashing**: bcrypt with 10 rounds (configurable)

8. **Token Expiration**:
   - Access tokens: 15 minutes (short-lived)
   - Refresh tokens: 7 days (stored in httpOnly cookies)

## Troubleshooting

### Common Issues

1. **JWT_SECRET not set**
   - Ensure `.env` file exists in backend root
   - Copy from `.env.example` and set proper values

2. **Email not sending**
   - Verify EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD
   - For Gmail, use app-specific password
   - Check email service logs

3. **Cookie not set**
   - Ensure cookie-parser middleware is installed and configured
   - Check CORS credentials setting
   - Verify frontend is sending credentials

4. **Rate limit exceeded**
   - Wait 15 minutes or adjust rate limits in `rateLimiter.ts`

## Future Enhancements

Potential additions to the auth system:

- [ ] OAuth integration (Google, GitHub)
- [ ] Two-factor authentication (2FA)
- [ ] Session management
- [ ] Account lockout after failed attempts
- [ ] Password strength indicator
- [ ] Remember me functionality
- [ ] Social login
- [ ] Magic link authentication
- [ ] Biometric authentication support
- [ ] Audit logs for security events

## Support

For issues or questions:
- Check the logs in `/logs` directory
- Review error messages in the response
- Consult the main README.md
- Check PLANNING.md for architecture decisions
