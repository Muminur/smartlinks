'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, BarChart3, Users, Globe2, Monitor, Link2, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getLinkById, getLinkAnalytics } from '@/lib/api/links';
import ClicksChart from '@/components/analytics/ClicksChart';
import DeviceStatsCharts from '@/components/analytics/DeviceStatsCharts';
import ReferrerTable from '@/components/analytics/ReferrerTable';
import { subDays } from 'date-fns';
import type { DateRange } from '@/types/analytics';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LinkAnalyticsPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const dateRange: DateRange = {
    start: subDays(new Date(), 30),
    end: new Date(),
    preset: 'last_30_days',
  };

  // Fetch link details
  const { data: link, isLoading: linkLoading } = useQuery({
    queryKey: ['link', id],
    queryFn: () => getLinkById(id),
    enabled: !!id,
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', id],
    queryFn: () => getLinkAnalytics(id),
    enabled: !!id,
  });

  const isLoading = linkLoading || analyticsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold">Link not found</h2>
        <p className="text-muted-foreground mt-2">The link you are looking for does not exist.</p>
        <Button onClick={() => router.push('/dashboard/links')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Links
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Link Analytics</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link2 className="h-4 w-4" />
            <span className="font-mono text-sm">{link.slug}</span>
            <a
              href={link.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Link Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">{link.title || 'Untitled Link'}</h3>
              <p className="text-sm text-muted-foreground truncate max-w-lg">
                {link.originalUrl}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Created: {new Date(link.createdAt).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalClicks || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.uniqueVisitors || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Country</CardTitle>
            <Globe2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.topCountries?.[0]?.country || 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Device</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {analytics?.topDevices?.[0]?.device || 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ClicksChart linkId={id} dateRange={dateRange} />
        <DeviceStatsCharts linkId={id} dateRange={dateRange} />
      </div>

      {/* Referrer Table */}
      <ReferrerTable linkId={id} dateRange={dateRange} />
    </div>
  );
}
