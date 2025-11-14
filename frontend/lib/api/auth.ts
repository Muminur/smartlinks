import { api } from '@/lib/axios';
import type { ApiResponse, User } from '@/types';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

/**
 * Auth API service
 */
export const authApi = {
  /**
   * Login with email and password
   */
  async login(
    credentials: LoginRequest
  ): Promise<ApiResponse<LoginResponse>> {
    const response = await api.post<ApiResponse<LoginResponse>>(
      '/auth/login',
      credentials
    );
    return response.data;
  },

  /**
   * Register a new user
   */
  async register(
    userData: RegisterRequest
  ): Promise<ApiResponse<RegisterResponse>> {
    const response = await api.post<ApiResponse<RegisterResponse>>(
      '/auth/register',
      userData
    );
    return response.data;
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<ApiResponse<void>> {
    const response = await api.post<ApiResponse<void>>('/auth/logout');
    return response.data;
  },

  /**
   * Request password reset email
   */
  async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>(
      '/auth/forgot-password',
      data
    );
    return response.data;
  },

  /**
   * Reset password with token
   */
  async resetPassword(
    data: ResetPasswordRequest
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>(
      '/auth/reset-password',
      data
    );
    return response.data;
  },

  /**
   * Verify email with token
   */
  async verifyEmail(
    data: VerifyEmailRequest
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>(
      '/auth/verify-email',
      data
    );
    return response.data;
  },

  /**
   * Resend verification email
   */
  async resendVerification(): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>(
      '/auth/resend-verification'
    );
    return response.data;
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  /**
   * Change password
   */
  async changePassword(
    data: ChangePasswordRequest
  ): Promise<ApiResponse<{ message: string }>> {
    const response = await api.post<ApiResponse<{ message: string }>>(
      '/auth/change-password',
      data
    );
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    const response = await api.post<ApiResponse<RefreshTokenResponse>>(
      '/auth/refresh-token'
    );
    return response.data;
  },

  /**
   * OAuth login (Google, GitHub)
   */
  getOAuthUrl(provider: 'google' | 'github'): string {
    return `${api.defaults.baseURL}/auth/oauth/${provider}`;
  },
};
