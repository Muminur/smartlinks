'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth-store';

interface SessionExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionExpiredModal({
  isOpen,
  onClose,
}: SessionExpiredModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const [countdown, setCountdown] = useState(60);

  const handleLogout = React.useCallback(() => {
    logout();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    onClose();
    router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
  }, [logout, onClose, router, pathname]);

  useEffect(() => {
    if (!isOpen) return;

    // Use setTimeout to defer the countdown reset
    const resetTimer = setTimeout(() => setCountdown(60), 0);

    let currentCount = 60;
    const timer = setInterval(() => {
      currentCount -= 1;

      if (currentCount <= 0) {
        handleLogout();
      } else {
        setCountdown(currentCount);
      }
    }, 1000);

    return () => {
      clearTimeout(resetTimer);
      clearInterval(timer);
    };
  }, [isOpen, handleLogout]);

  const handleStayLoggedIn = () => {
    onClose();
    // In a real app, this would refresh the token
    router.refresh();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Your session is about to expire
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              For your security, you&apos;ll be automatically logged out in{' '}
              <span className="font-semibold text-blue-600">{countdown}</span>{' '}
              seconds due to inactivity.
            </p>

            {/* Countdown Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(countdown / 60) * 100}%` }}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleLogout}
                className="flex-1"
              >
                Log out
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={handleStayLoggedIn}
                className="flex-1"
              >
                Stay logged in
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Hook to manage session timeout
 */
export function useSessionTimeout(timeoutMinutes: number = 30) {
  const [showModal, setShowModal] = useState(false);
  const lastActivityRef = React.useRef(() => Date.now());

  useEffect(() => {
    // Track user activity
    const activities = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      lastActivityRef.current = () => Date.now();
      setShowModal(false);
    };

    activities.forEach(activity => {
      document.addEventListener(activity, handleActivity);
    });

    // Check for inactivity
    const checkInterval = setInterval(() => {
      const inactiveTime = Date.now() - lastActivityRef.current();
      const warningTime = (timeoutMinutes - 1) * 60 * 1000; // 1 minute before timeout

      if (inactiveTime >= warningTime) {
        setShowModal(true);
      }
    }, 10000); // Check every 10 seconds

    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, handleActivity);
      });
      clearInterval(checkInterval);
    };
  }, [timeoutMinutes]);

  return {
    showModal,
    setShowModal,
  };
}
