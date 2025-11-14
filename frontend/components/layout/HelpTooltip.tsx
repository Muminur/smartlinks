'use client';

import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  iconClassName?: string;
  children?: React.ReactNode;
}

export function HelpTooltip({
  content,
  side = 'top',
  className,
  iconClassName,
  children,
}: HelpTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors',
                className
              )}
            >
              <HelpCircle className={cn('h-4 w-4', iconClassName)} />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {typeof content === 'string' ? (
            <p className="text-sm">{content}</p>
          ) : (
            content
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Keyboard shortcuts help overlay
export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { keys: ['⌘', 'K'], description: 'Open command palette' },
    { keys: ['⌘', 'B'], description: 'Toggle sidebar' },
    { keys: ['⌘', 'Shift', 'T'], description: 'Toggle theme' },
    { keys: ['⌘', 'Shift', 'D'], description: 'Go to Dashboard' },
    { keys: ['⌘', 'Shift', 'L'], description: 'Go to My Links' },
    { keys: ['⌘', 'Shift', 'A'], description: 'Go to Analytics' },
    { keys: ['⌘', ','], description: 'Go to Settings' },
    { keys: ['⌘', 'N'], description: 'Create new link' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 font-semibold">Keyboard Shortcuts</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Use these keyboard shortcuts to navigate faster
        </p>
      </div>
      <div className="space-y-2">
        {shortcuts.map((shortcut, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="text-muted-foreground">{shortcut.description}</span>
            <div className="flex items-center gap-1">
              {shortcut.keys.map((key, i) => (
                <kbd
                  key={i}
                  className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium"
                >
                  {key}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Use Ctrl instead of ⌘ on Windows/Linux
      </p>
    </div>
  );
}
