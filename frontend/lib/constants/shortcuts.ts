export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  category: 'navigation' | 'actions' | 'general';
  action: () => void;
}

export const KEYBOARD_SHORTCUTS = {
  // Navigation
  OPEN_COMMAND_PALETTE: {
    key: 'k',
    meta: true,
    ctrl: true,
    description: 'Open command palette',
    category: 'navigation' as const,
  },
  GO_TO_DASHBOARD: {
    key: 'd',
    meta: true,
    shift: true,
    description: 'Go to Dashboard',
    category: 'navigation' as const,
  },
  GO_TO_LINKS: {
    key: 'l',
    meta: true,
    shift: true,
    description: 'Go to My Links',
    category: 'navigation' as const,
  },
  GO_TO_ANALYTICS: {
    key: 'a',
    meta: true,
    shift: true,
    description: 'Go to Analytics',
    category: 'navigation' as const,
  },
  GO_TO_SETTINGS: {
    key: ',',
    meta: true,
    description: 'Go to Settings',
    category: 'navigation' as const,
  },

  // Actions
  CREATE_LINK: {
    key: 'n',
    meta: true,
    description: 'Create new short link',
    category: 'actions' as const,
  },
  SEARCH: {
    key: 'f',
    meta: true,
    description: 'Search',
    category: 'actions' as const,
  },
  REFRESH: {
    key: 'r',
    meta: true,
    shift: true,
    description: 'Refresh data',
    category: 'actions' as const,
  },

  // General
  SHOW_SHORTCUTS: {
    key: '?',
    shift: true,
    description: 'Show keyboard shortcuts',
    category: 'general' as const,
  },
  TOGGLE_SIDEBAR: {
    key: 'b',
    meta: true,
    description: 'Toggle sidebar',
    category: 'general' as const,
  },
  TOGGLE_THEME: {
    key: 't',
    meta: true,
    shift: true,
    description: 'Toggle theme',
    category: 'general' as const,
  },
};

export type ShortcutKey = keyof typeof KEYBOARD_SHORTCUTS;
