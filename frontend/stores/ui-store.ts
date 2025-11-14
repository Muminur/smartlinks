import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Toast {
  id: string;
  title?: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface Modal {
  id: string;
  isOpen: boolean;
  data?: unknown;
}

interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  toasts: Toast[];
  modals: Modal[];
  isCommandPaletteOpen: boolean;

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  openModal: (id: string, data?: unknown) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      sidebarCollapsed: false,
      toasts: [],
      modals: [],
      isCommandPaletteOpen: false,

      setTheme: (theme) => {
        set({ theme });
        if (typeof window !== 'undefined') {
          const root = window.document.documentElement;
          root.classList.remove('light', 'dark');

          if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
              .matches
              ? 'dark'
              : 'light';
            root.classList.add(systemTheme);
          } else {
            root.classList.add(theme);
          }
        }
      },

      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme =
          currentTheme === 'light'
            ? 'dark'
            : currentTheme === 'dark'
              ? 'system'
              : 'light';
        get().setTheme(newTheme);
      },

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      addToast: (toast) =>
        set((state) => ({
          toasts: [
            ...state.toasts,
            {
              ...toast,
              id: Math.random().toString(36).substring(7),
            },
          ],
        })),

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== id),
        })),

      clearToasts: () => set({ toasts: [] }),

      openModal: (id, data) =>
        set((state) => ({
          modals: [
            ...state.modals.filter((modal) => modal.id !== id),
            { id, isOpen: true, data },
          ],
        })),

      closeModal: (id) =>
        set((state) => ({
          modals: state.modals.map((modal) =>
            modal.id === id ? { ...modal, isOpen: false } : modal
          ),
        })),

      isModalOpen: (id) => {
        const modal = get().modals.find((m) => m.id === id);
        return modal?.isOpen ?? false;
      },

      setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

      toggleCommandPalette: () =>
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
