import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL, STORAGE_KEYS } from './constants';

/**
 * API Response Interface
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * API Error Interface
 */
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}

/**
 * Axios instance configured for API requests
 */
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 seconds
});

/**
 * Request interceptor to add auth token and handle requests
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Request]', {
        method: config.method?.toUpperCase(),
        url: config.url,
        data: config.data,
      });
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling and token refresh
 */
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Response]', {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (refreshToken) {
          const response = await axios.post(
            `${API_URL}/auth/refresh-token`,
            { refreshToken },
            { withCredentials: true }
          );

          const { accessToken } = response.data.data;
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, accessToken);

          // Retry original request with new token
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(STORAGE_KEYS.USER);
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      if (typeof window !== 'undefined') {
        // Redirect to unauthorized page or show error
        console.error('Access forbidden');
      }
    }

    // Handle 404 Not Found
    if (error.response?.status === 404) {
      console.error('Resource not found');
    }

    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded');
      // Extract retry-after header if available
      const retryAfter = error.response.headers['retry-after'];
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000; // Default to 60 seconds

      // Store rate limit info for UI feedback
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rate-limit', {
          detail: {
            endpoint: originalRequest.url,
            retryAfter: waitTime / 1000,
            message: `Rate limit exceeded. Please try again in ${Math.ceil(waitTime / 1000)} seconds.`
          }
        }));
      }
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error('Server error');
    }

    // Transform error to consistent format
    const apiError: ApiError = {
      message:
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'An unexpected error occurred',
      code: error.response?.data?.error?.code,
      status: error.response?.status,
    };

    return Promise.reject(apiError);
  }
);

/**
 * Helper function to handle API errors
 */
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error as AxiosError<ApiResponse>;
    return (
      apiError.response?.data?.error?.message ||
      apiError.response?.data?.message ||
      apiError.message ||
      'An unexpected error occurred'
    );
  }
  return 'An unexpected error occurred';
}

/**
 * Type-safe API request wrapper
 */
export async function apiRequest<T>(
  method: 'get' | 'post' | 'put' | 'delete' | 'patch',
  url: string,
  data?: unknown,
  config?: InternalAxiosRequestConfig
): Promise<T> {
  try {
    const response = await api.request<ApiResponse<T>>({
      method,
      url,
      data,
      ...config,
    });
    return response.data.data as T;
  } catch (error) {
    throw handleApiError(error);
  }
}

export default api;
