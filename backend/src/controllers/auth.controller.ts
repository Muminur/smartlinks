import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Register a new user
 * POST /api/auth/register
 */
export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    const { user, tokens } = await authService.register({
      email,
      password,
      name,
    });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
      },
      message: 'Registration successful. Please check your email to verify your account.',
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Register controller error:', error);
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const { user, tokens } = await authService.login({ email, password });

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const response: ApiResponse = {
      success: true,
      data: {
        user,
        accessToken: tokens.accessToken,
      },
      message: 'Login successful',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Login controller error:', error);
    next(error);
  }
};

/**
 * Verify email address
 * GET /api/auth/verify-email/:token
 */
export const verifyEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;

    const user = await authService.verifyEmail(token);

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'Email verified successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Verify email controller error:', error);
    next(error);
  }
};

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
export const resendVerificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    await authService.resendVerificationEmail(email);

    const response: ApiResponse = {
      success: true,
      message: 'Verification email sent successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Resend verification controller error:', error);
    next(error);
  }
};

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
export const forgotPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    await authService.forgotPassword(email);

    const response: ApiResponse = {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Forgot password controller error:', error);
    next(error);
  }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;

    const user = await authService.resetPassword(token, password);

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'Password reset successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Reset password controller error:', error);
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NO_REFRESH_TOKEN',
          message: 'Refresh token not provided',
        },
      };
      res.status(401).json(response);
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);

    // Set new refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    const response: ApiResponse = {
      success: true,
      data: {
        accessToken: tokens.accessToken,
      },
      message: 'Token refreshed successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Refresh token controller error:', error);
    next(error);
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (userId) {
      await authService.logout(userId);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Logout controller error:', error);
    next(error);
  }
};

/**
 * Get current authenticated user
 * GET /api/auth/me
 */
export const currentUserController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    const user = await authService.getUserById(userId);

    const response: ApiResponse = {
      success: true,
      data: { user },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Current user controller error:', error);
    next(error);
  }
};

/**
 * Change password for authenticated user
 * PUT /api/auth/change-password
 */
export const changePasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
      };
      res.status(401).json(response);
      return;
    }

    // Import User model to get password
    const User = (await import('../models/user.model')).default;
    const userWithPassword = await User.findById(userId).select('+password');

    if (!userWithPassword) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      };
      res.status(404).json(response);
      return;
    }

    // Verify current password
    const isPasswordValid = await userWithPassword.comparePassword(currentPassword);
    if (!isPasswordValid) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect',
        },
      };
      res.status(401).json(response);
      return;
    }

    // Update password
    userWithPassword.password = newPassword;
    userWithPassword.refreshToken = undefined; // Invalidate all refresh tokens
    await userWithPassword.save();

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully',
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Change password controller error:', error);
    next(error);
  }
};
