'use client';

import React from 'react';
import {
  Search,
  Filter,
  X,
  CalendarIcon,
  SortAsc,
  SortDesc,
  Tag,
} from 'lucide-react';
import { format } from 'date-fns';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { Button, Input } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui';
import { cn, debounce } from '@/lib/utils';
import type { LinkFilters } from '@/types';

interface FilterToolbarProps {
  filters: LinkFilters;
  onFiltersChange: (filters: Partial<LinkFilters>) => void;
  onClearFilters: () => void;
  availableTags?: string[];
  className?: string;
}

export function FilterToolbar({
  filters,
  onFiltersChange,
  onClearFilters,
  availableTags = [],
  className,
}: FilterToolbarProps) {
  const [searchValue, setSearchValue] = React.useState(filters.search || '');
  const [showFilters, setShowFilters] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<{
    from?: Date;
    to?: Date;
  }>({
    from: filters.startDate ? new Date(filters.startDate) : undefined,
    to: filters.endDate ? new Date(filters.endDate) : undefined,
  });

  // Debounced search handler
  const debouncedSearch = React.useMemo(
    () =>
      debounce((...args: unknown[]) => {
        const value = args[0];
        if (typeof value === 'string') {
          onFiltersChange({ search: value });
        }
      }, 500),
    [onFiltersChange]
  );

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) {
      setDateRange({});
      onFiltersChange({ startDate: undefined, endDate: undefined });
      return;
    }

    setDateRange(range);
    onFiltersChange({
      startDate: range.from?.toISOString(),
      endDate: range.to?.toISOString(),
    });
  };

  const handleToggleTag = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    onFiltersChange({ tags: newTags });
  };

  const handleClearAll = () => {
    setSearchValue('');
    setDateRange({});
    onClearFilters();
  };

  const hasActiveFilters =
    filters.search ||
    (filters.tags && filters.tags.length > 0) ||
    filters.startDate ||
    filters.endDate ||
    (filters.status && filters.status !== 'all');

  const activeFiltersCount =
    (filters.search ? 1 : 0) +
    (filters.tags?.length || 0) +
    (filters.startDate ? 1 : 0) +
    (filters.status && filters.status !== 'all' ? 1 : 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main search and filter controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search links by URL, title, or slug..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSearchChange('')}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filter toggle button */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge
              variant="destructive"
              className="ml-2 h-5 min-w-5 rounded-full px-1 text-xs"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <Select
            value={filters.sortBy || 'createdAt'}
            onValueChange={(value) => onFiltersChange({ sortBy: value as LinkFilters['sortBy'] })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">Created</SelectItem>
              <SelectItem value="updatedAt">Updated</SelectItem>
              <SelectItem value="clicks">Clicks</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              onFiltersChange({
                sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
              })
            }
            title={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
          >
            {filters.sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="rounded-lg border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Status filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => onFiltersChange({ status: value as LinkFilters['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Links</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date range filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !dateRange.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd, y')} -{' '}
                          {format(dateRange.to, 'LLL dd, y')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, y')
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DayPicker
                    mode="range"
                    selected={dateRange.from && dateRange.to ? dateRange as { from: Date; to: Date } : undefined}
                    onSelect={handleDateRangeSelect}
                    numberOfMonths={2}
                  />
                  {dateRange.from && (
                    <div className="border-t p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDateRangeSelect(undefined)}
                        className="w-full"
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            {/* Tags filter */}
            {availableTags.length > 0 && (
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium">Tags</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <Tag className="mr-2 h-4 w-4" />
                      {filters.tags && filters.tags.length > 0
                        ? `${filters.tags.length} selected`
                        : 'Select tags'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64" align="start">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Select Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <Badge
                            key={tag}
                            variant={
                              filters.tags?.includes(tag) ? 'default' : 'outline'
                            }
                            className="cursor-pointer"
                            onClick={() => handleToggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <X className="mr-2 h-4 w-4" />
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Active filters chips */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>

          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleSearchChange('')}
              />
            </Badge>
          )}

          {filters.status && filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ status: 'all' })}
              />
            </Badge>
          )}

          {filters.tags?.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleToggleTag(tag)}
              />
            </Badge>
          ))}

          {filters.startDate && (
            <Badge variant="secondary" className="gap-1">
              Date: {format(new Date(filters.startDate), 'MMM dd, yyyy')}
              {filters.endDate &&
                ` - ${format(new Date(filters.endDate), 'MMM dd, yyyy')}`}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleDateRangeSelect(undefined)}
              />
            </Badge>
          )}

          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
