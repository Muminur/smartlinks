'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from '@/lib/validations/auth';
import { authApi } from '@/lib/api/auth';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await authApi.resetPassword({
        token,
        password: data.password,
      });

      if (response.success) {
        setSuccess(true);
        // Redirect to login page after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(
          response.error?.message ||
            'Failed to reset password. Please try again.'
        );
      }
    } catch (err: unknown) {
      console.error('Reset password error:', err);
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(
        error.response?.data?.error?.message ||
          'An error occurred. The reset link may have expired.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="bg-white rounded-lg shadow-xl p-8">
        <Alert variant="error">
          <div>
            <h3 className="font-semibold mb-2">Invalid Reset Link</h3>
            <p className="text-sm mb-4">
              The password reset link is invalid or missing. Please request a new
              one.
            </p>
            <Link href="/forgot-password">
              <Button variant="default" size="default">
                Request New Link
              </Button>
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
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
            Password reset successful!
          </h2>
          <p className="text-gray-600 mb-6">
            Your password has been reset successfully. You can now log in with
            your new password.
          </p>
          <Alert variant="success" className="mb-6">
            Redirecting to login page in 3 seconds...
          </Alert>
          <Link href="/login">
            <Button variant="default" size="lg">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Reset your password</h2>
        <p className="mt-2 text-gray-600">
          Enter your new password below. Make sure it&apos;s strong and secure.
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <PasswordInput
          {...register('password')}
          label="New password"
          placeholder="Create a strong password"
          error={errors.password?.message}
          showStrength={true}
          value={password}
        />

        <PasswordInput
          {...register('confirmPassword')}
          label="Confirm new password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword?.message}
        />

        <Button
          type="submit"
          variant="default"
          size="lg"
          className="w-full"
          isLoading={isLoading}
        >
          Reset password
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="bg-white rounded-lg shadow-xl p-8 flex items-center justify-center min-h-[400px]">
      <div className="text-gray-600">Loading...</div>
    </div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
