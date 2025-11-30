'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { API_ENDPOINTS, CHART_COLORS } from '@/lib/constants';
import api from '@/lib/axios';
import type { DateRange, TimeSeriesData, TimeGranularity } from '@/types/analytics';
import { format } from 'date-fns';

interface ClicksChartProps {
  linkId: string;
  dateRange: DateRange;
}

const GRANULARITY_OPTIONS: { value: TimeGranularity; label: string }[] = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function ClicksChart({ linkId, dateRange }: ClicksChartProps) {
  const [granularity, setGranularity] = useState<TimeGranularity>('daily');

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: TimeSeriesData[];
  }>({
    queryKey: ['analytics-timeseries', linkId, dateRange, granularity],
    queryFn: async () => {
      const params = {
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        period: granularity === 'hourly' ? 'hour' : granularity === 'daily' ? 'day' : granularity === 'weekly' ? 'week' : 'month',
      };

      const endpoint =
        linkId === 'all'
          ? API_ENDPOINTS.ANALYTICS.USER
          : API_ENDPOINTS.ANALYTICS.TIMELINE(linkId);

      const response = await api.get(endpoint, { params });
      return response.data;
    },
    refetchInterval: 60000,
  });

  const handleExportChart = async () => {
    if (typeof window === 'undefined') return;

    const html2canvas = (await import('html2canvas')).default;
    const chartElement = document.getElementById('clicks-chart');
    if (chartElement) {
      const canvas = await html2canvas(chartElement);
      const link = document.createElement('a');
      link.download = `clicks-chart-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const formatXAxis = (timestamp: string) => {
    const date = new Date(timestamp);
    switch (granularity) {
      case 'hourly':
        return format(date, 'HH:mm');
      case 'daily':
        return format(date, 'MMM dd');
      case 'weekly':
        return format(date, 'MMM dd');
      case 'monthly':
        return format(date, 'MMM yyyy');
      default:
        return format(date, 'MMM dd');
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-red-500">Failed to load chart data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="clicks-chart">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Clicks Over Time</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-md border p-1">
              {GRANULARITY_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={granularity === option.value ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setGranularity(option.value)}
                  className="h-7 px-3 text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportChart}
              disabled={isLoading || !data?.data}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : data?.data && data.data.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                className="text-xs"
              />
              <YAxis className="text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                labelFormatter={(value) => format(new Date(value), 'PPP')}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="totalClicks"
                name="Total Clicks"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="uniqueClicks"
                name="Unique Clicks"
                stroke={CHART_COLORS.success}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">No data available for selected period</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
