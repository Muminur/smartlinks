import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Link as LinkType, LinkFilters } from '@/types';

export interface Link {
  _id: string;
  slug: string;
  originalUrl: string;
  customSlug?: string;
  title?: string;
  description?: string;
  clicks: number;
  uniqueClicks: number;
  isActive: boolean;
  isPasswordProtected: boolean;
  expiresAt?: Date;
  maxClicks?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface LinkState {
  links: Link[];
  selectedLink: Link | null;
  filters: LinkFilters;
  isLoading: boolean;
  error: string | null;
  totalLinks: number;
  page: number;
  limit: number;

  // Actions
  setLinks: (links: Link[]) => void;
  addLink: (link: Link) => void;
  updateLink: (id: string, updates: Partial<Link>) => void;
  deleteLink: (id: string) => void;
  setSelectedLink: (link: Link | null) => void;
  setFilters: (filters: Partial<LinkFilters>) => void;
  resetFilters: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setTotalLinks: (total: number) => void;
  reset: () => void;
}

const initialFilters: LinkFilters = {
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  status: 'all',
};

export const useLinkStore = create<LinkState>()(
  persist(
    (set) => ({
      links: [],
      selectedLink: null,
      filters: initialFilters,
      isLoading: false,
      error: null,
      totalLinks: 0,
      page: 1,
      limit: 10,

      setLinks: (links) => set({ links }),

      addLink: (link) =>
        set((state) => ({
          links: [link, ...state.links],
          totalLinks: state.totalLinks + 1,
        })),

      updateLink: (id, updates) =>
        set((state) => ({
          links: state.links.map((link) =>
            link._id === id ? { ...link, ...updates } : link
          ),
          selectedLink:
            state.selectedLink?._id === id
              ? { ...state.selectedLink, ...updates }
              : state.selectedLink,
        })),

      deleteLink: (id) =>
        set((state) => ({
          links: state.links.filter((link) => link._id !== id),
          totalLinks: Math.max(0, state.totalLinks - 1),
          selectedLink:
            state.selectedLink?._id === id ? null : state.selectedLink,
        })),

      setSelectedLink: (link) => set({ selectedLink: link }),

      setFilters: (filters) =>
        set((state) => ({
          filters: { ...state.filters, ...filters },
        })),

      resetFilters: () => set({ filters: initialFilters }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      setPage: (page) => set({ page }),

      setLimit: (limit) => set({ limit }),

      setTotalLinks: (total) => set({ totalLinks: total }),

      reset: () =>
        set({
          links: [],
          selectedLink: null,
          filters: initialFilters,
          isLoading: false,
          error: null,
          totalLinks: 0,
          page: 1,
          limit: 10,
        }),
    }),
    {
      name: 'link-storage',
      partialize: (state) => ({
        filters: state.filters,
        limit: state.limit,
      }),
    }
  )
);
