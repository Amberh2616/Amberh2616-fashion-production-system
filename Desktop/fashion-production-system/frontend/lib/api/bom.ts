/**
 * BOM API Client
 */

import { apiClient } from './client';
import type { BOMListResponse, BOMItem, UpdateBOMItemPayload, TranslateBatchResponse } from '../types/bom';

/**
 * Fetch BOM items for a specific revision
 */
export async function fetchBOMItems(revisionId: string): Promise<BOMListResponse> {
  return apiClient<BOMListResponse>(`/style-revisions/${revisionId}/bom/`);
}

/**
 * Fetch a single BOM item
 */
export async function fetchBOMItem(revisionId: string, itemId: string): Promise<BOMItem> {
  return apiClient<BOMItem>(`/style-revisions/${revisionId}/bom/${itemId}/`);
}

/**
 * Update a BOM item (PATCH)
 */
export async function updateBOMItem(
  revisionId: string,
  itemId: string,
  data: UpdateBOMItemPayload
): Promise<BOMItem> {
  return apiClient<BOMItem>(`/style-revisions/${revisionId}/bom/${itemId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Delete a BOM item
 */
export async function deleteBOMItem(revisionId: string, itemId: string): Promise<void> {
  return apiClient<void>(`/style-revisions/${revisionId}/bom/${itemId}/`, {
    method: 'DELETE',
  });
}

/**
 * Translate a single BOM item to Chinese
 */
export async function translateBOMItem(
  revisionId: string,
  itemId: string
): Promise<BOMItem> {
  return apiClient<BOMItem>(`/style-revisions/${revisionId}/bom/${itemId}/translate/`, {
    method: 'POST',
  });
}

/**
 * Batch translate all BOM items for a revision
 */
export async function translateBOMBatch(
  revisionId: string,
  force: boolean = false
): Promise<TranslateBatchResponse> {
  return apiClient<TranslateBatchResponse>(`/style-revisions/${revisionId}/bom/translate-batch/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ force }),
  });
}
