import { Router } from 'express';
import {
  registerController,
  loginController,
  verifyEmailController,
  resendVerificationController,
  forgotPasswordController,
  resetPasswordController,
  refreshTokenController,
  logoutController,
  currentUserController,
  changePasswordController,
} from '../controllers/auth.controller';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailParamsSchema,
  resendVerificationSchema,
  changePasswordSchema,
} from '../middleware/auth.validation';
import {
  authenticateToken,
  extractUserId,
} from '../middleware/auth.middleware';
import { validateRequest, validateParams } from '../middleware/validateRequest';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  validateRequest(registerSchema),
  registerController
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  validateRequest(loginSchema),
  loginController
);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email address with token
 * @access  Public
 */
router.get(
  '/verify-email/:token',
  validateParams(verifyEmailParamsSchema),
  verifyEmailController
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post(
  '/resend-verification',
  authLimiter,
  validateRequest(resendVerificationSchema),
  resendVerificationController
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  authLimiter,
  validateRequest(forgotPasswordSchema),
  forgotPasswordController
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post(
  '/reset-password',
  authLimiter,
  validateRequest(resetPasswordSchema),
  resetPasswordController
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token using refresh token
 * @access  Public (requires refresh token)
 */
router.post(
  '/refresh-token',
  refreshTokenController
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 */
router.post(
  '/logout',
  extractUserId,
  logoutController
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get(
  '/me',
  authenticateToken,
  currentUserController
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Private
 */
router.put(
  '/change-password',
  authenticateToken,
  validateRequest(changePasswordSchema),
  changePasswordController
);

export default router;
