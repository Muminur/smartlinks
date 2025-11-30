'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, MapPin, Monitor, Globe, ExternalLink, Clock, Wifi, WifiOff } from 'lucide-react';
import type { RealtimeClick } from '@/types/analytics';
import { formatDistanceToNow } from 'date-fns';
import { API_ENDPOINTS } from '@/lib/constants';
import api from '@/lib/axios';
import { useLinkAnalytics, useGlobalAnalytics } from '@/hooks/useWebSocket';
import type { RealtimeClickEvent } from '@/lib/websocket';

interface RealtimePanelProps {
  linkId: string;
}

/**
 * Convert WebSocket click event to RealtimeClick format
 */
function convertToRealtimeClick(event: RealtimeClickEvent): RealtimeClick {
  return {
    id: event.id,
    timestamp: event.timestamp,
    country: event.country,
    countryCode: event.countryCode,
    city: event.city,
    device: event.device,
    browser: event.browser,
    os: event.os,
    referrer: event.referrer,
  };
}

function ClickItem({ click, isNew = false }: { click: RealtimeClick; isNew?: boolean }) {
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
    <div className={`flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors ${isNew ? 'animate-pulse bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'animate-fade-in'}`}>
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
          <span>-</span>
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
  // Track which clicks are "new" for animation purposes
  const [newClickIds, setNewClickIds] = useState<Set<string>>(new Set());

  // Use appropriate WebSocket hook based on linkId
  const isGlobalView = linkId === 'all';

  // WebSocket hooks for real-time data
  const linkAnalytics = useLinkAnalytics(isGlobalView ? '' : linkId, {
    autoConnect: !isGlobalView,
    maxClickHistory: 50,
    onNewClick: (click) => {
      // Mark click as new for animation
      setNewClickIds((prev) => new Set([...prev, click.id]));
      // Remove "new" status after animation
      setTimeout(() => {
        setNewClickIds((prev) => {
          const updated = new Set(prev);
          updated.delete(click.id);
          return updated;
        });
      }, 3000);
    },
  });

  const globalAnalytics = useGlobalAnalytics({
    autoConnect: isGlobalView,
    maxClickHistory: 50,
    onNewClick: (click) => {
      setNewClickIds((prev) => new Set([...prev, click.id]));
      setTimeout(() => {
        setNewClickIds((prev) => {
          const updated = new Set(prev);
          updated.delete(click.id);
          return updated;
        });
      }, 3000);
    },
  });

  // Select the appropriate analytics based on view mode
  const wsAnalytics = isGlobalView ? globalAnalytics : linkAnalytics;

  // Convert WebSocket clicks to RealtimeClick format
  const realtimeClicks: RealtimeClick[] = wsAnalytics.recentClicks.map(convertToRealtimeClick);

  // Fetch historical analytics data as fallback
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
      const endpoint =
        linkId === 'all'
          ? API_ENDPOINTS.ANALYTICS.USER
          : API_ENDPOINTS.ANALYTICS.TIMELINE(linkId);

      const params = linkId === 'all' ? {} : { period: 'hour' };
      const response = await api.get(endpoint, { params });
      const responseData = response.data.data;
      const recentClicks = responseData?.timeline?.slice(-1)?.[0]?.clicks || 0;

      return {
        success: true,
        data: {
          clicks: [],
          activeUsers: 0,
          clicksLast5Min: Math.floor(recentClicks / 12),
          totalClicks: responseData?.totalClicks || 0,
          timeline: responseData?.timeline || [],
        },
      };
    },
    refetchInterval: 60000, // Refresh every 60 seconds (WebSocket handles real-time)
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

  // Combine WebSocket clicks with session click count
  const activeUsers = wsAnalytics.isConnected ? 1 : 0; // At minimum, this user is active
  const clicksLast5Min = wsAnalytics.clickCount + (data?.data?.clicksLast5Min || 0);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-end gap-2">
        {wsAnalytics.isConnected ? (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
            <Wifi className="h-3 w-3" />
            Connected
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-200">
            <WifiOff className="h-3 w-3" />
            Connecting...
          </Badge>
        )}
      </div>

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
                {activeUsers}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Currently viewing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Clicks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {wsAnalytics.clickCount}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Since you connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Live Feed</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {realtimeClicks.length}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Clicks in feed
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
            <Badge
              variant="outline"
              className={`gap-1 ${wsAnalytics.isConnected ? 'text-green-600 border-green-200' : 'text-yellow-600 border-yellow-200'}`}
            >
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${wsAnalytics.isConnected ? 'bg-green-400' : 'bg-yellow-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${wsAnalytics.isConnected ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              </span>
              {wsAnalytics.isConnected ? 'Live' : 'Connecting'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && realtimeClicks.length === 0 ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : realtimeClicks.length > 0 ? (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {realtimeClicks.map((click) => (
                <ClickItem
                  key={click.id}
                  click={click}
                  isNew={newClickIds.has(click.id)}
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-2">
                {wsAnalytics.isConnected
                  ? 'Waiting for clicks...'
                  : 'Connecting to live feed...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {wsAnalytics.isConnected
                  ? 'New clicks will appear here in real-time as they happen.'
                  : 'Establishing WebSocket connection for real-time updates.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
