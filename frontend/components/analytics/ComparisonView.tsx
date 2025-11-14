'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/Button';
import { ArrowLeftRight, Download } from 'lucide-react';
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
import type { DateRange, ComparisonData } from '@/types/analytics';
import { format } from 'date-fns';

interface ComparisonViewProps {
  dateRange: DateRange;
}

export default function ComparisonView({ dateRange }: ComparisonViewProps) {
  const [link1Id, setLink1Id] = useState<string>('');
  const [link2Id, setLink2Id] = useState<string>('');

  // Fetch user's links for selectors
  const { data: linksData } = useQuery({
    queryKey: ['links'],
    queryFn: async () => {
      const response = await fetch('/api/links');
      return response.json();
    },
  });

  // Fetch comparison data
  const { data: comparisonData, isLoading } = useQuery<{
    success: boolean;
    data: ComparisonData;
  }>({
    queryKey: ['analytics-comparison', link1Id, link2Id, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        link1: link1Id,
        link2: link2Id,
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      const response = await fetch(API_ENDPOINTS.ANALYTICS.COMPARE + `?${params}`);
      if (!response.ok) throw new Error('Failed to fetch comparison data');
      return response.json();
    },
    enabled: !!link1Id && !!link2Id,
  });

  const handleSwapLinks = () => {
    const temp = link1Id;
    setLink1Id(link2Id);
    setLink2Id(temp);
  };

  const links = linksData?.data || [];
  const comparison = comparisonData?.data;

  // Merge time series data for comparison chart
  const mergedTimeSeries = comparison
    ? comparison.link1.timeSeries.map((item1, index) => {
        const item2 = comparison.link2.timeSeries[index];
        return {
          timestamp: item1.timestamp,
          link1Clicks: item1.totalClicks,
          link2Clicks: item2?.totalClicks || 0,
        };
      })
    : [];

  return (
    <div className="space-y-6">
      {/* Link Selectors */}
      <Card>
        <CardHeader>
          <CardTitle>Compare Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Link 1</label>
              <Select value={link1Id} onValueChange={setLink1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first link" />
                </SelectTrigger>
                <SelectContent>
                  {links.map((link: any) => (
                    <SelectItem key={link._id} value={link._id} disabled={link._id === link2Id}>
                      {link.slug} - {link.originalUrl.substring(0, 40)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleSwapLinks}
              disabled={!link1Id || !link2Id}
              className="mt-7"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Link 2</label>
              <Select value={link2Id} onValueChange={setLink2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second link" />
                </SelectTrigger>
                <SelectContent>
                  {links.map((link: any) => (
                    <SelectItem key={link._id} value={link._id} disabled={link._id === link1Id}>
                      {link.slug} - {link.originalUrl.substring(0, 40)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!link1Id || !link2Id ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">
              Select two links to compare their performance
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : comparison ? (
        <>
          {/* Metrics Comparison Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Metrics Comparison</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Metric</th>
                      <th className="text-right p-3 font-medium">{comparison.link1.slug}</th>
                      <th className="text-right p-3 font-medium">{comparison.link2.slug}</th>
                      <th className="text-right p-3 font-medium">Difference</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3">Total Clicks</td>
                      <td className="text-right p-3 font-medium">
                        {comparison.link1.summary.totalClicks.toLocaleString()}
                      </td>
                      <td className="text-right p-3 font-medium">
                        {comparison.link2.summary.totalClicks.toLocaleString()}
                      </td>
                      <td className="text-right p-3">
                        <span
                          className={
                            comparison.link1.summary.totalClicks > comparison.link2.summary.totalClicks
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {comparison.link1.summary.totalClicks > comparison.link2.summary.totalClicks
                            ? '+'
                            : ''}
                          {(
                            comparison.link1.summary.totalClicks - comparison.link2.summary.totalClicks
                          ).toLocaleString()}
                        </span>
                      </td>
                    </tr>

                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3">Unique Visitors</td>
                      <td className="text-right p-3 font-medium">
                        {comparison.link1.summary.uniqueClicks.toLocaleString()}
                      </td>
                      <td className="text-right p-3 font-medium">
                        {comparison.link2.summary.uniqueClicks.toLocaleString()}
                      </td>
                      <td className="text-right p-3">
                        <span
                          className={
                            comparison.link1.summary.uniqueClicks > comparison.link2.summary.uniqueClicks
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {comparison.link1.summary.uniqueClicks > comparison.link2.summary.uniqueClicks
                            ? '+'
                            : ''}
                          {(
                            comparison.link1.summary.uniqueClicks - comparison.link2.summary.uniqueClicks
                          ).toLocaleString()}
                        </span>
                      </td>
                    </tr>

                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3">Click-Through Rate</td>
                      <td className="text-right p-3 font-medium">
                        {comparison.link1.summary.clickThroughRate.toFixed(2)}%
                      </td>
                      <td className="text-right p-3 font-medium">
                        {comparison.link2.summary.clickThroughRate.toFixed(2)}%
                      </td>
                      <td className="text-right p-3">
                        <span
                          className={
                            comparison.link1.summary.clickThroughRate >
                            comparison.link2.summary.clickThroughRate
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {comparison.link1.summary.clickThroughRate >
                          comparison.link2.summary.clickThroughRate
                            ? '+'
                            : ''}
                          {(
                            comparison.link1.summary.clickThroughRate -
                            comparison.link2.summary.clickThroughRate
                          ).toFixed(2)}
                          %
                        </span>
                      </td>
                    </tr>

                    <tr className="border-b hover:bg-muted/50">
                      <td className="p-3">Top Country</td>
                      <td className="text-right p-3 font-medium">
                        {comparison.link1.summary.topCountry}
                      </td>
                      <td className="text-right p-3 font-medium">
                        {comparison.link2.summary.topCountry}
                      </td>
                      <td className="text-right p-3 text-muted-foreground">-</td>
                    </tr>

                    <tr className="hover:bg-muted/50">
                      <td className="p-3">Avg Session Duration</td>
                      <td className="text-right p-3 font-medium">
                        {Math.round(comparison.link1.summary.avgSessionDuration)}s
                      </td>
                      <td className="text-right p-3 font-medium">
                        {Math.round(comparison.link2.summary.avgSessionDuration)}s
                      </td>
                      <td className="text-right p-3">
                        <span
                          className={
                            comparison.link1.summary.avgSessionDuration >
                            comparison.link2.summary.avgSessionDuration
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {comparison.link1.summary.avgSessionDuration >
                          comparison.link2.summary.avgSessionDuration
                            ? '+'
                            : ''}
                          {Math.round(
                            comparison.link1.summary.avgSessionDuration -
                              comparison.link2.summary.avgSessionDuration
                          )}
                          s
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Clicks Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Clicks Over Time Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={mergedTimeSeries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
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
                    dataKey="link1Clicks"
                    name={comparison.link1.slug}
                    stroke={CHART_COLORS.primary}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="link2Clicks"
                    name={comparison.link2.slug}
                    stroke={CHART_COLORS.success}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
