import { Request, Response, NextFunction } from 'express';
import { oauthService } from '../services/oauth.service';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config/env';

/**
 * Redirect to Google OAuth
 * GET /api/auth/google
 */
export const googleAuthController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUrl = oauthService.getGoogleAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Google auth controller error:', error);
    next(error);
  }
};

/**
 * Handle Google OAuth callback
 * GET /api/auth/google/callback
 */
export const googleCallbackController = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { code, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn('Google OAuth error:', oauthError);
      res.redirect(`${config.FRONTEND_URL}/login?error=oauth_denied`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect(`${config.FRONTEND_URL}/login?error=no_code`);
      return;
    }

    const { tokens } = await oauthService.handleGoogleCallback(code);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend with token
    res.redirect(`${config.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  } catch (error) {
    logger.error('Google callback controller error:', error);
    res.redirect(`${config.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

/**
 * Redirect to GitHub OAuth
 * GET /api/auth/github
 */
export const githubAuthController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authUrl = oauthService.getGitHubAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    logger.error('GitHub auth controller error:', error);
    next(error);
  }
};

/**
 * Handle GitHub OAuth callback
 * GET /api/auth/github/callback
 */
export const githubCallbackController = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { code, error: oauthError } = req.query;

    if (oauthError) {
      logger.warn('GitHub OAuth error:', oauthError);
      res.redirect(`${config.FRONTEND_URL}/login?error=oauth_denied`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.redirect(`${config.FRONTEND_URL}/login?error=no_code`);
      return;
    }

    const { tokens } = await oauthService.handleGitHubCallback(code);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend with token
    res.redirect(`${config.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}`);
  } catch (error) {
    logger.error('GitHub callback controller error:', error);
    res.redirect(`${config.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

/**
 * Get OAuth URLs for frontend
 * GET /api/auth/oauth/urls
 */
export const getOAuthUrlsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const response: ApiResponse = {
      success: true,
      data: {
        google: oauthService.getGoogleAuthUrl(),
        github: oauthService.getGitHubAuthUrl(),
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logger.error('Get OAuth URLs controller error:', error);
    next(error);
  }
};
