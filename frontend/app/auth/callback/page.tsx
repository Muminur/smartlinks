'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api/auth';
import { STORAGE_KEYS } from '@/lib/constants';

/**
 * OAuth Callback Content Component
 * Handles the OAuth callback after successful authentication with Google/GitHub
 */
function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, setToken } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract token from URL query parameters
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        // Handle error cases from OAuth provider
        if (error) {
          let message = 'Authentication failed. Please try again.';
          switch (error) {
            case 'oauth_denied':
              message = 'You denied the authentication request.';
              break;
            case 'oauth_failed':
              message = 'OAuth authentication failed. Please try again.';
              break;
            case 'no_code':
              message = 'No authorization code received. Please try again.';
              break;
            default:
              message = `Authentication error: ${error}`;
          }
          setErrorMessage(message);
          setStatus('error');

          // Redirect to login after showing error
          setTimeout(() => {
            router.push(`/login?error=${error}`);
          }, 2000);
          return;
        }

        // Check if token is present
        if (!token) {
          setErrorMessage('No authentication token received.');
          setStatus('error');
          setTimeout(() => {
            router.push('/login?error=no_token');
          }, 2000);
          return;
        }

        // Store the token in localStorage for the axios interceptor
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

        // Set token in Zustand store
        setToken(token);

        // Fetch current user using the token
        const response = await authApi.getCurrentUser();

        if (response.success && response.data?.user) {
          // Store user in Zustand store
          setUser(response.data.user);
          setStatus('success');

          // Redirect to dashboard
          setTimeout(() => {
            router.push('/dashboard');
          }, 500);
        } else {
          // Failed to get user, clear token and redirect to login
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
          setToken(null);
          setErrorMessage('Failed to retrieve user information.');
          setStatus('error');

          setTimeout(() => {
            router.push('/login?error=oauth_failed');
          }, 2000);
        }
      } catch (err: unknown) {
        console.error('OAuth callback error:', err);

        // Clear any stored token on error
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        setToken(null);

        const error = err as { message?: string };
        setErrorMessage(error.message || 'An unexpected error occurred.');
        setStatus('error');

        setTimeout(() => {
          router.push('/login?error=oauth_failed');
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams, router, setUser, setToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Completing Sign In
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we verify your credentials...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 mb-4">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Sign In Successful
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Redirecting to your dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Authentication Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {errorMessage}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * OAuth Callback Page
 * Wrapped in Suspense as required by Next.js 16 for useSearchParams
 */
export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Loading
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait...
              </p>
            </div>
          </div>
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
