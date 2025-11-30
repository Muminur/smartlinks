'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, MapPin, Monitor, Globe, ExternalLink, Clock } from 'lucide-react';
import type { RealtimeClick } from '@/types/analytics';
import { formatDistanceToNow } from 'date-fns';
import { API_ENDPOINTS } from '@/lib/constants';
import api from '@/lib/axios';

interface RealtimePanelProps {
  linkId: string;
}

function ClickItem({ click }: { click: RealtimeClick }) {
  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case 'mobile':
        return '📱';
      case 'tablet':
        return '📱';
      case 'desktop':
        return '💻';
      default:
        return '🖥️';
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors animate-fade-in">
      {/* Device Icon */}
      <div className="text-2xl">{getDeviceIcon(click.device)}</div>

      {/* Click Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium">
            {click.city}, {click.country}
          </span>
          <span className="text-xs text-muted-foreground">
            {click.countryCode}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Monitor className="h-3 w-3" />
            {click.device}
          </div>
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {click.browser}
          </div>
          <span>•</span>
          <span>{click.os}</span>
        </div>

        {click.referrer && click.referrer !== 'Direct' && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
            <ExternalLink className="h-3 w-3" />
            <span className="truncate">{click.referrer}</span>
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-xs text-muted-foreground whitespace-nowrap">
        {formatDistanceToNow(new Date(click.timestamp), { addSuffix: true })}
      </div>
    </div>
  );
}

export default function RealtimePanel({ linkId }: RealtimePanelProps) {
  // Fetch recent analytics data using the timeline endpoint
  // Note: Real realtime WebSocket/SSE support would require backend implementation
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: {
      clicks: RealtimeClick[];
      activeUsers: number;
      clicksLast5Min: number;
      totalClicks?: number;
      timeline?: { period: string; clicks: number }[];
    };
  }>({
    queryKey: ['analytics-realtime', linkId],
    queryFn: async () => {
      // Use timeline endpoint with hourly data for recent activity
      const endpoint =
        linkId === 'all'
          ? API_ENDPOINTS.ANALYTICS.USER
          : API_ENDPOINTS.ANALYTICS.TIMELINE(linkId);

      const params = linkId === 'all' ? {} : { period: 'hour' };
      const response = await api.get(endpoint, { params });

      // Transform timeline data to realtime-like format
      const responseData = response.data.data;

      // Calculate clicks in last 5 minutes (approximation from hourly data)
      const recentClicks = responseData?.timeline?.slice(-1)?.[0]?.clicks || 0;

      return {
        success: true,
        data: {
          clicks: [], // Realtime clicks require WebSocket - not implemented yet
          activeUsers: 0, // Would require WebSocket tracking
          clicksLast5Min: Math.floor(recentClicks / 12), // Approximate from hourly
          totalClicks: responseData?.totalClicks || 0,
          timeline: responseData?.timeline || [],
        },
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds (less aggressive without WebSocket)
  });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-red-500">Failed to load realtime data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.data?.activeUsers || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Currently browsing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clicks (5 min)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.data?.clicksLast5Min || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Last 5 minutes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Clicks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.data?.clicks?.length || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Last 50 clicks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Live Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Live Click Feed</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : data?.data?.clicks && data.data.clicks.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {data.data.clicks.map((click) => (
                <ClickItem key={click.id} click={click} />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-2">
                Live click feed coming soon
              </p>
              <p className="text-xs text-muted-foreground">
                Real-time click tracking requires WebSocket support.
                <br />
                Check the timeline and summary analytics for recent activity.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
