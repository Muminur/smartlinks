'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';
import type { DateRange, HourlyData } from '@/types/analytics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HourlyHeatmapProps {
  linkId: string;
  dateRange: DateRange;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function HourlyHeatmap({ linkId, dateRange }: HourlyHeatmapProps) {
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: HourlyData[];
  }>({
    queryKey: ['analytics-hourly', linkId, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
      });

      // Use a custom endpoint for hourly heatmap data
      const endpoint =
        linkId === 'all'
          ? `/analytics/hourly?${params}`
          : `/analytics/${linkId}/hourly?${params}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch hourly data');
      return response.json();
    },
  });

  // Create a map for quick lookup
  const heatmapData: Map<string, number> = new Map();
  let maxClicks = 0;

  if (data?.data) {
    data.data.forEach((item) => {
      const key = `${item.day}-${item.hour}`;
      heatmapData.set(key, item.clicks);
      maxClicks = Math.max(maxClicks, item.clicks);
    });
  }

  const getColor = (clicks: number) => {
    if (clicks === 0) return 'bg-muted';

    const intensity = clicks / maxClicks;

    if (intensity < 0.2) return 'bg-blue-200 dark:bg-blue-900';
    if (intensity < 0.4) return 'bg-blue-300 dark:bg-blue-800';
    if (intensity < 0.6) return 'bg-blue-400 dark:bg-blue-700';
    if (intensity < 0.8) return 'bg-blue-500 dark:bg-blue-600';
    return 'bg-blue-600 dark:bg-blue-500';
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-red-500">Failed to load hourly heatmap</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Hourly Activity Heatmap</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex gap-1">
                  {/* Day labels */}
                  <div className="flex flex-col gap-1 pt-6">
                    {DAYS.map((day) => (
                      <div
                        key={day}
                        className="h-5 w-10 flex items-center justify-end pr-2 text-xs font-medium"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Heatmap grid */}
                  <div className="flex-1">
                    {/* Hour labels */}
                    <div className="flex gap-1 mb-1">
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="h-5 w-5 flex items-center justify-center text-[10px] font-medium"
                        >
                          {hour % 3 === 0 ? hour : ''}
                        </div>
                      ))}
                    </div>

                    {/* Cells */}
                    <TooltipProvider>
                      {DAYS.map((_, dayIndex) => (
                        <div key={dayIndex} className="flex gap-1 mb-1">
                          {HOURS.map((hour) => {
                            const key = `${dayIndex}-${hour}`;
                            const clicks = heatmapData.get(key) || 0;

                            return (
                              <Tooltip key={hour}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`h-5 w-5 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary ${getColor(clicks)}`}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    {DAYS[dayIndex]} {hour}:00
                                  </p>
                                  <p className="text-xs font-semibold">
                                    {clicks.toLocaleString()} clicks
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      ))}
                    </TooltipProvider>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4">
                  <span className="text-xs text-muted-foreground">Less</span>
                  <div className="flex gap-1">
                    <div className="h-3 w-3 rounded-sm bg-muted" />
                    <div className="h-3 w-3 rounded-sm bg-blue-200 dark:bg-blue-900" />
                    <div className="h-3 w-3 rounded-sm bg-blue-300 dark:bg-blue-800" />
                    <div className="h-3 w-3 rounded-sm bg-blue-400 dark:bg-blue-700" />
                    <div className="h-3 w-3 rounded-sm bg-blue-500 dark:bg-blue-600" />
                    <div className="h-3 w-3 rounded-sm bg-blue-600 dark:bg-blue-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">More</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
