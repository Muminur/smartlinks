'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/stores/ui-store';

/**
 * ThemeProvider - Handles theme initialization after hydration
 *
 * This component prevents hydration mismatch by:
 * 1. Not modifying the DOM during SSR
 * 2. Using useEffect to apply theme after client-side hydration
 * 3. Working with the blocking script in layout.tsx to prevent FOUC
 *
 * The theme is applied in two stages:
 * - Stage 1: Blocking script in layout.tsx applies theme immediately (prevents FOUC)
 * - Stage 2: This component syncs the theme after React hydration
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useUIStore();

  useEffect(() => {
    // Apply theme after hydration is complete
    // This ensures no hydration mismatch while keeping theme functionality
    setTheme(theme);

    // Listen for system theme changes when in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        // Trigger re-application of system theme
        setTheme('system');
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // Return undefined for non-system themes (satisfies TypeScript)
    return undefined;
  }, [theme, setTheme]);

  return <>{children}</>;
}
