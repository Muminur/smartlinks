'use client';

import { Link as LinkIcon, MousePointerClick, TrendingUp, Globe } from 'lucide-react';
import { StatsCard } from '@/components/dashboard/widgets/StatsCard';
import { RecentLinks } from '@/components/dashboard/widgets/RecentLinks';
import { ClicksChart } from '@/components/dashboard/widgets/ClicksChart';
import { TopPerformingLinks } from '@/components/dashboard/widgets/TopPerformingLinks';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's what's happening with your links today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Links"
          value={156}
          change={12}
          changeLabel="from last month"
          icon={LinkIcon}
          iconColor="text-blue-600 dark:text-blue-400"
          iconBgColor="bg-blue-100 dark:bg-blue-950"
          delay={0}
        />
        <StatsCard
          title="Total Clicks"
          value="24.5K"
          change={18}
          changeLabel="from last month"
          icon={MousePointerClick}
          iconColor="text-green-600 dark:text-green-400"
          iconBgColor="bg-green-100 dark:bg-green-950"
          delay={0.1}
        />
        <StatsCard
          title="Click Rate"
          value="67.8%"
          change={-3}
          changeLabel="from last month"
          icon={TrendingUp}
          iconColor="text-purple-600 dark:text-purple-400"
          iconBgColor="bg-purple-100 dark:bg-purple-950"
          delay={0.2}
        />
        <StatsCard
          title="Custom Domains"
          value={3}
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
