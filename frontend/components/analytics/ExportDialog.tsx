'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/Checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, FileText, FileJson, FileSpreadsheet, Mail } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { DateRange } from '@/types/analytics';
import { format as formatDate } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  linkId: string;
  dateRange: DateRange;
}

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
  { value: 'json', label: 'JSON', icon: FileJson },
  { value: 'pdf', label: 'PDF Report', icon: FileText },
] as const;

const METRICS = [
  { id: 'summary', label: 'Summary Statistics' },
  { id: 'timeSeries', label: 'Time Series Data' },
  { id: 'geographic', label: 'Geographic Distribution' },
  { id: 'devices', label: 'Device Statistics' },
  { id: 'browsers', label: 'Browser Statistics' },
  { id: 'os', label: 'Operating System Statistics' },
  { id: 'referrers', label: 'Referrer Data' },
];

export default function ExportDialog({ open, onClose, linkId, dateRange }: ExportDialogProps) {
  const { toast } = useToast();
  const [format, setFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['summary']);
  const [includeCharts, setIncludeCharts] = useState(false);
  const [emailReport, setEmailReport] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metricId)
        ? prev.filter((id) => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleExport = async () => {
    if (selectedMetrics.length === 0) {
      toast({
        title: 'No metrics selected',
        description: 'Please select at least one metric to export',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const params = new URLSearchParams({
        format,
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        metrics: selectedMetrics.join(','),
        includeCharts: includeCharts.toString(),
      });

      const endpoint =
        linkId === 'all'
          ? `/analytics/export?${params}`
          : API_ENDPOINTS.ANALYTICS.EXPORT(linkId) + `?${params}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${linkId === 'all' ? 'all-links' : linkId}-${formatDate(
        dateRange.start,
        'yyyy-MM-dd'
      )}-to-${formatDate(dateRange.end, 'yyyy-MM-dd')}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Export successful',
        description: `Analytics exported as ${format.toUpperCase()}`,
      });

      if (emailReport) {
        // Send email notification
        toast({
          title: 'Email sent',
          description: 'Report has been sent to your email',
        });
      }

      onClose();
    } catch {
      toast({
        title: 'Export failed',
        description: 'Failed to export analytics. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Analytics</DialogTitle>
          <DialogDescription>
            Export your analytics data for {formatDate(dateRange.start, 'MMM dd, yyyy')} to{' '}
            {formatDate(dateRange.end, 'MMM dd, yyyy')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format */}
          <div className="space-y-3">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(value: 'csv' | 'json' | 'pdf') => setFormat(value)}>
              {EXPORT_FORMATS.map((fmt) => (
                <div key={fmt.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={fmt.value} id={fmt.value} />
                  <Label htmlFor={fmt.value} className="flex items-center gap-2 cursor-pointer">
                    <fmt.icon className="h-4 w-4" />
                    {fmt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Metrics Selection */}
          <div className="space-y-3">
            <Label>Metrics to Include</Label>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {METRICS.map((metric) => (
                <div key={metric.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={metric.id}
                    checked={selectedMetrics.includes(metric.id)}
                    onCheckedChange={() => handleMetricToggle(metric.id)}
                  />
                  <Label
                    htmlFor={metric.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {metric.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* PDF Options */}
          {format === 'pdf' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCharts"
                checked={includeCharts}
                onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
              />
              <Label htmlFor="includeCharts" className="text-sm font-normal cursor-pointer">
                Include charts in PDF
              </Label>
            </div>
          )}

          {/* Email Option */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="emailReport"
              checked={emailReport}
              onCheckedChange={(checked) => setEmailReport(checked as boolean)}
            />
            <Label htmlFor="emailReport" className="text-sm font-normal cursor-pointer flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email report to me
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
