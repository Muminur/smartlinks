'use client';

import { Link as LinkIcon, MousePointerClick, TrendingUp, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { StatsCard } from '@/components/dashboard/widgets/StatsCard';
import { RecentLinks } from '@/components/dashboard/widgets/RecentLinks';
import { ClicksChart } from '@/components/dashboard/widgets/ClicksChart';
import { TopPerformingLinks } from '@/components/dashboard/widgets/TopPerformingLinks';
import { useAuthStore } from '@/stores/auth-store';
import { getUserAnalytics } from '@/lib/api/analytics';

/**
 * Format large numbers for display (e.g., 24500 -> "24.5K")
 */
function formatNumber(num: number): string | number {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num;
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Fetch user analytics summary
  const {
    data: analytics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-analytics'],
    queryFn: getUserAnalytics,
    staleTime: 60000, // 1 minute
    retry: 2,
  });

  // Calculate click rate (unique visitors / total clicks) if data available
  const clickRate = analytics
    ? analytics.totalClicks > 0
      ? ((analytics.uniqueVisitors / analytics.totalClicks) * 100).toFixed(1)
      : '0.0'
    : '0.0';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening with your links today.
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load analytics data. Please try refreshing the page.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Links"
          value={isLoading ? '-' : (analytics?.totalLinks ?? 0)}
          changeLabel="all time"
          icon={LinkIcon}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-950"
          delay={0}
        />
        <StatsCard
          title="Total Clicks"
          value={isLoading ? '-' : formatNumber(analytics?.totalClicks ?? 0)}
          changeLabel="all time"
          icon={MousePointerClick}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-100 dark:bg-green-950"
          delay={0.1}
        />
        <StatsCard
          title="Unique Visitors"
          value={isLoading ? '-' : formatNumber(analytics?.uniqueVisitors ?? 0)}
          changeLabel="engagement rate"
          icon={TrendingUp}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-950"
          delay={0.2}
        />
        <StatsCard
          title="Click Rate"
          value={isLoading ? '-' : `${clickRate}%`}
          icon={Globe}
          iconColor="text-orange-600 dark:text-orange-400"
          iconBgColor="bg-orange-100 dark:bg-orange-950"
          delay={0.3}
        />
      </div>

      {/* Charts and Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ClicksChart period="7d" />
        <TopPerformingLinks />
      </div>

      {/* Recent Activity */}
      <RecentLinks />
    </div>
  );
}
