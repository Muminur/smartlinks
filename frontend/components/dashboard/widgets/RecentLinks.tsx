'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Copy,
  MoreVertical,
  Trash2,
  Edit,
  BarChart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface LinkItem {
  id: string;
  slug: string;
  originalUrl: string;
  clicks: number;
  createdAt: Date;
  isActive: boolean;
}

interface RecentLinksProps {
  links?: LinkItem[];
  loading?: boolean;
}

// Mock data for demonstration
const mockLinks: LinkItem[] = [
  {
    id: '1',
    slug: 'product-launch',
    originalUrl: 'https://example.com/our-new-product-launch-2024',
    clicks: 1234,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isActive: true,
  },
  {
    id: '2',
    slug: 'blog-post',
    originalUrl: 'https://blog.example.com/how-to-improve-marketing',
    clicks: 856,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
    isActive: true,
  },
  {
    id: '3',
    slug: 'promo-code',
    originalUrl: 'https://store.example.com/promotions/summer-sale',
    clicks: 2341,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    isActive: true,
  },
  {
    id: '4',
    slug: 'newsletter',
    originalUrl: 'https://example.com/newsletter/subscribe',
    clicks: 412,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    isActive: false,
  },
];

export function RecentLinks({ links = mockLinks, loading = false }: RecentLinksProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (slug: string, id: string) => {
    const shortUrl = `${window.location.origin}/${slug}`;
    await navigator.clipboard.writeText(shortUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Links</CardTitle>
        <Link href="/dashboard/links">
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="h-10 w-10 animate-pulse rounded bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ExternalLink className="mb-2 h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm font-medium">No links yet</p>
            <p className="text-xs text-muted-foreground">
              Create your first short link to get started
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {links.map((link, index) => (
              <motion.div
                key={link.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                {/* Icon */}
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ExternalLink className="h-5 w-5 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          /{link.slug}
                        </p>
                        {!link.isActive && (
                          <Badge variant="secondary" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {link.originalUrl}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleCopy(link.slug, link.id)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          {copiedId === link.id ? 'Copied!' : 'Copy Link'}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <BarChart className="mr-2 h-4 w-4" />
                          View Analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Link
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600 focus:bg-red-100 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Link
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BarChart className="h-3 w-3" />
                      {link.clicks.toLocaleString()} clicks
                    </span>
                    <span>
                      {formatDistanceToNow(link.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
