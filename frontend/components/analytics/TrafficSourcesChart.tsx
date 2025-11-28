'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Share2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { API_ENDPOINTS, CHART_COLORS_ARRAY } from '@/lib/constants';
import type { DateRange, ReferrerData } from '@/types/analytics';

interface TrafficSourcesChartProps {
  linkId: string;
  dateRange: DateRange;
}

interface TrafficSource {
  name: string;
  value: number;
  percentage: number;
  color: string;
  [key: string]: string | number;
}

export default function TrafficSourcesChart({ linkId, dateRange }: TrafficSourcesChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: ReferrerData[];
  }>({
    queryKey: ['analytics-referrers', linkId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const endpoint =
        linkId === 'all'
          ? `/analytics/referrers?${params}`
          : API_ENDPOINTS.ANALYTICS.REFERRERS(linkId) + `?${params}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch referrer data');
      return response.json();
    },
  });

  // Categorize traffic sources
  const categorizeSource = (referrer: string): string => {
    if (!referrer || referrer === 'Direct' || referrer === 'direct') return 'Direct';

    const domain = referrer.toLowerCase();

    // Social media
    if (
      domain.includes('facebook') ||
      domain.includes('twitter') ||
      domain.includes('instagram') ||
      domain.includes('linkedin') ||
      domain.includes('tiktok') ||
      domain.includes('youtube')
    ) {
      return 'Social';
    }

    // Search engines
    if (
      domain.includes('google') ||
      domain.includes('bing') ||
      domain.includes('yahoo') ||
      domain.includes('duckduckgo')
    ) {
      return 'Search';
    }

    // Email
    if (domain.includes('mail') || domain.includes('email')) {
      return 'Email';
    }

    return 'Other';
  };

  const trafficSources: TrafficSource[] = [];

  if (data?.data) {
    const categories = new Map<string, number>();

    data.data.forEach((referrer) => {
      const category = categorizeSource(referrer.referrer);
      const current = categories.get(category) || 0;
      categories.set(category, current + referrer.clicks);
    });

    const total = Array.from(categories.values()).reduce((sum, val) => sum + val, 0);

    let colorIndex = 0;
    categories.forEach((clicks, category) => {
      trafficSources.push({
        name: category,
        value: clicks,
        percentage: (clicks / total) * 100,
        color: CHART_COLORS_ARRAY[colorIndex % CHART_COLORS_ARRAY.length] || '#3b82f6',
      });
      colorIndex++;
    });

    // Sort by value
    trafficSources.sort((a, b) => b.value - a.value);
  }

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-red-500">Failed to load traffic sources</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Traffic Sources</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Skeleton className="h-full w-full" />
          </div>
        ) : trafficSources.length > 0 ? (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={trafficSources}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props) => {
                    const entry = trafficSources[props.index];
                    return entry ? `${entry.percentage.toFixed(1)}%` : '';
                  }}
                  outerRadius={100}
                  innerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                >
                  {trafficSources.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.6}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Clicks']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            {/* Detailed breakdown table */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Breakdown</h4>
              <div className="space-y-2">
                {trafficSources.map((source, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="font-medium">{source.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        {source.value.toLocaleString()} clicks
                      </span>
                      <span className="font-medium min-w-[60px] text-right">
                        {source.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">No traffic source data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
