'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Home,
  Link as LinkIcon,
  BarChart,
  Globe,
  Settings,
  CreditCard,
  User,
  Command,
  ArrowRight,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'navigation' | 'links' | 'settings' | 'recent';
  keywords?: string[];
}

const navigationItems: SearchResult[] = [
  {
    id: 'nav-dashboard',
    title: 'Dashboard',
    description: 'View your overview and statistics',
    url: '/dashboard',
    icon: Home,
    category: 'navigation',
    keywords: ['home', 'overview', 'main'],
  },
  {
    id: 'nav-links',
    title: 'My Links',
    description: 'Manage your shortened links',
    url: '/dashboard/links',
    icon: LinkIcon,
    category: 'navigation',
    keywords: ['urls', 'shortlinks', 'manage'],
  },
  {
    id: 'nav-analytics',
    title: 'Analytics',
    description: 'View detailed analytics and reports',
    url: '/dashboard/analytics',
    icon: BarChart,
    category: 'navigation',
    keywords: ['stats', 'reports', 'data', 'metrics'],
  },
  {
    id: 'nav-domains',
    title: 'Custom Domains',
    description: 'Manage your custom domains',
    url: '/dashboard/domains',
    icon: Globe,
    category: 'navigation',
    keywords: ['dns', 'custom', 'brand'],
  },
  {
    id: 'nav-settings',
    title: 'Settings',
    description: 'Manage your account settings',
    url: '/dashboard/settings',
    icon: Settings,
    category: 'navigation',
    keywords: ['preferences', 'account', 'config'],
  },
  {
    id: 'nav-billing',
    title: 'Billing',
    description: 'Manage subscriptions and payments',
    url: '/dashboard/billing',
    icon: CreditCard,
    category: 'navigation',
    keywords: ['subscription', 'payment', 'plan', 'upgrade'],
  },
  {
    id: 'nav-profile',
    title: 'Profile',
    description: 'Edit your profile information',
    url: '/dashboard/profile',
    icon: User,
    category: 'navigation',
    keywords: ['user', 'account', 'personal'],
  },
];

const settingsItems: SearchResult[] = [
  {
    id: 'settings-general',
    title: 'General Settings',
    description: 'Basic account preferences',
    url: '/dashboard/settings',
    icon: Settings,
    category: 'settings',
  },
  {
    id: 'settings-security',
    title: 'Security Settings',
    description: 'Password and security options',
    url: '/dashboard/settings/security',
    icon: Settings,
    category: 'settings',
    keywords: ['password', 'auth', '2fa', 'authentication'],
  },
  {
    id: 'settings-api',
    title: 'API Keys',
    description: 'Manage API access',
    url: '/dashboard/settings/api',
    icon: Settings,
    category: 'settings',
    keywords: ['developer', 'integration', 'token'],
  },
];

export function GlobalSearch() {
  const router = useRouter();
  const { isCommandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, setRecentSearches] = useState<string[]>([]);

  // Combine all searchable items
  const allItems = useMemo(() => {
    return [...navigationItems, ...settingsItems];
  }, []);

  // Filter results based on query
  const filteredResults = useMemo(() => {
    if (!query.trim()) {
      return allItems.slice(0, 8); // Show top items when no query
    }

    const lowerQuery = query.toLowerCase();
    return allItems.filter((item) => {
      const titleMatch = item.title.toLowerCase().includes(lowerQuery);
      const descMatch = item.description?.toLowerCase().includes(lowerQuery);
      const keywordMatch = item.keywords?.some((k) => k.toLowerCase().includes(lowerQuery));

      return titleMatch || descMatch || keywordMatch;
    });
  }, [query, allItems]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};

    filteredResults.forEach((result) => {
      if (!groups[result.category]) {
        groups[result.category] = [];
      }
      groups[result.category]!.push(result);
    });

    return groups;
  }, [filteredResults]);

  const handleSelect = React.useCallback((result: SearchResult) => {
    // Add to recent searches
    setRecentSearches((prev) => {
      const updated = [result.title, ...prev.filter((s) => s !== result.title)].slice(0, 5);
      localStorage.setItem('recent-searches', JSON.stringify(updated));
      return updated;
    });

    // Navigate
    router.push(result.url);
    setCommandPaletteOpen(false);
  }, [router, setCommandPaletteOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isCommandPaletteOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredResults[selectedIndex];
        if (selected) {
          handleSelect(selected);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, selectedIndex, filteredResults, handleSelect]);

  // Reset on close
  useEffect(() => {
    if (!isCommandPaletteOpen) {
      // Use requestAnimationFrame to defer state updates after render
      requestAnimationFrame(() => {
        setQuery('');
        setSelectedIndex(0);
      });
    }
  }, [isCommandPaletteOpen]);

  // Load recent searches on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      const stored = localStorage.getItem('recent-searches');
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse recent searches', e);
        }
      }
    });
  }, []);

  return (
    <Dialog open={isCommandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for pages, settings, and more..."
            className="flex-1 bg-transparent px-4 py-4 text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            autoFocus
          />
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">
              Esc
            </kbd>
            <span>to close</span>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-2 h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs text-muted-foreground">
                Try searching with different keywords
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedResults).map(([category, results]) => (
                <div key={category}>
                  <div className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
                    {category}
                  </div>
                  <div className="space-y-1">
                    {results.map((result) => {
                      const globalIndex = filteredResults.indexOf(result);
                      const isSelected = globalIndex === selectedIndex;
                      const Icon = result.icon;

                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-md',
                              isSelected
                                ? 'bg-primary-foreground/20'
                                : 'bg-muted'
                            )}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.title}</p>
                            {result.description && (
                              <p
                                className={cn(
                                  'text-xs truncate',
                                  isSelected
                                    ? 'text-primary-foreground/70'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {result.description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <ArrowRight className="h-4 w-4 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">↑</kbd>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">↓</kbd>
              <span>to navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">Enter</kbd>
              <span>to select</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>Command Palette</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
