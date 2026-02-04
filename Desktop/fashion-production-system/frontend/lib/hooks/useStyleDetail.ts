/**
 * React Query hooks for Style Detail / Readiness
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStyleReadiness,
  batchVerifyBOM,
  batchVerifySpec,
} from '@/lib/api/style-detail';
import { listStyles } from '@/lib/api/styles';
import type { ListStylesParams } from '@/lib/api/styles';

export function useStyleReadiness(styleId: string | undefined) {
  return useQuery({
    queryKey: ['style-readiness', styleId],
    queryFn: () => getStyleReadiness(styleId!),
    enabled: !!styleId,
  });
}

export function useStylesList(params?: ListStylesParams) {
  return useQuery({
    queryKey: ['styles-list', params],
    queryFn: () => listStyles(params),
  });
}

export function useBatchVerifyBOM(revisionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => batchVerifyBOM(revisionId!, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['style-readiness'] });
    },
  });
}

export function useBatchVerifySpec(revisionId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => batchVerifySpec(revisionId!, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['style-readiness'] });
    },
  });
}
