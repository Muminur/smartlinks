'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { DateRange, ReferrerData } from '@/types/analytics';

interface ReferrerTableProps {
  linkId: string;
  dateRange: DateRange;
}

type SortField = 'referrer' | 'clicks' | 'percentage' | 'bounceRate';
type SortDirection = 'asc' | 'desc';

// Extract SortIcon component outside render to avoid recreation on every render
function SortIcon({ field, sortField, sortDirection }: { field: SortField; sortField: SortField; sortDirection: SortDirection }) {
  if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
  return sortDirection === 'asc' ? (
    <ArrowUp className="h-4 w-4" />
  ) : (
    <ArrowDown className="h-4 w-4" />
  );
}

export default function ReferrerTable({ linkId, dateRange }: ReferrerTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('clicks');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  const filteredAndSortedData = useMemo(() => {
    if (!data?.data) return [];

    let filtered = data.data;

    // Apply search filter
    if (search) {
      filtered = filtered.filter((item) =>
        item.referrer.toLowerCase().includes(search.toLowerCase()) ||
        item.domain.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === 'referrer' || sortField === 'percentage') {
        aValue = String(aValue);
        bValue = String(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [data?.data, search, sortField, sortDirection]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedData, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-red-500">Failed to load referrer data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Referrer Statistics</CardTitle>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search referrers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : paginatedData.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('referrer')}
                        className="h-8 gap-1"
                      >
                        Referrer
                        <SortIcon field="referrer" sortField={sortField} sortDirection={sortDirection} />
                      </Button>
                    </th>
                    <th className="text-right p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('clicks')}
                        className="h-8 gap-1"
                      >
                        Clicks
                        <SortIcon field="clicks" sortField={sortField} sortDirection={sortDirection} />
                      </Button>
                    </th>
                    <th className="text-right p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('percentage')}
                        className="h-8 gap-1"
                      >
                        Percentage
                        <SortIcon field="percentage" sortField={sortField} sortDirection={sortDirection} />
                      </Button>
                    </th>
                    <th className="text-right p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('bounceRate')}
                        className="h-8 gap-1"
                      >
                        Bounce Rate
                        <SortIcon field="bounceRate" sortField={sortField} sortDirection={sortDirection} />
                      </Button>
                    </th>
                    <th className="text-right p-3">Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((referrer, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{referrer.domain}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-md">
                            {referrer.referrer}
                          </span>
                        </div>
                      </td>
                      <td className="text-right p-3 font-medium">
                        {referrer.clicks.toLocaleString()}
                      </td>
                      <td className="text-right p-3">
                        {referrer.percentage.toFixed(1)}%
                      </td>
                      <td className="text-right p-3">
                        {referrer.bounceRate ? `${referrer.bounceRate.toFixed(1)}%` : 'N/A'}
                      </td>
                      <td className="text-right p-3">
                        {referrer.avgTimeOnSite ? `${Math.round(referrer.avgTimeOnSite)}s` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedData.length)} of{' '}
                  {filteredAndSortedData.length} results
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No referrer data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
