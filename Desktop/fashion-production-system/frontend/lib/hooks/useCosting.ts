/**
 * Costing React Query Hooks - Phase 2-2
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCostSheets,
  fetchCostSheetDetail,
  generateCostSheet,
  updateCostSheet,
  duplicateCostSheet,
} from '../api/costing';
import type {
  GenerateCostSheetPayload,
  UpdateCostSheetPayload,
  DuplicateCostSheetPayload
} from '../types/costing';

/**
 * Fetch all CostSheets for a revision
 */
export function useCostSheets(
  revisionId: string,
  params?: {
    costing_type?: 'sample' | 'bulk';
    is_current?: boolean;
  }
) {
  return useQuery({
    queryKey: ['cost-sheets', revisionId, params],
    queryFn: () => fetchCostSheets(revisionId, params),
    enabled: !!revisionId,
  });
}

/**
 * Fetch single CostSheet detail with nested lines
 */
export function useCostSheetDetail(costSheetId: number | null) {
  return useQuery({
    queryKey: ['cost-sheet', costSheetId],
    queryFn: () => fetchCostSheetDetail(costSheetId!),
    enabled: !!costSheetId,
  });
}

/**
 * Generate new CostSheet from BOM
 */
export function useGenerateCostSheet(revisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GenerateCostSheetPayload) =>
      generateCostSheet(revisionId, payload),
    onSuccess: () => {
      // Invalidate list to show new version
      queryClient.invalidateQueries({ queryKey: ['cost-sheets', revisionId] });
    },
  });
}

/**
 * Update CostSheet summary fields (labor, overhead, margin, etc.)
 */
export function useUpdateCostSheet(costSheetId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCostSheetPayload) =>
      updateCostSheet(costSheetId, payload),
    onSuccess: (data) => {
      // Update detail cache
      queryClient.setQueryData(['cost-sheet', costSheetId], data);
      // Invalidate list to refresh totals
      queryClient.invalidateQueries({ queryKey: ['cost-sheets'] });
    },
  });
}

/**
 * Duplicate CostSheet with new margin/wastage (Phase 2-2I: Version Policy)
 * Creates new version without rebuilding from BOM
 */
export function useDuplicateCostSheet(costSheetId: number, revisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DuplicateCostSheetPayload) =>
      duplicateCostSheet(costSheetId, payload),
    onSuccess: (data) => {
      // Invalidate list to show new version
      queryClient.invalidateQueries({ queryKey: ['cost-sheets', revisionId] });
      // Update detail cache for new version
      queryClient.setQueryData(['cost-sheet', data.id], data);
    },
  });
}
