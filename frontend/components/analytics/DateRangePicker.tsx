'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from '@/types/analytics';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: 'Today', value: 'today' as const, getDates: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }) },
  { label: 'Yesterday', value: 'yesterday' as const, getDates: () => ({ start: startOfDay(subDays(new Date(), 1)), end: endOfDay(subDays(new Date(), 1)) }) },
  { label: 'Last 7 days', value: 'last_7_days' as const, getDates: () => ({ start: subDays(new Date(), 7), end: new Date() }) },
  { label: 'Last 30 days', value: 'last_30_days' as const, getDates: () => ({ start: subDays(new Date(), 30), end: new Date() }) },
  { label: 'This month', value: 'this_month' as const, getDates: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
];

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({
    from: value.start,
    to: value.end,
  });

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    const dates = preset.getDates();
    onChange({
      start: dates.start,
      end: dates.end,
      preset: preset.value,
    });
    setIsOpen(false);
  };

  const handleApply = () => {
    if (tempRange.from && tempRange.to) {
      onChange({
        start: tempRange.from,
        end: tempRange.to,
        preset: 'custom',
      });
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setTempRange({ from: value.start, to: value.end });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value.start && value.end ? (
            <>
              {format(value.start, 'MMM dd, yyyy')} - {format(value.end, 'MMM dd, yyyy')}
            </>
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* Presets */}
          <div className="border-r p-4 space-y-1">
            <p className="text-sm font-medium mb-2">Presets</p>
            {PRESETS.map((preset) => (
              <Button
                key={preset.value}
                variant={value.preset === preset.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handlePresetClick(preset)}
                className="w-full justify-start"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-4">
            <Calendar
              mode="range"
              selected={tempRange.from && tempRange.to ? tempRange as { from: Date; to: Date } : undefined}
              onSelect={(range) => setTempRange(range || {})}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
            />

            <div className="flex gap-2 mt-4 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!tempRange.from || !tempRange.to}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
