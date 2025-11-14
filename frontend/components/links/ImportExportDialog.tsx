'use client';

import React from 'react';
import {
  Download,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, Input, Label, Checkbox } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Alert } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { useImportLinks, useExportLinks } from '@/hooks/useLinks';
import { toast } from 'sonner';

interface ImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EXPORTABLE_FIELDS = [
  { value: 'slug', label: 'Short URL Slug' },
  { value: 'originalUrl', label: 'Original URL' },
  { value: 'title', label: 'Title' },
  { value: 'description', label: 'Description' },
  { value: 'clicks', label: 'Total Clicks' },
  { value: 'uniqueClicks', label: 'Unique Clicks' },
  { value: 'tags', label: 'Tags' },
  { value: 'isActive', label: 'Status' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Updated Date' },
];

export function ImportExportDialog({
  open,
  onOpenChange,
}: ImportExportDialogProps) {
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [exportFormat, setExportFormat] = React.useState<'csv' | 'json'>('csv');
  const [selectedFields, setSelectedFields] = React.useState<string[]>([
    'slug',
    'originalUrl',
    'title',
    'clicks',
    'createdAt',
  ]);

  const importMutation = useImportLinks();
  const exportMutation = useExportLinks();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    importMutation.mutate(selectedFile, {
      onSuccess: () => {
        setSelectedFile(null);
        onOpenChange(false);
      },
    });
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    exportMutation.mutate({
      format: exportFormat,
      params: { fields: selectedFields },
    });
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  const selectAllFields = () => {
    setSelectedFields(EXPORTABLE_FIELDS.map((f) => f.value));
  };

  const deselectAllFields = () => {
    setSelectedFields([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import / Export Links</DialogTitle>
          <DialogDescription>
            Import links from CSV or export your links to CSV/JSON format
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              {/* Format Selection */}
              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select
                  value={exportFormat}
                  onValueChange={(value: 'csv' | 'json') => setExportFormat(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Excel compatible)</SelectItem>
                    <SelectItem value="json">JSON (Raw data)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Field Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Fields to Export</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAllFields}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={deselectAllFields}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
                  {EXPORTABLE_FIELDS.map((field) => (
                    <div key={field.value} className="flex items-center gap-2">
                      <Checkbox
                        id={field.value}
                        checked={selectedFields.includes(field.value)}
                        onCheckedChange={() => toggleField(field.value)}
                      />
                      <label
                        htmlFor={field.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={exportMutation.isPending || selectedFields.length === 0}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                {exportMutation.isPending
                  ? 'Exporting...'
                  : `Export as ${exportFormat.toUpperCase()}`}
              </Button>
            </div>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <div className="space-y-4">
              {/* Instructions */}
              <Alert>
                <FileText className="h-4 w-4" />
                <div className="ml-2">
                  <h4 className="font-medium">CSV Format Requirements</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your CSV file must include an <code>originalUrl</code> column.
                    Optional columns: <code>customSlug</code>, <code>title</code>,{' '}
                    <code>description</code>, <code>tags</code> (comma-separated).
                  </p>
                </div>
              </Alert>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Select CSV File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={importMutation.isPending}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} (
                    {(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              {/* Import Results */}
              {importMutation.isSuccess && importMutation.data && (
                <Alert
                  variant={
                    importMutation.data.failed > 0 ? 'error' : 'success'
                  }
                >
                  {importMutation.data.failed > 0 ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <div className="ml-2">
                    <h4 className="font-medium">Import Complete</h4>
                    <p className="mt-1 text-sm">
                      Successfully imported {importMutation.data.imported} links
                      {importMutation.data.failed > 0 &&
                        `, ${importMutation.data.failed} failed`}
                    </p>
                    {importMutation.data.errors &&
                      importMutation.data.errors.length > 0 && (
                        <ul className="mt-2 space-y-1 text-sm">
                          {importMutation.data.errors.slice(0, 5).map((error) => (
                            <li key={error.row}>
                              Row {error.row}: {error.error}
                            </li>
                          ))}
                          {importMutation.data.errors.length > 5 && (
                            <li>
                              ... and {importMutation.data.errors.length - 5} more
                              errors
                            </li>
                          )}
                        </ul>
                      )}
                  </div>
                </Alert>
              )}

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={!selectedFile || importMutation.isPending}
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {importMutation.isPending ? 'Importing...' : 'Import Links'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
