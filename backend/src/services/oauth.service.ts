import axios from 'axios';
import jwt from 'jsonwebtoken';
import User, { IUserDocument } from '../models/user.model';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { UnauthorizedError } from '../utils/errorHandler';

interface OAuthProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'github';
}

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserInfo {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
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

class OAuthService {
  /**
   * OAuth credentials are read lazily via getters to ensure environment variables
   * are loaded (via dotenv) before they are accessed. This prevents issues where
   * the singleton is instantiated at module load time before dotenv.config() runs.
   */

  private get googleClientId(): string {
    return process.env.GOOGLE_CLIENT_ID || '';
  }

  private get googleClientSecret(): string {
    return process.env.GOOGLE_CLIENT_SECRET || '';
  }

  private get googleCallbackUrl(): string {
    return process.env.GOOGLE_CALLBACK_URL || `${config.FRONTEND_URL}/api/auth/google/callback`;
  }

  private get githubClientId(): string {
    return process.env.GITHUB_CLIENT_ID || '';
  }

  private get githubClientSecret(): string {
    return process.env.GITHUB_CLIENT_SECRET || '';
  }

  private get githubCallbackUrl(): string {
    return process.env.GITHUB_CALLBACK_URL || `${config.FRONTEND_URL}/api/auth/github/callback`;
  }

  /**
   * Generate JWT access token
   */
  private generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: '15m',
    });
  }

  /**
   * Generate JWT refresh token
   */
  private generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
      expiresIn: '7d',
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
   * Get Google OAuth URL for authorization
   */
  getGoogleAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: this.googleCallbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Get GitHub OAuth URL for authorization
   */
  getGitHubAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.githubClientId,
      redirect_uri: this.githubCallbackUrl,
      scope: 'user:email read:user',
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange Google authorization code for tokens and user info
   */
  async handleGoogleCallback(code: string): Promise<{ user: IUserDocument; tokens: AuthTokens }> {
    try {
      // Exchange code for tokens
      const tokenResponse = await axios.post<GoogleTokenResponse>(
        'https://oauth2.googleapis.com/token',
        {
          client_id: this.googleClientId,
          client_secret: this.googleClientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.googleCallbackUrl,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const { access_token } = tokenResponse.data;

      // Get user info
      const userResponse = await axios.get<GoogleUserInfo>(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const googleUser = userResponse.data;

      if (!googleUser.email || !googleUser.verified_email) {
        throw new UnauthorizedError('Google account email is not verified');
      }

      const profile: OAuthProfile = {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name || googleUser.email.split('@')[0],
        avatar: googleUser.picture,
        provider: 'google',
      };

      return this.findOrCreateUser(profile);
    } catch (error) {
      logger.error('Google OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * Exchange GitHub authorization code for tokens and user info
   */
  async handleGitHubCallback(code: string): Promise<{ user: IUserDocument; tokens: AuthTokens }> {
    try {
      // Exchange code for token
      const tokenResponse = await axios.post<GitHubTokenResponse>(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.githubClientId,
          client_secret: this.githubClientSecret,
          code,
          redirect_uri: this.githubCallbackUrl,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
        }
      );

      const { access_token } = tokenResponse.data;

      // Get user info
      const userResponse = await axios.get<GitHubUserInfo>(
        'https://api.github.com/user',
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const githubUser = userResponse.data;

      // Get user email if not provided
      let email = githubUser.email;
      if (!email) {
        const emailResponse = await axios.get<GitHubEmail[]>(
          'https://api.github.com/user/emails',
          {
            headers: { Authorization: `Bearer ${access_token}` },
          }
        );

        const primaryEmail = emailResponse.data.find(e => e.primary && e.verified);
        if (primaryEmail) {
          email = primaryEmail.email;
        }
      }

      if (!email) {
        throw new UnauthorizedError('GitHub account does not have a verified email');
      }

      const profile: OAuthProfile = {
        id: String(githubUser.id),
        email,
        name: githubUser.name || githubUser.login,
        avatar: githubUser.avatar_url,
        provider: 'github',
      };

      return this.findOrCreateUser(profile);
    } catch (error) {
      logger.error('GitHub OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * Find existing user or create new one from OAuth profile
   */
  private async findOrCreateUser(profile: OAuthProfile): Promise<{ user: IUserDocument; tokens: AuthTokens }> {
    try {
      // Check if user already exists by email
      let user = await User.findOne({ email: profile.email });

      if (user) {
        // Update avatar if not set
        if (!user.avatar && profile.avatar) {
          user.avatar = profile.avatar;
        }

        // Mark email as verified for OAuth users
        if (!user.emailVerified) {
          user.emailVerified = true;
        }

        user.lastLogin = new Date();
        await user.save();
      } else {
        // Create new user
        user = new User({
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
          password: this.generateRandomPassword(),
          emailVerified: true, // OAuth users are automatically verified
          lastLogin: new Date(),
        });

        await user.save();
        logger.info(`New OAuth user registered: ${user.email} via ${profile.provider}`);
      }

      // Generate tokens
      const tokens = this.generateTokens(user);

      // Store refresh token
      user.refreshToken = tokens.refreshToken;
      await user.save();

      logger.info(`User logged in via ${profile.provider}: ${user.email}`);

      return { user, tokens };
    } catch (error) {
      logger.error('Find or create OAuth user error:', error);
      throw error;
    }
  }

  /**
   * Generate a random password for OAuth users
   */
  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 32; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

export const oauthService = new OAuthService();
