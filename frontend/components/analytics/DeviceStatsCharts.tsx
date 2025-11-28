'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Monitor, Smartphone, Globe } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { API_ENDPOINTS, CHART_COLORS_ARRAY } from '@/lib/constants';
import type { DateRange, DeviceData, BrowserData, OSData } from '@/types/analytics';

interface DeviceStatsChartsProps {
  linkId: string;
  dateRange: DateRange;
}

function DeviceChart({ data, isLoading }: { data?: DeviceData[]; isLoading: boolean }) {
  if (isLoading) {
    return <Skeleton className="h-[250px] w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center">
        <p className="text-muted-foreground">No device data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="device" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [
            `${value.toLocaleString()} (${data.find(d => d.clicks === value)?.percentage.toFixed(1)}%)`,
            'Clicks',
          ]}
        />
        <Bar dataKey="clicks" radius={[8, 8, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS_ARRAY[index % CHART_COLORS_ARRAY.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function BrowserChart({ data, isLoading }: { data?: BrowserData[]; isLoading: boolean }) {
  if (isLoading) {
    return <Skeleton className="h-[250px] w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center">
        <p className="text-muted-foreground">No browser data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="browser" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [
            `${value.toLocaleString()} (${data.find(d => d.clicks === value)?.percentage.toFixed(1)}%)`,
            'Clicks',
          ]}
        />
        <Bar dataKey="clicks" radius={[8, 8, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS_ARRAY[index % CHART_COLORS_ARRAY.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function OSChart({ data, isLoading }: { data?: OSData[]; isLoading: boolean }) {
  if (isLoading) {
    return <Skeleton className="h-[250px] w-full" />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center">
        <p className="text-muted-foreground">No OS data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="os" className="text-xs" />
        <YAxis className="text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          formatter={(value: number) => [
            `${value.toLocaleString()} (${data.find(d => d.clicks === value)?.percentage.toFixed(1)}%)`,
            'Clicks',
          ]}
        />
        <Bar dataKey="clicks" radius={[8, 8, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS_ARRAY[index % CHART_COLORS_ARRAY.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function DeviceStatsCharts({ linkId, dateRange }: DeviceStatsChartsProps) {
  const { data: deviceData, isLoading: deviceLoading } = useQuery<{
    success: boolean;
    data: DeviceData[];
  }>({
    queryKey: ['analytics-devices', linkId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const endpoint =
        linkId === 'all'
          ? `/analytics/devices?${params}`
          : API_ENDPOINTS.ANALYTICS.DEVICES(linkId) + `?${params}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch device data');
      return response.json();
    },
  });

  const { data: browserData, isLoading: browserLoading } = useQuery<{
    success: boolean;
    data: BrowserData[];
  }>({
    queryKey: ['analytics-browsers', linkId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const endpoint =
        linkId === 'all'
          ? `/analytics/browsers?${params}`
          : API_ENDPOINTS.ANALYTICS.BROWSERS(linkId) + `?${params}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch browser data');
      return response.json();
    },
  });

  const { data: osData, isLoading: osLoading } = useQuery<{
    success: boolean;
    data: OSData[];
  }>({
    queryKey: ['analytics-os', linkId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const endpoint =
        linkId === 'all'
          ? `/analytics/os?${params}`
          : API_ENDPOINTS.ANALYTICS.OS(linkId) + `?${params}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch OS data');
      return response.json();
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Device Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Device Types</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <DeviceChart data={deviceData?.data} isLoading={deviceLoading} />
        </CardContent>
      </Card>

      {/* Browsers */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Browsers</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <BrowserChart data={browserData?.data} isLoading={browserLoading} />
        </CardContent>
      </Card>

      {/* Operating Systems */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Operating Systems</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <OSChart data={osData?.data} isLoading={osLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
