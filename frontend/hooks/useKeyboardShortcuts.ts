'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import { KEYBOARD_SHORTCUTS } from '@/lib/constants/shortcuts';

export function useKeyboardShortcuts() {
  const router = useRouter();
  const { toggleSidebar, toggleTheme, setCommandPaletteOpen } = useUIStore();

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      // Open command palette (Cmd/Ctrl + K)
      if (
        modifierKey &&
        event.key.toLowerCase() === KEYBOARD_SHORTCUTS.OPEN_COMMAND_PALETTE.key
      ) {
        event.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Show shortcuts overlay (?)
      if (event.shiftKey && event.key === '?') {
        event.preventDefault();
        // TODO: Open shortcuts modal
        console.log('Show keyboard shortcuts');
        return;
      }

      // Toggle sidebar (Cmd/Ctrl + B)
      if (modifierKey && event.key.toLowerCase() === KEYBOARD_SHORTCUTS.TOGGLE_SIDEBAR.key) {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      // Toggle theme (Cmd/Ctrl + Shift + T)
      if (
        modifierKey &&
        event.shiftKey &&
        event.key.toLowerCase() === KEYBOARD_SHORTCUTS.TOGGLE_THEME.key
      ) {
        event.preventDefault();
        toggleTheme();
        return;
      }

      // Navigation shortcuts (with Shift modifier)
      if (modifierKey && event.shiftKey) {
        const key = event.key.toLowerCase();

        switch (key) {
          case KEYBOARD_SHORTCUTS.GO_TO_DASHBOARD.key:
            event.preventDefault();
            router.push('/dashboard');
            break;
          case KEYBOARD_SHORTCUTS.GO_TO_LINKS.key:
            event.preventDefault();
            router.push('/dashboard/links');
            break;
          case KEYBOARD_SHORTCUTS.GO_TO_ANALYTICS.key:
            event.preventDefault();
            router.push('/dashboard/analytics');
            break;
          case KEYBOARD_SHORTCUTS.REFRESH.key:
            event.preventDefault();
            window.location.reload();
            break;
        }
      }

      // Settings shortcut (Cmd/Ctrl + ,)
      if (modifierKey && event.key === KEYBOARD_SHORTCUTS.GO_TO_SETTINGS.key) {
        event.preventDefault();
        router.push('/dashboard/settings');
        return;
      }

      // Create link (Cmd/Ctrl + N)
      if (modifierKey && event.key.toLowerCase() === KEYBOARD_SHORTCUTS.CREATE_LINK.key) {
        event.preventDefault();
        // TODO: Open create link modal
        console.log('Create new link');
        return;
      }
    },
    [router, toggleSidebar, toggleTheme, setCommandPaletteOpen]
  );

  useEffect(() => {
    // Don't attach shortcuts if user is typing in an input
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Allow Cmd/Ctrl + K even in inputs (for command palette)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;
      const isCommandPalette =
        modifierKey && event.key.toLowerCase() === KEYBOARD_SHORTCUTS.OPEN_COMMAND_PALETTE.key;

      if (!isInput || isCommandPalette) {
        handleKeyPress(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);
}

export function getShortcutDisplay(shortcut: {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
}): string {
  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (shortcut.ctrl || shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }

  // Format the key
  let key = shortcut.key;
  if (key === ',') key = ',';
  else if (key === '?') key = '?';
  else key = key.toUpperCase();

  parts.push(key);

  return parts.join(isMac ? '' : '+');
}
