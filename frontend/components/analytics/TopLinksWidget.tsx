'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Link2, ExternalLink } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { API_ENDPOINTS } from '@/lib/constants';
import api from '@/lib/axios';
import type { DateRange, TopLink } from '@/types/analytics';
import { cn } from '@/lib/utils';

interface TopLinksWidgetProps {
  dateRange: DateRange;
}

export default function TopLinksWidget({ dateRange }: TopLinksWidgetProps) {
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: TopLink[];
  }>({
    queryKey: ['analytics-top-links', dateRange],
    queryFn: async () => {
      const params = {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        limit: '10',
      };

      const response = await api.get(API_ENDPOINTS.ANALYTICS.TRENDING, { params });
      return response.data;
    },
    refetchInterval: 60000,
  });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-red-500">Failed to load top links</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Top Performing Links</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <div className="space-y-3">
            {data.data.map((link, index) => (
              <div
                key={link.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
              >
                {/* Rank */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {index + 1}
                </div>

                {/* Link Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{link.slug}</span>
                    <a
                      href={link.originalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {link.originalUrl}
                  </p>
                </div>

                {/* Mini Chart */}
                {link.trendData && link.trendData.length > 0 && (
                  <div className="w-20 h-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={link.trendData}>
                        <Line
                          type="monotone"
                          dataKey="clicks"
                          stroke={link.trend >= 0 ? '#10b981' : '#ef4444'}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Stats */}
                <div className="text-right">
                  <div className="font-semibold">{link.clicks.toLocaleString()}</div>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-xs',
                      link.trend >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    )}
                  >
                    {link.trend >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(link.trend).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
