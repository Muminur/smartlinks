'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { authApi } from '@/lib/api/auth';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    'verifying'
  );
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Invalid verification link. No token provided.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await authApi.verifyEmail({ token });

        if (response.success) {
          setStatus('success');
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            router.push('/login?verified=true');
          }, 3000);
        } else {
          setStatus('error');
          setErrorMessage(
            response.error?.message || 'Email verification failed.'
          );
        }
      } catch (err: any) {
        console.error('Email verification error:', err);
        setStatus('error');
        setErrorMessage(
          err.response?.data?.error?.message ||
            'An error occurred during verification. The link may have expired.'
        );
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      const response = await authApi.resendVerification();

      if (response.success) {
        setResendSuccess(true);
      } else {
        alert(response.error?.message || 'Failed to resend verification email.');
      }
    } catch (err: any) {
      console.error('Resend verification error:', err);
      alert(
        err.response?.data?.error?.message ||
          'An error occurred. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <div className="text-center">
        {status === 'verifying' && (
          <div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <svg
                className="animate-spin h-8 w-8 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verifying your email
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <svg
                className="h-8 w-8 text-green-600"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Email verified successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your email has been verified. You can now log in to your account.
            </p>
            <Alert variant="success">
              Redirecting to login page in 3 seconds...
            </Alert>
            <div className="mt-6">
              <Link href="/login?verified=true">
                <Button variant="default" size="lg">
                  Go to Login
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg
                className="h-8 w-8 text-red-600"
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verification failed
            </h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>

            {resendSuccess && (
              <Alert variant="success" className="mb-6">
                A new verification email has been sent to your inbox.
              </Alert>
            )}

            <div className="space-y-3">
              <Button
                variant="default"
                size="lg"
                onClick={handleResendVerification}
                isLoading={isResending}
                className="w-full"
              >
                Resend verification email
              </Button>
              <Link href="/login">
                <Button variant="outline" size="lg" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="bg-white rounded-lg shadow-xl p-8 flex items-center justify-center min-h-[400px]">
      <div className="text-gray-600">Loading...</div>
    </div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
