import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  Link,
  CreateLinkData,
  UpdateLinkData,
  LinkFilters,
  PaginatedResponse,
} from '@/types';
import * as linksApi from '@/lib/api/links';

/**
 * Query keys for links
 */
export const linksKeys = {
  all: ['links'] as const,
  lists: () => [...linksKeys.all, 'list'] as const,
  list: (filters: LinkFilters & { page?: number; limit?: number }) =>
    [...linksKeys.lists(), filters] as const,
  details: () => [...linksKeys.all, 'detail'] as const,
  detail: (id: string) => [...linksKeys.details(), id] as const,
  tags: () => [...linksKeys.all, 'tags'] as const,
  analytics: (id: string) => [...linksKeys.all, 'analytics', id] as const,
};

/**
 * Hook to fetch paginated links with filters
 */
export function useLinks(
  filters?: LinkFilters & { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: linksKeys.list(filters || {}),
    queryFn: () => linksApi.getLinks(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch a single link by ID
 */
export function useLink(id: string) {
  return useQuery({
    queryKey: linksKeys.detail(id),
    queryFn: () => linksApi.getLinkById(id),
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook to fetch a single link by slug
 */
export function useLinkBySlug(slug: string) {
  return useQuery({
    queryKey: ['link', 'slug', slug],
    queryFn: () => linksApi.getLinkBySlug(slug),
    enabled: !!slug,
    staleTime: 60000,
  });
}

/**
 * Hook to fetch all unique tags
 */
export function useTags() {
  return useQuery({
    queryKey: linksKeys.tags(),
    queryFn: () => linksApi.getAllTags(),
    staleTime: 300000, // 5 minutes
  });
}

/**
 * Hook to fetch link analytics
 */
export function useLinkAnalytics(linkId: string) {
  return useQuery({
    queryKey: linksKeys.analytics(linkId),
    queryFn: () => linksApi.getLinkAnalytics(linkId),
    enabled: !!linkId,
    staleTime: 60000,
  });
}

/**
 * Hook to create a new link
 */
export function useCreateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLinkData) => linksApi.createLink(data),
    onSuccess: (newLink) => {
      // Invalidate and refetch links
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });

      // Optimistically add the new link to the cache
      queryClient.setQueryData<PaginatedResponse<Link>>(
        linksKeys.list({ page: 1, limit: 10 }),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [newLink, ...old.data],
            total: old.total + 1,
          };
        }
      );

      toast.success('Link created successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || 'Failed to create link');
    },
  });
}

/**
 * Hook to update a link
 */
export function useUpdateLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLinkData }) =>
      linksApi.updateLink(id, data),
    onSuccess: (updatedLink) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });

      // Update the specific link in cache
      queryClient.setQueryData(linksKeys.detail(updatedLink._id), updatedLink);

      toast.success('Link updated successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || 'Failed to update link');
    },
  });
}

/**
 * Hook to delete a link
 */
export function useDeleteLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => linksApi.deleteLink(id),
    onSuccess: (_, deletedId) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });

      // Remove from cache
      queryClient.removeQueries({ queryKey: linksKeys.detail(deletedId) });

      toast.success('Link deleted successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || 'Failed to delete link');
    },
  });
}

/**
 * Hook to bulk delete links
 */
export function useBulkDeleteLinks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkIds: string[]) => linksApi.bulkDeleteLinks(linkIds),
    onSuccess: (_, deletedIds) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });

      // Remove each link from cache
      deletedIds.forEach((id) => {
        queryClient.removeQueries({ queryKey: linksKeys.detail(id) });
      });

      toast.success(`${deletedIds.length} link(s) deleted successfully!`);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || 'Failed to delete links');
    },
  });
}

/**
 * Hook to toggle link status (active/inactive)
 */
export function useToggleLinkStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      linksApi.toggleLinkStatus(id, isActive),
    onSuccess: (updatedLink) => {
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });

      // Update the specific link in cache
      queryClient.setQueryData(linksKeys.detail(updatedLink._id), updatedLink);

      toast.success(
        `Link ${updatedLink.isActive ? 'activated' : 'deactivated'} successfully!`
      );
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || 'Failed to update link status');
    },
  });
}

/**
 * Hook to check slug availability
 */
export function useCheckSlugAvailability() {
  return useMutation({
    mutationFn: (slug: string) => linksApi.checkSlugAvailability(slug),
  });
}

/**
 * Hook to get link preview metadata
 */
export function useGetLinkPreview() {
  return useMutation({
    mutationFn: (url: string) => linksApi.getLinkPreview(url),
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || 'Failed to fetch link preview');
    },
  });
}

/**
 * Hook to generate QR code
 */
export function useGenerateQRCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => linksApi.generateQRCode(linkId),
    onSuccess: (data, linkId) => {
      // Update the link in cache with QR code
      queryClient.setQueryData<Link>(linksKeys.detail(linkId), (old) => {
        if (!old) return old;
        return { ...old, qrCode: data.qrCode };
      });

      toast.success('QR code generated successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || 'Failed to generate QR code');
    },
  });
}

/**
 * Hook to export links
 */
export function useExportLinks() {
  return useMutation({
    mutationFn: ({
      format,
      params,
    }: {
      format: 'csv' | 'json';
      params?: {
        fields?: string[];
        startDate?: string;
        endDate?: string;
      };
    }) => linksApi.exportLinks(format, params),
    onSuccess: (blob, { format }) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `links-export-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Links exported successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || 'Failed to export links');
    },
  });
}

/**
 * Hook to import links from CSV
 */
export function useImportLinks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => linksApi.importLinks(file),
    onSuccess: (result) => {
      // Invalidate links list
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });

      if (result.failed > 0) {
        toast.warning(
          `Imported ${result.imported} link(s). ${result.failed} failed.`,
          {
            description: result.errors
              ?.slice(0, 3)
              .map((e) => `Row ${e.row}: ${e.error}`)
              .join('\n'),
          }
        );
      } else {
        toast.success(`Successfully imported ${result.imported} link(s)!`);
      }
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || 'Failed to import links');
    },
  });
}

/**
 * Hook to add tags to multiple links
 */
export function useBulkAddTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ linkIds, tags }: { linkIds: string[]; tags: string[] }) =>
      linksApi.bulkAddTags(linkIds, tags),
    onSuccess: (_, { linkIds }) => {
      // Invalidate lists and tags
      queryClient.invalidateQueries({ queryKey: linksKeys.lists() });
      queryClient.invalidateQueries({ queryKey: linksKeys.tags() });

      toast.success(`Tags added to ${linkIds.length} link(s)!`);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      toast.error(err?.response?.data?.error?.message || 'Failed to add tags');
    },
  });
}
