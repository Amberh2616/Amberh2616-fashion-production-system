/**
 * BOM React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBOMItems, fetchBOMItem, updateBOMItem, deleteBOMItem } from '../api/bom';
import type { UpdateBOMItemPayload } from '../types/bom';

/**
 * Fetch BOM items for a revision
 */
export function useBOMItems(revisionId: string) {
  return useQuery({
    queryKey: ['bom', revisionId],
    queryFn: () => fetchBOMItems(revisionId),
    enabled: !!revisionId,
  });
}

/**
 * Fetch a single BOM item
 */
export function useBOMItem(revisionId: string, itemId: string) {
  return useQuery({
    queryKey: ['bom', revisionId, itemId],
    queryFn: () => fetchBOMItem(revisionId, itemId),
    enabled: !!revisionId && !!itemId,
  });
}

/**
 * Update BOM item mutation with optimistic updates
 */
export function useUpdateBOMItem(revisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: UpdateBOMItemPayload }) =>
      updateBOMItem(revisionId, itemId, data),

    // Optimistic update
    onMutate: async ({ itemId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['bom', revisionId] });

      // Snapshot previous value
      const previousBOM = queryClient.getQueryData(['bom', revisionId]);

      // Optimistically update
      queryClient.setQueryData(['bom', revisionId], (old: any) => {
        if (!old?.results) return old;
        return {
          ...old,
          results: old.results.map((item: any) =>
            item.id === itemId ? { ...item, ...data } : item
          ),
        };
      });

      return { previousBOM };
    },

    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousBOM) {
        queryClient.setQueryData(['bom', revisionId], context.previousBOM);
      }
    },

    // Refetch on success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['bom', revisionId] });
    },
  });
}

/**
 * Delete BOM item mutation
 */
export function useDeleteBOMItem(revisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteBOMItem(revisionId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bom', revisionId] });
    },
  });
}
