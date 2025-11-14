'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Clock, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_ENDPOINTS, CHART_COLORS } from '@/lib/constants';
import type { DateRange, PerformanceMetrics as PerformanceMetricsType } from '@/types/analytics';

interface PerformanceMetricsProps {
  linkId: string;
  dateRange: DateRange;
}

export default function PerformanceMetrics({ linkId, dateRange }: PerformanceMetricsProps) {
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: PerformanceMetricsType;
  }>({
    queryKey: ['analytics-performance', linkId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const endpoint =
        linkId === 'all'
          ? `/analytics/performance?${params}`
          : API_ENDPOINTS.ANALYTICS.PERFORMANCE(linkId) + `?${params}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch performance metrics');
      return response.json();
    },
  });

  const metrics = data?.data;

  // Prepare data for peak hours chart
  const peakHoursData = metrics
    ? [
        { hour: `${metrics.peakHour}:00`, clicks: metrics.peakHourClicks, label: 'Peak Hour' },
      ]
    : [];

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-red-500">Failed to load performance metrics</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Redirect Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.avgRedirectLatency ? `${metrics.avgRedirectLatency.toFixed(0)}ms` : '0ms'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.avgRedirectLatency && metrics.avgRedirectLatency < 100
                    ? 'Excellent'
                    : metrics?.avgRedirectLatency && metrics.avgRedirectLatency < 200
                    ? 'Good'
                    : 'Needs improvement'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peak Hour</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.peakHour !== undefined ? `${metrics.peakHour}:00` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.peakHourClicks?.toLocaleString() || 0} clicks
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.engagementRate ? `${metrics.engagementRate.toFixed(1)}%` : '0%'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  User engagement
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {metrics?.successRate ? `${metrics.successRate.toFixed(1)}%` : '100%'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.errorRate ? `${metrics.errorRate.toFixed(1)}% errors` : 'No errors'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Peak Hours Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Peak Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : peakHoursData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="clicks" fill={CHART_COLORS.primary} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No peak hour data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Average Latency</p>
                      <p className="text-sm text-muted-foreground">Redirect speed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {metrics?.avgRedirectLatency?.toFixed(0) || 0}ms
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium">Engagement Rate</p>
                      <p className="text-sm text-muted-foreground">User interaction</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {metrics?.engagementRate?.toFixed(1) || 0}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-medium">Success Rate</p>
                      <p className="text-sm text-muted-foreground">Successful redirects</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {metrics?.successRate?.toFixed(1) || 100}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium">Error Rate</p>
                      <p className="text-sm text-muted-foreground">Failed redirects</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {metrics?.errorRate?.toFixed(1) || 0}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
