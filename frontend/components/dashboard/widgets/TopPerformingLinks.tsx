'use client';

import { motion } from 'framer-motion';
import { TrendingUp, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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

// Mock data for demonstration
const mockLinks: PerformingLink[] = [
  {
    id: '1',
    slug: 'summer-sale',
    originalUrl: 'https://store.example.com/promotions/summer-sale',
    clicks: 5234,
    conversionRate: 12.5,
  },
  {
    id: '2',
    slug: 'new-product',
    originalUrl: 'https://example.com/products/new-release-2024',
    clicks: 4102,
    conversionRate: 8.3,
  },
  {
    id: '3',
    slug: 'blog-seo',
    originalUrl: 'https://blog.example.com/ultimate-guide-to-seo',
    clicks: 3845,
    conversionRate: 15.7,
  },
  {
    id: '4',
    slug: 'webinar',
    originalUrl: 'https://events.example.com/marketing-webinar',
    clicks: 2971,
    conversionRate: 22.1,
  },
  {
    id: '5',
    slug: 'newsletter',
    originalUrl: 'https://example.com/newsletter/subscribe',
    clicks: 2456,
    conversionRate: 6.4,
  },
];

export function TopPerformingLinks({ links = mockLinks, loading = false }: TopPerformingLinksProps) {
  // Calculate max clicks for progress bar
  const maxClicks = Math.max(...links.map((link) => link.clicks), 1);

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
                          {link.conversionRate}%
                        </span>
                        conversion
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
