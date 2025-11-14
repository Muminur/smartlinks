'use client';

import React from 'react';
import { Trash2, Download, Tag, Power, PowerOff, X } from 'lucide-react';
import { Button } from '@/components/ui';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onExport: (format: 'csv' | 'json') => void;
  onDelete: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onAddTags: () => void;
  onClearSelection: () => void;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  onExport,
  onDelete,
  onActivate,
  onDeactivate,
  onAddTags,
  onClearSelection,
  className,
}: BulkActionsBarProps) {
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [exportFormat, setExportFormat] = React.useState<'csv' | 'json'>('csv');

  if (selectedCount === 0) return null;

  return (
    <>
      <div
        className={cn(
          'sticky top-0 z-10 flex items-center justify-between gap-4 rounded-lg border bg-muted/50 p-4 backdrop-blur-sm',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {selectedCount} {selectedCount === 1 ? 'link' : 'links'} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export */}
          <div className="flex items-center gap-1">
            <Select
              value={exportFormat}
              onValueChange={(value: 'csv' | 'json') => setExportFormat(value)}
            >
              <SelectTrigger className="h-9 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport(exportFormat)}
              className="h-9"
            >
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          {/* Add Tags */}
          <Button variant="outline" size="sm" onClick={onAddTags} className="h-9">
            <Tag className="mr-2 h-4 w-4" />
            Add Tags
          </Button>

          {/* Activate */}
          <Button
            variant="outline"
            size="sm"
            onClick={onActivate}
            className="h-9"
          >
            <Power className="mr-2 h-4 w-4" />
            Activate
          </Button>

          {/* Deactivate */}
          <Button
            variant="outline"
            size="sm"
            onClick={onDeactivate}
            className="h-9"
          >
            <PowerOff className="mr-2 h-4 w-4" />
            Deactivate
          </Button>

          {/* Delete */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="h-9"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount}{' '}
              {selectedCount === 1 ? 'link' : 'links'}. This action cannot be
              undone and all associated analytics data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete();
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedCount} {selectedCount === 1 ? 'link' : 'links'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
