'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { getTrendingLinks, type TrendingLink } from '@/lib/api/analytics';

interface PerformingLink {
  id: string;
  slug: string;
  originalUrl: string;
  clicks: number;
  conversionRate?: number;
}

interface TopPerformingLinksProps {
  links?: PerformingLink[];
  loading?: boolean;
}

export function TopPerformingLinks({ links: propLinks, loading: propLoading = false }: TopPerformingLinksProps) {
  // Fetch trending links from API if no links prop provided
  const {
    data: fetchedLinks,
    isLoading: isFetching,
    error,
  } = useQuery({
    queryKey: ['trending-links'],
    queryFn: () => getTrendingLinks('week', 5),
    enabled: !propLinks, // Only fetch if no links prop provided
    staleTime: 60000, // 1 minute
    retry: 2,
  });

  // Transform fetched trending links to PerformingLink format
  const transformedLinks: PerformingLink[] = fetchedLinks
    ? fetchedLinks.map((link: TrendingLink) => ({
        id: link.linkId,
        slug: link.slug || link.linkId,
        originalUrl: link.shortUrl || '',
        clicks: link.currentClicks,
        conversionRate: link.growthPercentage > 0 ? link.growthPercentage : undefined,
      }))
    : [];

  // Use prop links if provided, otherwise use transformed fetched links
  const links = propLinks || transformedLinks;
  const loading = propLoading || isFetching;

  // Calculate max clicks for progress bar
  const maxClicks = links.length > 0 ? Math.max(...links.map((link) => link.clicks), 1) : 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Performing Links
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-2 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium">Failed to load data</p>
            <p className="text-xs text-muted-foreground">
              Please try refreshing the page
            </p>
          </div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium">No data available</p>
            <p className="text-xs text-muted-foreground">
              Create some links to see performance
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {links.map((link, index) => {
              const percentage = (link.clicks / maxClicks) * 100;

              return (
                <motion.div
                  key={link.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="space-y-2"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <p className="text-sm font-medium truncate">/{link.slug}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1 ml-8">
                        {link.originalUrl}
                      </p>
                    </div>
                    <a
                      href={`/dashboard/analytics/${link.id}`}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>

                  {/* Progress Bar */}
                  <div className="ml-8">
                    <Progress value={percentage} className="h-2" />
                  </div>

                  {/* Stats */}
                  <div className="ml-8 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium">
                      {link.clicks.toLocaleString()} clicks
                    </span>
                    {link.conversionRate !== undefined && (
                      <span className="flex items-center gap-1">
                        <span
                          className={cn(
                            'font-medium',
                            link.conversionRate > 10
                              ? 'text-green-600 dark:text-green-400'
                              : link.conversionRate > 5
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-muted-foreground'
                          )}
                        >
                          +{link.conversionRate.toFixed(1)}%
                        </span>
                        growth
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
