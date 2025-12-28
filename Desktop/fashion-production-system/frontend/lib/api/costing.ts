/**
 * Costing API Client - Phase 2-2
 */

import { apiClient } from './client';
import type {
  CostSheetListResponse,
  CostSheetDetail,
  GenerateCostSheetPayload,
  UpdateCostSheetPayload,
  DuplicateCostSheetPayload,
} from '../types/costing';

/**
 * List all CostSheets for a revision
 */
export async function fetchCostSheets(
  revisionId: string,
  params?: {
    costing_type?: 'sample' | 'bulk';
    is_current?: boolean;
  }
): Promise<CostSheetListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.costing_type) {
    searchParams.set('costing_type', params.costing_type);
  }
  if (params?.is_current !== undefined) {
    searchParams.set('is_current', params.is_current.toString());
  }

  const queryString = searchParams.toString();
  const url = `/revisions/${revisionId}/cost-sheets/${queryString ? `?${queryString}` : ''}`;

  return apiClient<CostSheetListResponse>(url);
}

/**
 * Get single CostSheet detail with nested lines
 */
export async function fetchCostSheetDetail(costSheetId: number): Promise<CostSheetDetail> {
  return apiClient<CostSheetDetail>(`/cost-sheets/${costSheetId}/`);
}

/**
 * Generate new CostSheet from BOM
 */
export async function generateCostSheet(
  revisionId: string,
  payload: GenerateCostSheetPayload
): Promise<CostSheetDetail> {
  return apiClient<CostSheetDetail>(`/revisions/${revisionId}/cost-sheets/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Update CostSheet summary fields
 */
export async function updateCostSheet(
  costSheetId: number,
  payload: UpdateCostSheetPayload
): Promise<CostSheetDetail> {
  return apiClient<CostSheetDetail>(`/cost-sheets/${costSheetId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Duplicate CostSheet with new margin/wastage (Phase 2-2I: Version Policy)
 * Creates new version without rebuilding from BOM
 */
export async function duplicateCostSheet(
  costSheetId: number,
  payload: DuplicateCostSheetPayload
): Promise<CostSheetDetail> {
  return apiClient<CostSheetDetail>(`/cost-sheets/${costSheetId}/duplicate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
