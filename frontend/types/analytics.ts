/**
 * Analytics Type Definitions
 */

export interface AnalyticsSummary {
  totalClicks: number;
  uniqueClicks: number;
  clickThroughRate: number;
  topCountry: string;
  topCountryClicks: number;
  mostActiveHour: number;
  avgSessionDuration: number;
  changePercentage: {
    totalClicks: number;
    uniqueClicks: number;
    clickThroughRate: number;
  };
}

export interface TimeSeriesData {
  timestamp: string;
  date: string;
  totalClicks: number;
  uniqueClicks: number;
}

export interface GeographicData {
  country: string;
  countryCode: string;
  clicks: number;
  percentage: number;
  city?: string;
}

export interface DeviceData {
  device: string;
  clicks: number;
  percentage: number;
  // Backend may return these alternative fields
  _id?: string;
  count?: number;
}

export interface BrowserData {
  browser: string;
  clicks: number;
  percentage: number;
  // Backend may return these alternative fields
  _id?: string;
  count?: number;
}

export interface OSData {
  os: string;
  clicks: number;
  percentage: number;
  // Backend may return these alternative fields
  _id?: string;
  count?: number;
}

export interface ReferrerData {
  referrer: string;
  domain: string;
  clicks: number;
  percentage: number;
  bounceRate?: number;
  avgTimeOnSite?: number;
  // Backend may return these alternative fields
  _id?: string;
  count?: number;
}

export interface HourlyData {
  hour: number;
  day: number;
  clicks: number;
}

export interface PerformanceMetrics {
  peakHour: number;
  peakHourClicks: number;
  engagementRate: number;
  avgRedirectLatency: number;
  successRate: number;
  errorRate: number;
}

export interface TopLink {
  id: string;
  slug: string;
  originalUrl: string;
  clicks: number;
  uniqueClicks: number;
  trend: number; // percentage change
  trendData: { date: string; clicks: number }[];
}

export interface RealtimeClick {
  id: string;
  timestamp: string;
  country: string;
  countryCode: string;
  city: string;
  device: string;
  browser: string;
  os: string;
  referrer: string;
}

export interface ComparisonData {
  link1: {
    id: string;
    slug: string;
    summary: AnalyticsSummary;
    timeSeries: TimeSeriesData[];
  };
  link2: {
    id: string;
    slug: string;
    summary: AnalyticsSummary;
    timeSeries: TimeSeriesData[];
  };
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
  includeCharts?: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
  preset?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'custom';
}

export type TimeGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

export interface AnalyticsFilters {
  linkId?: string;
  dateRange: DateRange;
  granularity: TimeGranularity;
}
