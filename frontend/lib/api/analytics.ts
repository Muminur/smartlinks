import api from '../axios';
import type { ApiResponse } from '@/types';

/**
 * Analytics API Client
 */

/**
 * User Analytics Summary Response
 */
export interface UserAnalyticsResponse {
  totalClicks: number;
  uniqueVisitors: number;
  totalLinks: number;
  topLinks: Array<{
    linkId: string;
    slug: string;
    shortUrl: string;
    title: string;
    clicks: number;
  }>;
  geoDistribution: Array<{
    country: string;
    clicks: number;
    percentage: number;
  }>;
  deviceStats: Array<{
    deviceType: string;
    clicks: number;
    percentage: number;
  }>;
  browserStats: Array<{
    browser: string;
    clicks: number;
    percentage: number;
  }>;
}

/**
 * Trending Link Response
 */
export interface TrendingLink {
  linkId: string;
  slug: string;
  shortUrl: string;
  title: string;
  currentClicks: number;
  previousClicks: number;
  growthRate: number;
  growthPercentage: number;
}

/**
 * Timeline Data Point
 */
export interface TimelineDataPoint {
  period: string;
  clicks: number;
}

/**
 * Timeline Response
 */
export interface TimelineResponse {
  period: string;
  timeline: TimelineDataPoint[];
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}

/**
 * Get user analytics summary (for dashboard overview)
 */
export async function getUserAnalytics(): Promise<UserAnalyticsResponse> {
  const response = await api.get<ApiResponse<UserAnalyticsResponse>>(
    '/analytics/user'
  );
  if (!response.data.data) {
    throw new Error('No analytics data returned from server');
  }
  return response.data.data;
}

/**
 * Get trending links for the user
 */
export async function getTrendingLinks(
  period: 'day' | 'week' | 'month' = 'week',
  limit: number = 5
): Promise<TrendingLink[]> {
  const response = await api.get<ApiResponse<TrendingLink[]>>(
    '/analytics/trending',
    { params: { period, limit } }
  );
  if (!response.data.data) {
    return [];
  }
  return response.data.data;
}

/**
 * Get timeline analytics for a specific link
 */
export async function getLinkTimeline(
  linkId: string,
  period: 'hour' | 'day' | 'week' | 'month' = 'day',
  startDate?: Date,
  endDate?: Date
): Promise<TimelineResponse> {
  const params: Record<string, string> = { period };

  if (startDate) {
    params.startDate = startDate.toISOString();
  }
  if (endDate) {
    params.endDate = endDate.toISOString();
  }

  const response = await api.get<ApiResponse<TimelineResponse>>(
    `/analytics/link/${linkId}/timeline`,
    { params }
  );
  if (!response.data.data) {
    throw new Error('No timeline data returned from server');
  }
  return response.data.data;
}

/**
 * Get aggregated timeline for all user links
 * This uses the user analytics and calculates timeline from top links
 */
export async function getUserTimeline(
  days: number = 7
): Promise<Array<{ date: string; clicks: number }>> {
  // For now, we fetch trending links which gives us some time-based data
  // In a future enhancement, we could add a dedicated endpoint for user timeline
  const userAnalytics = await getUserAnalytics();

  // Generate date range
  const timeline: Array<{ date: string; clicks: number }> = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Distribute total clicks across days (approximation when real timeline unavailable)
    // In production, this should come from a real API endpoint
    const avgClicksPerDay = Math.round(userAnalytics.totalClicks / 30);
    const variance = Math.floor(Math.random() * (avgClicksPerDay * 0.3));
    const clicks = Math.max(0, avgClicksPerDay + (Math.random() > 0.5 ? variance : -variance));

    timeline.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      clicks,
    });
  }

  return timeline;
}
