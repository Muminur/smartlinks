'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MousePointerClick,
  Users,
  TrendingUp,
  Globe,
  Clock,
  Timer
} from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { DateRange, AnalyticsSummary } from '@/types/analytics';
import { cn } from '@/lib/utils';

interface OverviewCardsProps {
  linkId: string;
  dateRange: DateRange;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
  isLoading?: boolean;
}

function MetricCard({ title, value, change, icon, description, isLoading }: MetricCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  const isPositive = change !== undefined && change >= 0;
  const hasChange = change !== undefined && change !== 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        <div className="flex items-center gap-2 mt-1">
          {hasChange && (
            <div
              className={cn(
                'flex items-center text-xs font-medium',
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              )}
            >
              <TrendingUp
                className={cn(
                  'h-3 w-3 mr-1',
                  !isPositive && 'rotate-180'
                )}
              />
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OverviewCards({ linkId, dateRange }: OverviewCardsProps) {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: AnalyticsSummary }>({
    queryKey: ['analytics-summary', linkId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const endpoint = linkId === 'all'
        ? `/analytics/summary?${params}`
        : API_ENDPOINTS.ANALYTICS.SUMMARY(linkId) + `?${params}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch analytics summary');
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-500">Failed to load analytics summary</p>
      </Card>
    );
  }

  const summary = data?.data;

  const metrics = [
    {
      title: 'Total Clicks',
      value: summary?.totalClicks || 0,
      change: summary?.changePercentage?.totalClicks,
      icon: <MousePointerClick className="h-4 w-4 text-muted-foreground" />,
      description: 'from last period',
    },
    {
      title: 'Unique Visitors',
      value: summary?.uniqueClicks || 0,
      change: summary?.changePercentage?.uniqueClicks,
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
      description: 'from last period',
    },
    {
      title: 'Click-Through Rate',
      value: summary?.clickThroughRate
        ? `${summary.clickThroughRate.toFixed(2)}%`
        : '0%',
      change: summary?.changePercentage?.clickThroughRate,
      icon: <TrendingUp className="h-4 w-4 text-muted-foreground" />,
      description: 'engagement rate',
    },
    {
      title: 'Top Country',
      value: summary?.topCountry || 'N/A',
      icon: <Globe className="h-4 w-4 text-muted-foreground" />,
      description: `${summary?.topCountryClicks || 0} clicks`,
    },
    {
      title: 'Peak Hour',
      value: summary?.mostActiveHour !== undefined
        ? `${summary.mostActiveHour}:00`
        : 'N/A',
      icon: <Clock className="h-4 w-4 text-muted-foreground" />,
      description: 'most active time',
    },
    {
      title: 'Avg Session',
      value: summary?.avgSessionDuration
        ? `${Math.round(summary.avgSessionDuration)}s`
        : '0s',
      icon: <Timer className="h-4 w-4 text-muted-foreground" />,
      description: 'per visitor',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric, index) => (
        <MetricCard
          key={index}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          icon={metric.icon}
          description={metric.description}
          isLoading={isLoading}
        />
      ))}
    </div>
  );
}
