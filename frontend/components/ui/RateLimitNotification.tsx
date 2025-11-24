'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { cn } from '@/lib/utils';

interface RateLimitEvent {
  endpoint: string;
  retryAfter: number;
  message: string;
}

export function RateLimitNotification() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitEvent | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const handleRateLimit = (event: Event) => {
      const customEvent = event as CustomEvent<RateLimitEvent>;
      setRateLimitInfo(customEvent.detail);
      setCountdown(customEvent.detail.retryAfter);
    };

    window.addEventListener('rate-limit', handleRateLimit);

    return () => {
      window.removeEventListener('rate-limit', handleRateLimit);
    };
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (countdown === 0 && rateLimitInfo) {
      // Auto-dismiss after countdown
      const dismissTimer = setTimeout(() => {
        setRateLimitInfo(null);
      }, 3000);

      return () => clearTimeout(dismissTimer);
    }
    // Return undefined for the case when neither condition is met
    return undefined;
  }, [countdown, rateLimitInfo]);

  if (!rateLimitInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-2">
      <Alert
        variant="error"
        title="Rate Limit Exceeded"
        onClose={() => setRateLimitInfo(null)}
      >
        <div className="space-y-2">
          <p>{rateLimitInfo.message}</p>
          {countdown > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3 w-3" />
              <span>Retry available in {countdown} seconds</span>
            </div>
          )}
          <p className="text-xs opacity-70">
            Endpoint: {rateLimitInfo.endpoint}
          </p>
        </div>
      </Alert>
    </div>
  );
}

export default RateLimitNotification;