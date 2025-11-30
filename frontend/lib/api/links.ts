import api from '../axios';
import type {
  Link,
  CreateLinkData,
  UpdateLinkData,
  LinkFilters,
  PaginatedResponse,
  ApiResponse,
} from '@/types';
import { debounceAsync } from '@/lib/utils/debounce';

/**
 * Links API Client
 */

/**
 * Get all links with pagination and filters
 */
export async function getLinks(
  params?: LinkFilters & { page?: number; limit?: number }
): Promise<PaginatedResponse<Link>> {
  const response = await api.get<ApiResponse<PaginatedResponse<Link>>>(
    '/links',
    { params }
  );
  return response.data.data!;
}

/**
 * Get a single link by ID
 */
export async function getLinkById(id: string): Promise<Link> {
  const response = await api.get<ApiResponse<{ link: Link }>>(`/links/${id}`);
  return response.data.data!.link;
}

/**
 * Get a single link by slug
 */
export async function getLinkBySlug(slug: string): Promise<Link> {
  const response = await api.get<ApiResponse<Link>>(`/links/slug/${slug}`);
  return response.data.data!;
}

/**
 * Create a new shortened link
 */
export async function createLink(data: CreateLinkData): Promise<Link> {
  const response = await api.post<ApiResponse<{ link: Link }>>(
    '/links/shorten',
    data
  );
  return response.data.data!.link;
}

/**
 * Update an existing link
 */
export async function updateLink(
  id: string,
  data: UpdateLinkData
): Promise<Link> {
  const response = await api.put<ApiResponse<{ link: Link }>>(`/links/${id}`, data);
  return response.data.data!.link;
}

/**
 * Delete a link
 */
export async function deleteLink(id: string): Promise<void> {
  await api.delete(`/links/${id}`);
}

/**
 * Bulk delete links
 */
export async function bulkDeleteLinks(linkIds: string[]): Promise<void> {
  await api.post('/links/bulk-delete', { linkIds });
}

/**
 * Toggle link active status
 */
export async function toggleLinkStatus(
  id: string,
  _isActive?: boolean
): Promise<Link> {
  const response = await api.patch<ApiResponse<{ link: Link }>>(
    `/links/${id}/toggle`
  );
  return response.data.data!.link;
}

/**
 * Check if a custom slug is available
 */
export async function checkSlugAvailability(
  slug: string
): Promise<{ available: boolean }> {
  const response = await api.get<ApiResponse<{ available: boolean }>>(
    `/links/check-slug/${slug}`
  );
  return response.data.data!;
}

/**
 * Debounced version of checkSlugAvailability to prevent rate limiting
 * Waits 500ms after the last call before making the API request
 */
export const checkSlugAvailabilityDebounced = debounceAsync(
  (slug: unknown) => {
    if (typeof slug !== 'string') {
      return Promise.reject(new Error('Invalid slug'));
    }
    return checkSlugAvailability(slug);
  },
  500
);

/**
 * Get link preview metadata
 */
export async function getLinkPreview(
  url: string
): Promise<{
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
}> {
  const response = await api.post<
    ApiResponse<{
      title?: string;
      description?: string;
      image?: string;
      favicon?: string;
    }>
  >('/links/preview', { url });
  return response.data.data!;
}

/**
 * Get QR code for a link
 */
export async function generateQRCode(
  linkId: string
): Promise<{ qrCode: string }> {
  const response = await api.get<ApiResponse<{ qrCode: string }>>(
    `/links/${linkId}/qr`,
    { params: { format: 'base64' } }
  );
  return response.data.data!;
}

/**
 * Get link analytics summary
 */
export async function getLinkAnalytics(linkId: string): Promise<{
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDate: { date: string; clicks: number }[];
  topCountries: { country: string; count: number }[];
  topDevices: { device: string; count: number }[];
  topBrowsers: { browser: string; count: number }[];
  topReferrers: { referrer: string; count: number }[];
}> {
  const response = await api.get<
    ApiResponse<{
      totalClicks: number;
      uniqueVisitors: number;
      clicksByDate: { date: string; clicks: number }[];
      topCountries: { country: string; count: number }[];
      topDevices: { device: string; count: number }[];
      topBrowsers: { browser: string; count: number }[];
      topReferrers: { referrer: string; count: number }[];
    }>
  >(`/analytics/link/${linkId}/summary`);
  return response.data.data!;
}

/**
 * Export links to CSV or JSON
 */
export async function exportLinks(
  format: 'csv' | 'json',
  params?: {
    fields?: string[];
    startDate?: string;
    endDate?: string;
  }
): Promise<Blob> {
  const response = await api.get('/links/export', {
    params: { format, ...params },
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Import links from CSV
 */
export async function importLinks(file: File): Promise<{
  imported: number;
  failed: number;
  errors?: Array<{ row: number; error: string }>;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<
    ApiResponse<{
      imported: number;
      failed: number;
      errors?: Array<{ row: number; error: string }>;
    }>
  >('/links/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data!;
}

/**
 * Add tags to multiple links
 */
export async function bulkAddTags(
  linkIds: string[],
  tags: string[]
): Promise<void> {
  await api.post('/links/bulk-tags', { linkIds, tags });
}

/**
 * Get all unique tags
 */
export async function getAllTags(): Promise<string[]> {
  const response = await api.get<ApiResponse<string[]>>('/links/tags');
  return response.data.data!;
}
