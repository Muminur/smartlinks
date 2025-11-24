'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Download, Calendar, TrendingUp, Globe2, Monitor } from 'lucide-react';
import OverviewCards from '@/components/analytics/OverviewCards';
import ClicksChart from '@/components/analytics/ClicksChart';
import DeviceStatsCharts from '@/components/analytics/DeviceStatsCharts';
import ReferrerTable from '@/components/analytics/ReferrerTable';
import HourlyHeatmap from '@/components/analytics/HourlyHeatmap';
import ComparisonView from '@/components/analytics/ComparisonView';
import DateRangePicker from '@/components/analytics/DateRangePicker';
import ExportDialog from '@/components/analytics/ExportDialog';
import TopLinksWidget from '@/components/analytics/TopLinksWidget';
import RealtimePanel from '@/components/analytics/RealtimePanel';
import PerformanceMetrics from '@/components/analytics/PerformanceMetrics';
import TrafficSourcesChart from '@/components/analytics/TrafficSourcesChart';
import type { DateRange } from '@/types/analytics';
import { subDays } from 'date-fns';
import { getLinks } from '@/lib/api/links';

export default function AnalyticsPage() {
  const [selectedLink, setSelectedLink] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
    preset: 'last_30_days',
  });
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch user's links for selector
  const { data: links } = useQuery({
    queryKey: ['links'],
    queryFn: async () => {
      return await getLinks();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your link performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setExportDialogOpen(true)}
            title="Export analytics"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Link Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <Select value={selectedLink} onValueChange={setSelectedLink}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a link" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Links</SelectItem>
              {links?.data?.map((link: any) => (
                <SelectItem key={link._id} value={link._id}>
                  {link.slug} - {link.originalUrl.substring(0, 50)}...
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto text-sm text-muted-foreground">
            {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-6">
          <TabsTrigger value="overview" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="geographic" className="gap-2">
            <Globe2 className="h-4 w-4" />
            Geographic
          </TabsTrigger>
          <TabsTrigger value="devices" className="gap-2">
            <Monitor className="h-4 w-4" />
            Devices
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="realtime" className="gap-2">
            <Calendar className="h-4 w-4" />
            Real-time
          </TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <OverviewCards linkId={selectedLink} dateRange={dateRange} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <ClicksChart linkId={selectedLink} dateRange={dateRange} />
            </div>
            <div>
              <TopLinksWidget dateRange={dateRange} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <TrafficSourcesChart linkId={selectedLink} dateRange={dateRange} />
            <HourlyHeatmap linkId={selectedLink} dateRange={dateRange} />
          </div>

          <ReferrerTable linkId={selectedLink} dateRange={dateRange} />
        </TabsContent>

        {/* Geographic Tab */}
        <TabsContent value="geographic" className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Geographic Distribution</h3>
            <p className="text-muted-foreground">
              Map visualization will be added in future update
            </p>
          </Card>
        </TabsContent>

        {/* Devices Tab */}
        <TabsContent value="devices" className="space-y-6">
          <DeviceStatsCharts linkId={selectedLink} dateRange={dateRange} />
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetrics linkId={selectedLink} dateRange={dateRange} />
        </TabsContent>

        {/* Real-time Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <RealtimePanel linkId={selectedLink} />
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-6">
          <ComparisonView dateRange={dateRange} />
        </TabsContent>
      </Tabs>

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        linkId={selectedLink}
        dateRange={dateRange}
      />
    </div>
  );
}
