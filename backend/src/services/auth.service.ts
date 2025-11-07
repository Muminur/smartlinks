import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import User, { IUserDocument } from '../models/user.model';
import { emailService } from './email.service';
import { logger } from '../utils/logger';
import {
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../utils/errorHandler';

interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

class AuthService {
  /**
   * Generate JWT access token
   */
  private generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: '15m', // 15 minutes
    });
  }

  /**
   * Generate JWT refresh token
   */
  private generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: '7d', // 7 days
    });
  }

  /**
   * Generate both access and refresh tokens
   */
  private generateTokens(user: IUserDocument): AuthTokens {
    const payload: TokenPayload = {
      id: String(user._id),
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterData): Promise<{ user: IUserDocument; tokens: AuthTokens }> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Create new user
      const user = new User({
        email: userData.email,
        password: userData.password,
        name: userData.name,
      });

      // Generate email verification token
      const verificationToken = user.generateEmailVerificationToken();

      // Save user
      await user.save();

      // Send verification email
      try {
        await emailService.sendVerificationEmail(user, verificationToken);
      } catch (emailError) {
        logger.error('Failed to send verification email:', emailError);
        // Don't fail registration if email fails
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Store refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      logger.info(`New user registered: ${user.email}`);

      return { user, tokens };
    } catch (error) {
      logger.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<{ user: IUserDocument; tokens: AuthTokens }> {
    try {
      // Find user by email (include password field)
      const user = await User.findOne({ email: credentials.email }).select('+password');

      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check password
      const isPasswordValid = await user.comparePassword(credentials.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Store refresh token and update last login
      user.refreshToken = tokens.refreshToken;
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${user.email}`);

      return { user, tokens };
    } catch (error) {
      logger.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<IUserDocument> {
    try {
      // Find user with valid token
      const user = await User.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() },
      }).select('+emailVerificationToken +emailVerificationExpires');

      if (!user) {
        throw new ValidationError('Invalid or expired verification token');
      }

      // Mark email as verified
      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
        // Don't fail verification if email fails
      }

      logger.info(`Email verified for user: ${user.email}`);

      return user;
    } catch (error) {
      logger.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Initiate password reset process
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        // Don't reveal if user exists or not
        logger.warn(`Password reset requested for non-existent email: ${email}`);
        return;
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save();

      // Send reset email
      try {
        await emailService.sendPasswordResetEmail(user, resetToken);
        logger.info(`Password reset email sent to: ${user.email}`);
      } catch (emailError) {
        logger.error('Failed to send password reset email:', emailError);
        throw new Error('Failed to send password reset email');
      }
    } catch (error) {
      logger.error('Forgot password error:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<IUserDocument> {
    try {
      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+resetPasswordToken +resetPasswordExpires +password');

      if (!user) {
        throw new ValidationError('Invalid or expired password reset token');
      }

      // Update password
      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      user.refreshToken = undefined; // Invalidate all refresh tokens
      await user.save();

      // Send confirmation email
      try {
        await emailService.sendPasswordChangedEmail(user);
      } catch (emailError) {
        logger.error('Failed to send password changed email:', emailError);
        // Don't fail reset if email fails
      }

      logger.info(`Password reset successful for user: ${user.email}`);

      return user;
    } catch (error) {
      logger.error('Password reset error:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET) as TokenPayload;

      // Find user with matching refresh token
      const user = await User.findOne({
        _id: decoded.id,
        refreshToken: refreshToken,
      }).select('+refreshToken');

      if (!user) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = this.generateTokens(user);

      // Update refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      logger.info(`Token refreshed for user: ${user.email}`);

      return tokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid refresh token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      logger.error('Token refresh error:', error);
      throw error;
    }
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(userId: string): Promise<void> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Clear refresh token
      user.refreshToken = undefined;
      await user.save();

      logger.info(`User logged out: ${user.email}`);
    } catch (error) {
      logger.error('Logout error:', error);
      throw error;
    }
  }

  /**
   * Verify JWT access token
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.JWT_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedError('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token expired');
      }
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUserDocument> {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return user;
    } catch (error) {
      logger.error('Get user error:', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      if (user.emailVerified) {
        throw new ValidationError('Email is already verified');
      }

      // Generate new verification token
      const verificationToken = user.generateEmailVerificationToken();
      await user.save();

      // Send verification email
      try {
        await emailService.sendVerificationEmail(user, verificationToken);
        logger.info(`Verification email resent to: ${user.email}`);
      } catch (emailError) {
        logger.error('Failed to resend verification email:', emailError);
        throw new Error('Failed to send verification email');
      }
    } catch (error) {
      logger.error('Resend verification email error:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
