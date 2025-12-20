/**
 * Draft Review Hooks - v2.2.1
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DraftResponse, DraftEdit } from '@/lib/types/draft';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v2';

// ===== Fetch Draft Data =====
export function useDraft(revisionId: string) {
  return useQuery({
    queryKey: ['draft', revisionId],
    queryFn: async (): Promise<DraftResponse> => {
      const res = await fetch(`${API_BASE}/revisions/${revisionId}/draft/`);
      if (!res.ok) {
        throw new Error(`Failed to fetch draft: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!revisionId,
    staleTime: 30000, // 30 seconds
    retry: 2,
  });
}

// ===== Update Draft Data (PATCH) =====
export function useUpdateDraft(revisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (edits: DraftEdit[]) => {
      const res = await fetch(`${API_BASE}/revisions/${revisionId}/draft/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ edits }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update draft: ${res.statusText}`);
      }

      return res.json();
    },
    onSuccess: () => {
      // Invalidate draft query to refetch
      queryClient.invalidateQueries({ queryKey: ['draft', revisionId] });
    },
  });
}

// ===== Approve Revision =====
export function useApproveRevision(revisionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/revisions/${revisionId}/approve/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.errors?.[0]?.message || 'Failed to approve');
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draft', revisionId] });
      queryClient.invalidateQueries({ queryKey: ['revisions'] });
    },
  });
}

// ===== Extraction Run Status (for polling) =====
export function useExtractionRun(runId: string | null) {
  return useQuery({
    queryKey: ['extraction-run', runId],
    queryFn: async () => {
      if (!runId) return null;

      const res = await fetch(`${API_BASE}/extraction-runs/${runId}/`);
      if (!res.ok) {
        // May require auth, skip for now
        return null;
      }
      return res.json();
    },
    enabled: !!runId,
    refetchInterval: (data) => {
      // Poll every 2s if status is pending/processing
      if (!data) return false;
      const status = data?.data?.status;
      return status === 'pending' || status === 'processing' ? 2000 : false;
    },
  });
}
