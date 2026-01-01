/**
 * Costing API Client - Phase 2-3
 * Three-Layer Architecture: BOM → Usage → Costing
 */

import { apiClient } from './client';
import type {
  CostSheetVersion,
  CostSheetVersionDetail,
  CostLineV2,
  CreateCostSheetPayload,
  CloneCostSheetPayload,
  UpdateCostSheetSummaryPayload,
  UpdateCostLinePatch,
} from '@/types/costing-phase23';

// ========================================
// CostSheetVersion APIs
// ========================================

/**
 * List all CostSheetVersions for a style (with filtering)
 * GET /cost-sheet-versions/?style_id=uuid&costing_type=sample|bulk
 */
export async function fetchCostSheetVersions(
  styleId: string,
  params?: {
    costing_type?: 'sample' | 'bulk';
    cost_sheet_group_id?: string;
  }
): Promise<CostSheetVersion[]> {
  const searchParams = new URLSearchParams({ style_id: styleId });

  if (params?.costing_type) {
    searchParams.set('costing_type', params.costing_type);
  }
  if (params?.cost_sheet_group_id) {
    searchParams.set('cost_sheet_group_id', params.cost_sheet_group_id);
  }

  const queryString = searchParams.toString();
  const url = `/cost-sheet-versions/${queryString ? `?${queryString}` : ''}`;

  // Backend returns paginated response
  const response = await apiClient<{ results: CostSheetVersion[] }>(url);
  return response.results;
}

/**
 * Get single CostSheetVersion detail with nested cost_lines
 * GET /cost-sheet-versions/{id}/
 */
export async function fetchCostSheetVersionDetail(
  costSheetId: string
): Promise<CostSheetVersionDetail> {
  return apiClient<CostSheetVersionDetail>(`/cost-sheet-versions/${costSheetId}/`);
}

/**
 * Create new CostSheetVersion (snapshot from UsageScenario)
 * POST /cost-sheet-versions/
 */
export async function createCostSheetVersion(
  payload: CreateCostSheetPayload
): Promise<CostSheetVersionDetail> {
  return apiClient<CostSheetVersionDetail>('/cost-sheet-versions/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Clone existing CostSheetVersion
 * POST /cost-sheet-versions/{id}/clone/
 */
export async function cloneCostSheetVersion(
  costSheetId: string,
  payload: CloneCostSheetPayload
): Promise<CostSheetVersionDetail> {
  return apiClient<CostSheetVersionDetail>(
    `/cost-sheet-versions/${costSheetId}/clone/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
}

/**
 * Submit CostSheetVersion (Draft → Submitted, locks UsageScenario)
 * POST /cost-sheet-versions/{id}/submit/
 */
export async function submitCostSheetVersion(
  costSheetId: string
): Promise<CostSheetVersionDetail> {
  return apiClient<CostSheetVersionDetail>(
    `/cost-sheet-versions/${costSheetId}/submit/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Update CostSheetVersion summary fields (Draft only)
 * PATCH /cost-sheet-versions/{id}/
 */
export async function updateCostSheetSummary(
  costSheetId: string,
  payload: UpdateCostSheetSummaryPayload
): Promise<CostSheetVersionDetail> {
  return apiClient<CostSheetVersionDetail>(`/cost-sheet-versions/${costSheetId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ========================================
// CostLineV2 APIs
// ========================================

/**
 * Update CostLineV2 (adjust consumption/price, Draft only)
 * PATCH /cost-lines-v2/{id}/
 */
export async function updateCostLine(
  lineId: string,
  patch: UpdateCostLinePatch
): Promise<CostLineV2> {
  return apiClient<CostLineV2>(`/cost-lines-v2/${lineId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}
