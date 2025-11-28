'use client';

import React from 'react';
import {
  Copy,
  Check,
  MoreVertical,
  ExternalLink,
  Edit,
  Trash2,
  BarChart3,
  QrCode,
  Share2,
  Eye,
  EyeOff,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Lock,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox, Button, Badge } from '@/components/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { Skeleton } from '@/components/ui';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatNumber, formatRelativeTime, truncate, copyToClipboard } from '@/lib/utils';
import type { Link } from '@/types';
import { toast } from 'sonner';

interface LinksTableProps {
  links: Link[];
  isLoading?: boolean;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (link: Link) => void;
  onDelete: (link: Link) => void;
  onViewAnalytics: (link: Link) => void;
  onShowQR: (link: Link) => void;
  onShare: (link: Link) => void;
  baseUrl: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

export function LinksTable({
  links,
  isLoading,
  selectedIds,
  onSelectionChange,
  onEdit,
  onDelete,
  onViewAnalytics,
  onShowQR,
  onShare,
  baseUrl,
  sortBy,
  sortOrder,
  onSort,
}: LinksTableProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(links.map((link) => link._id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  const handleCopyUrl = async (link: Link) => {
    const url = `${baseUrl}/${link.slug}`;
    const success = await copyToClipboard(url);
    if (success) {
      setCopiedId(link._id);
      toast.success('Link copied!');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleSortClick = (field: string) => {
    if (onSort) {
      onSort(field);
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead>Short URL</TableHead>
              <TableHead>Original URL</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="rounded-lg border bg-card">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ExternalLink className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No links found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first shortened link to get started
          </p>
        </div>
      </div>
    );
  }

  const allSelected = links.length > 0 && selectedIds.length === links.length;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSortClick('slug')}
                className="flex items-center font-medium hover:underline"
              >
                Short URL
                {renderSortIcon('slug')}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSortClick('originalUrl')}
                className="flex items-center font-medium hover:underline"
              >
                Original URL
                {renderSortIcon('originalUrl')}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSortClick('clicks')}
                className="flex items-center font-medium hover:underline"
              >
                Clicks
                {renderSortIcon('clicks')}
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSortClick('createdAt')}
                className="flex items-center font-medium hover:underline"
              >
                Created
                {renderSortIcon('createdAt')}
              </button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {links.map((link) => (
            <TableRow
              key={link._id}
              className="group"
              data-state={selectedIds.includes(link._id) ? 'selected' : undefined}
            >
              {/* Checkbox */}
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(link._id)}
                  onCheckedChange={(checked) =>
                    handleSelectOne(link._id, checked as boolean)
                  }
                  aria-label={`Select ${link.slug}`}
                />
              </TableCell>

              {/* Short URL */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                          {truncate(link.slug, 20)}
                        </code>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{`${baseUrl}/${link.slug}`}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyUrl(link)}
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {copiedId === link._id ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  {link.isPasswordProtected && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
              </TableCell>

              {/* Original URL */}
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <a
                          href={link.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:underline max-w-md truncate"
                        >
                          {link.title || truncate(link.originalUrl, 50)}
                        </a>
                        <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-md">
                      <p className="break-all">{link.originalUrl}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {link.tags && link.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {link.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {link.tags.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{link.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </TableCell>

              {/* Clicks */}
              <TableCell>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatNumber(link.clicks)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>{formatNumber(link.uniqueClicks)} unique</span>
                  </div>
                </div>
              </TableCell>

              {/* Created Date */}
              <TableCell>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(link.createdAt)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{new Date(link.createdAt).toLocaleString()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>

              {/* Status */}
              <TableCell>
                <div className="flex flex-col gap-1">
                  <Badge variant={link.isActive ? 'default' : 'secondary'}>
                    {link.isActive ? (
                      <>
                        <Eye className="mr-1 h-3 w-3" />
                        Active
                      </>
                    ) : (
                      <>
                        <EyeOff className="mr-1 h-3 w-3" />
                        Inactive
                      </>
                    )}
                  </Badge>
                  {link.expiresAt && new Date(link.expiresAt) < new Date() && (
                    <Badge variant="destructive" className="text-xs">
                      Expired
                    </Badge>
                  )}
                  {link.maxClicks && link.clicks >= link.maxClicks && (
                    <Badge variant="destructive" className="text-xs">
                      Max clicks
                    </Badge>
                  )}
                </div>
              </TableCell>

              {/* Actions */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      aria-label="Open menu"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCopyUrl(link)}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewAnalytics(link)}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onShowQR(link)}>
                      <QrCode className="mr-2 h-4 w-4" />
                      QR Code
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onShare(link)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit(link)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(link)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
