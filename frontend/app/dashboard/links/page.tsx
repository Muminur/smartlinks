'use client';

import React from 'react';
import { Plus, Upload, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { LinksTable } from '@/components/links/LinksTable';
import { FilterToolbar } from '@/components/links/FilterToolbar';
import { BulkActionsBar } from '@/components/links/BulkActionsBar';
import { Pagination } from '@/components/links/Pagination';
import { CreateLinkModal } from '@/components/links/CreateLinkModal';
import { EditLinkModal } from '@/components/links/EditLinkModal';
import { QRCodeGenerator } from '@/components/links/QRCodeGenerator';
import { ShareLinkDialog } from '@/components/links/ShareLinkDialog';
import { ImportExportDialog } from '@/components/links/ImportExportDialog';
import {
  useLinks,
  useTags,
  useBulkDeleteLinks,
  useExportLinks,
  useBulkAddTags,
  useToggleLinkStatus,
} from '@/hooks/useLinks';
import type { Link, LinkFilters } from '@/types';
import { useLinkStore } from '@/stores/link-store';
import { toast } from 'sonner';

const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://short.link';

export default function LinksPage() {
  // State
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [qrCodeModalOpen, setQRCodeModalOpen] = React.useState(false);
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [importExportModalOpen, setImportExportModalOpen] = React.useState(false);
  const [selectedLink, setSelectedLink] = React.useState<Link | null>(null);

  // Store
  const { filters, page, limit, setFilters, setPage, setLimit, resetFilters } = useLinkStore();

  // Queries
  const { data, isLoading, error, refetch } = useLinks({ ...filters, page, limit });
  const { data: tags } = useTags();

  // Show error toast when links fail to load
  React.useEffect(() => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load links';
      toast.error(errorMessage);
    }
  }, [error]);

  // Mutations
  const bulkDeleteMutation = useBulkDeleteLinks();
  const exportMutation = useExportLinks();
  const bulkAddTagsMutation = useBulkAddTags();
  const toggleStatusMutation = useToggleLinkStatus();

  // Handlers
  const handleFiltersChange = (newFilters: Partial<LinkFilters>) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    resetFilters();
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setLimit(newSize);
    setPage(1);
  };

  const handleSort = (field: string) => {
    const newSortOrder =
      filters.sortBy === field && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    setFilters({ sortBy: field as LinkFilters['sortBy'], sortOrder: newSortOrder });
  };

  const handleEdit = (link: Link) => {
    setSelectedLink(link);
    setEditModalOpen(true);
  };

  const handleDelete = (link: Link) => {
    if (confirm(`Are you sure you want to delete the link "${link.slug}"?`)) {
      bulkDeleteMutation.mutate([link._id], {
        onSuccess: () => {
          setSelectedIds((prev) => prev.filter((id) => id !== link._id));
        },
      });
    }
  };

  const handleViewAnalytics = (link: Link) => {
    // Navigate to analytics page
    window.location.href = `/dashboard/analytics/${link._id}`;
  };

  const handleShowQR = (link: Link) => {
    setSelectedLink(link);
    setQRCodeModalOpen(true);
  };

  const handleShare = (link: Link) => {
    setSelectedLink(link);
    setShareModalOpen(true);
  };

  const handleBulkExport = (format: 'csv' | 'json') => {
    const selectedLinks = data?.data.filter((link) =>
      selectedIds.includes(link._id)
    );
    if (!selectedLinks || selectedLinks.length === 0) return;

    exportMutation.mutate({
      format,
      params: {
        fields: [
          'slug',
          'originalUrl',
          'title',
          'clicks',
          'uniqueClicks',
          'createdAt',
        ],
      },
    });
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(selectedIds, {
      onSuccess: () => {
        setSelectedIds([]);
      },
    });
  };

  const handleBulkActivate = () => {
    const promises = selectedIds.map((id) =>
      toggleStatusMutation.mutateAsync({ id, isActive: true })
    );

    Promise.all(promises).then(() => {
      toast.success(`Activated ${selectedIds.length} link(s)`);
      setSelectedIds([]);
    });
  };

  const handleBulkDeactivate = () => {
    const promises = selectedIds.map((id) =>
      toggleStatusMutation.mutateAsync({ id, isActive: false })
    );

    Promise.all(promises).then(() => {
      toast.success(`Deactivated ${selectedIds.length} link(s)`);
      setSelectedIds([]);
    });
  };

  const handleBulkAddTags = () => {
    const tagsInput = prompt('Enter tags (comma-separated):');
    if (!tagsInput) return;

    const newTags = tagsInput.split(',').map((tag) => tag.trim()).filter(Boolean);
    if (newTags.length === 0) return;

    bulkAddTagsMutation.mutate(
      { linkIds: selectedIds, tags: newTags },
      {
        onSuccess: () => {
          setSelectedIds([]);
        },
      }
    );
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Links refreshed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Links</h1>
          <p className="text-muted-foreground">
            Manage your shortened links and track their performance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setImportExportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import/Export
          </Button>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Link
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && !isLoading && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">Failed to load links</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'An unexpected error occurred'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {data && !error && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              Total Links
            </div>
            <div className="mt-2 text-3xl font-bold">{data.total}</div>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              Active Links
            </div>
            <div className="mt-2 text-3xl font-bold">
              {data.data.filter((l) => l.isActive).length}
            </div>
          </div>
          <div className="rounded-lg border bg-card p-6">
            <div className="text-sm font-medium text-muted-foreground">
              Total Clicks
            </div>
            <div className="mt-2 text-3xl font-bold">
              {data.data.reduce((sum, l) => sum + l.clicks, 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterToolbar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        availableTags={tags || []}
      />

      {/* Bulk Actions */}
      <BulkActionsBar
        selectedCount={selectedIds.length}
        onExport={handleBulkExport}
        onDelete={handleBulkDelete}
        onActivate={handleBulkActivate}
        onDeactivate={handleBulkDeactivate}
        onAddTags={handleBulkAddTags}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Table */}
      <LinksTable
        links={data?.data || []}
        isLoading={isLoading}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onViewAnalytics={handleViewAnalytics}
        onShowQR={handleShowQR}
        onShare={handleShare}
        baseUrl={BASE_URL}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={handleSort}
      />

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data.totalPages}
          pageSize={limit}
          totalItems={data.total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Modals */}
      <CreateLinkModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={() => {
          refetch();
        }}
      />

      {selectedLink && (
        <>
          <EditLinkModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            link={selectedLink}
            onDeleted={() => {
              setSelectedIds((prev) => prev.filter((id) => id !== selectedLink._id));
            }}
          />

          <QRCodeGenerator
            open={qrCodeModalOpen}
            onOpenChange={setQRCodeModalOpen}
            url={`${BASE_URL}/${selectedLink.slug}`}
            title={selectedLink.title || selectedLink.slug}
          />

          <ShareLinkDialog
            open={shareModalOpen}
            onOpenChange={setShareModalOpen}
            url={`${BASE_URL}/${selectedLink.slug}`}
            title={selectedLink.title || selectedLink.slug}
            onShowQRCode={() => {
              setShareModalOpen(false);
              setQRCodeModalOpen(true);
            }}
          />
        </>
      )}

      <ImportExportDialog
        open={importExportModalOpen}
        onOpenChange={setImportExportModalOpen}
      />
    </div>
  );
}
