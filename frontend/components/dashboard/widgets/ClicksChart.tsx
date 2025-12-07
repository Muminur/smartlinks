'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getUserTimeline } from '@/lib/api/analytics';

interface ChartData {
  date: string;
  clicks: number;
}

interface ClicksChartProps {
  data?: ChartData[];
  loading?: boolean;
  period?: '7d' | '30d' | '90d';
}

export function ClicksChart({ data: propData, loading: propLoading = false, period = '7d' }: ClicksChartProps) {
  // Determine number of days based on period
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  // Fetch timeline data from API if no data prop provided
  const {
    data: fetchedData,
    isLoading: isFetching,
    error,
  } = useQuery({
    queryKey: ['user-timeline', days],
    queryFn: () => getUserTimeline(days),
    enabled: !propData, // Only fetch if no data prop provided
    staleTime: 60000, // 1 minute
    retry: 2,
  });

  // Use prop data if provided, otherwise use fetched data
  // Memoize to avoid recreating the array on every render
  const chartData = useMemo(() => {
    return propData || fetchedData || [];
  }, [propData, fetchedData]);

  const loading = propLoading || isFetching;

  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { total: 0, average: 0, trend: 0, max: 0 };
    }

    const total = chartData.reduce((sum, item) => sum + item.clicks, 0);
    const average = Math.round(total / chartData.length);
    const max = Math.max(...chartData.map((item) => item.clicks));

    // Calculate trend (compare first half to second half)
    const midPoint = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, midPoint);
    const secondHalf = chartData.slice(midPoint);

    const firstAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, item) => sum + item.clicks, 0) / firstHalf.length
      : 0;
    const secondAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, item) => sum + item.clicks, 0) / secondHalf.length
      : 0;

    const trend = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    return { total, average, trend, max };
  }, [chartData]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Click Activity</CardTitle>
            <CardDescription>
              {period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}
            </CardDescription>
          </div>
          {!loading && chartData.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              {stats.trend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span
                className={cn(
                  'font-medium',
                  stats.trend >= 0 ? 'text-green-600' : 'text-red-600'
                )}
              >
                {stats.trend >= 0 ? '+' : ''}
                {stats.trend.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 animate-pulse rounded bg-muted" />
        ) : error ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-muted-foreground">Failed to load chart data</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center">
            <p className="text-sm font-medium">No click data available</p>
            <p className="text-xs text-muted-foreground">Start sharing your links to see analytics</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple Bar Chart */}
            <div className="flex h-64 items-end justify-between gap-1">
              {chartData.map((item, index) => {
                const heightPercentage = stats.max > 0 ? (item.clicks / stats.max) * 100 : 0;

                return (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercentage}%` }}
                    transition={{ delay: index * 0.05, duration: 0.5 }}
                    className="relative flex-1 group"
                  >
                    <div
                      className="w-full rounded-t-sm bg-primary/80 hover:bg-primary transition-colors cursor-pointer"
                      style={{ height: '100%' }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                        <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-lg border border-border whitespace-nowrap">
                          <p className="font-medium">{item.clicks.toLocaleString()} clicks</p>
                          <p className="text-muted-foreground">{item.date}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* X-axis labels (show only some dates to avoid clutter) */}
            <div className="flex justify-between text-xs text-muted-foreground">
              {chartData.map((item, index) => {
                const showLabel =
                  index === 0 ||
                  index === Math.floor(chartData.length / 2) ||
                  index === chartData.length - 1;

                return (
                  <div key={index} className="flex-1 text-center">
                    {showLabel ? item.date : ''}
                  </div>
                );
              })}
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Clicks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.average.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Avg per Day</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.max.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Peak Day</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
