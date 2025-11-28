'use client';

import React from 'react';
import { ExternalLink, Copy, Check, Eye, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Button } from '@/components/ui';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import type { Link } from '@/types';
import { toast } from 'sonner';

interface LinkPreviewProps {
  link: Link;
  shortUrl: string;
  onShare?: () => void;
  onShowQR?: () => void;
  onShowAnalytics?: () => void;
}

export function LinkPreview({
  link,
  shortUrl,
  onShare,
  onShowQR,
  onShowAnalytics,
}: LinkPreviewProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">
              {link.title || 'Untitled Link'}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <a
                href={link.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {link.originalUrl}
              </a>
              <ExternalLink className="h-3 w-3" />
            </CardDescription>
          </div>
          {link.isPasswordProtected && (
            <Badge variant="outline">Password Protected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Short URL */}
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <code className="flex-1 text-sm font-mono">{shortUrl}</code>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Total Clicks</div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {formatNumber(link.clicks)}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">Unique Clicks</div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {formatNumber(link.uniqueClicks)}
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {link.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Meta Info */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Created {formatRelativeTime(link.createdAt)}</span>
          <Badge variant={link.isActive ? 'default' : 'secondary'}>
            {link.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {onShowAnalytics && (
            <Button variant="outline" size="sm" onClick={onShowAnalytics}>
              View Analytics
            </Button>
          )}
          {onShowQR && (
            <Button variant="outline" size="sm" onClick={onShowQR}>
              QR Code
            </Button>
          )}
          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare}>
              Share
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
