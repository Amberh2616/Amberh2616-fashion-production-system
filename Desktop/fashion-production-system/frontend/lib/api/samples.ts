/**
 * Sample Request API Client
 * Phase 3-1: Sample Request System MVP
 */

import { apiClient } from './client';
import type {
  SampleRequest,
  SampleRun,
  SampleActuals,
  SampleCostEstimate,
  T2POForSample,
  SampleMWO,
  Sample,
  SampleAttachment,
  CreateSampleRequestPayload,
  UpdateSampleRequestPayload,
  CreateSampleRunPayload,
  UpdateSampleRunPayload,
  TransitionSampleRunPayload,
  CreateSampleAttachmentPayload,
} from '@/types/samples';

// ========================================
// SampleRequest APIs
// ========================================

/**
 * List all SampleRequests (with optional filtering)
 * GET /sample-requests/?revision_id=uuid&status=open&brand_name=Nike
 */
export async function fetchSampleRequests(params?: {
  revision_id?: string;
  status?: string;
  brand_name?: string;
}): Promise<SampleRequest[]> {
  const searchParams = new URLSearchParams();

  if (params?.revision_id) {
    searchParams.set('revision_id', params.revision_id);
  }
  if (params?.status) {
    searchParams.set('status', params.status);
  }
  if (params?.brand_name) {
    searchParams.set('brand_name', params.brand_name);
  }

  const queryString = searchParams.toString();
  const url = `/sample-requests/${queryString ? `?${queryString}` : ''}`;

  // Backend returns paginated response
  const response = await apiClient<{ results: SampleRequest[] }>(url);
  return response.results;
}

/**
 * Get single SampleRequest detail
 * GET /sample-requests/{id}/
 */
export async function fetchSampleRequest(id: string): Promise<SampleRequest> {
  return apiClient<SampleRequest>(`/sample-requests/${id}/`);
}

/**
 * Create new SampleRequest
 * POST /sample-requests/
 */
export async function createSampleRequest(
  payload: CreateSampleRequestPayload
): Promise<SampleRequest> {
  return apiClient<SampleRequest>('/sample-requests/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Update SampleRequest
 * PATCH /sample-requests/{id}/
 */
export async function updateSampleRequest(
  id: string,
  payload: UpdateSampleRequestPayload
): Promise<SampleRequest> {
  return apiClient<SampleRequest>(`/sample-requests/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Delete SampleRequest
 * DELETE /sample-requests/{id}/
 */
export async function deleteSampleRequest(id: string): Promise<void> {
  return apiClient<void>(`/sample-requests/${id}/`, {
    method: 'DELETE',
  });
}

/**
 * 方案 B：確認樣衣 - 觸發 BOM/Spec 整合並生成文件
 * POST /sample-requests/{id}/confirm/
 */
export async function confirmSampleRequest(id: string): Promise<{
  message: string;
  sample_run: {
    id: string;
    run_no: number;
    status: string;
  };
  documents: Record<string, any>;
}> {
  return apiClient(`/sample-requests/${id}/confirm/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Get allowed actions for a SampleRequest
 * GET /sample-requests/{id}/allowed-actions/
 */
export async function fetchAllowedActions(id: string): Promise<{ actions: string[] }> {
  return apiClient<{ actions: string[] }>(`/sample-requests/${id}/allowed-actions/`);
}

// ========================================
// SampleRun APIs
// ========================================

/**
 * List all SampleRuns (filterable by request)
 * GET /sample-runs/?sample_request=uuid
 */
export async function fetchSampleRuns(params?: {
  sample_request_id?: string;
}): Promise<SampleRun[]> {
  const searchParams = new URLSearchParams();

  if (params?.sample_request_id) {
    searchParams.set('sample_request', params.sample_request_id);
  }

  const queryString = searchParams.toString();
  const url = `/sample-runs/${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient<{ results: SampleRun[] }>(url);
  return response.results;
}

/**
 * Get single SampleRun detail
 * GET /sample-runs/{id}/
 */
export async function fetchSampleRun(id: string): Promise<SampleRun> {
  return apiClient<SampleRun>(`/sample-runs/${id}/`);
}

/**
 * Create new SampleRun
 * POST /sample-runs/
 */
export async function createSampleRun(payload: CreateSampleRunPayload): Promise<SampleRun> {
  return apiClient<SampleRun>('/sample-runs/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Update SampleRun
 * PATCH /sample-runs/{id}/
 */
export async function updateSampleRun(
  id: string,
  payload: UpdateSampleRunPayload
): Promise<SampleRun> {
  return apiClient<SampleRun>(`/sample-runs/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Delete SampleRun
 * DELETE /sample-runs/{id}/
 */
export async function deleteSampleRun(id: string): Promise<void> {
  return apiClient<void>(`/sample-runs/${id}/`, {
    method: 'DELETE',
  });
}

// ========================================
// SampleRun Workflow Actions (State Machine)
// ========================================

/**
 * Submit SampleRun
 * POST /sample-runs/{id}/submit/
 */
export async function submitSampleRun(id: string, notes?: string): Promise<SampleRun> {
  return apiClient<SampleRun>(`/sample-runs/${id}/submit/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

/**
 * Quote SampleRun (request costing)
 * POST /sample-runs/{id}/quote/
 */
export async function quoteSampleRun(id: string, notes?: string): Promise<SampleRun> {
  return apiClient<SampleRun>(`/sample-runs/${id}/quote/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

/**
 * Approve SampleRun
 * POST /sample-runs/{id}/approve/
 */
export async function approveSampleRun(id: string, notes?: string): Promise<SampleRun> {
  return apiClient<SampleRun>(`/sample-runs/${id}/approve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

/**
 * Reject SampleRun
 * POST /sample-runs/{id}/reject/
 */
export async function rejectSampleRun(id: string, notes?: string): Promise<SampleRun> {
  return apiClient<SampleRun>(`/sample-runs/${id}/reject/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

/**
 * Cancel SampleRun
 * POST /sample-runs/{id}/cancel/
 */
export async function cancelSampleRun(id: string, notes?: string): Promise<SampleRun> {
  return apiClient<SampleRun>(`/sample-runs/${id}/cancel/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

/**
 * Start execution of SampleRun
 * POST /sample-runs/{id}/start-execution/
 */
export async function startExecutionSampleRun(id: string, notes?: string): Promise<SampleRun> {
  return apiClient<SampleRun>(`/sample-runs/${id}/start-execution/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

/**
 * Complete SampleRun
 * POST /sample-runs/{id}/complete/
 */
export async function completeSampleRun(id: string, notes?: string): Promise<SampleRun> {
  return apiClient<SampleRun>(`/sample-runs/${id}/complete/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
}

// ========================================
// SampleCostEstimate APIs
// ========================================

/**
 * List all SampleCostEstimates (filterable by request)
 * GET /sample-cost-estimates/?sample_request_id=uuid
 */
export async function fetchSampleCostEstimates(params?: {
  sample_request_id?: string;
}): Promise<SampleCostEstimate[]> {
  const searchParams = new URLSearchParams();

  if (params?.sample_request_id) {
    searchParams.set('sample_request_id', params.sample_request_id);
  }

  const queryString = searchParams.toString();
  const url = `/sample-cost-estimates/${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient<{ results: SampleCostEstimate[] }>(url);
  return response.results;
}

/**
 * Get single SampleCostEstimate detail
 * GET /sample-cost-estimates/{id}/
 */
export async function fetchSampleCostEstimate(id: string): Promise<SampleCostEstimate> {
  return apiClient<SampleCostEstimate>(`/sample-cost-estimates/${id}/`);
}

// ========================================
// T2POForSample APIs
// ========================================

/**
 * List all T2POForSample (filterable by run)
 * GET /t2pos-for-sample/?sample_run_id=uuid
 */
export async function fetchT2POsForSample(params?: {
  sample_run_id?: string;
}): Promise<T2POForSample[]> {
  const searchParams = new URLSearchParams();

  if (params?.sample_run_id) {
    searchParams.set('sample_run_id', params.sample_run_id);
  }

  const queryString = searchParams.toString();
  const url = `/t2pos-for-sample/${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient<{ results: T2POForSample[] }>(url);
  return response.results;
}

/**
 * Get single T2POForSample detail
 * GET /t2pos-for-sample/{id}/
 */
export async function fetchT2POForSample(id: string): Promise<T2POForSample> {
  return apiClient<T2POForSample>(`/t2pos-for-sample/${id}/`);
}

// ========================================
// SampleMWO APIs
// ========================================

/**
 * List all SampleMWOs (filterable by run)
 * GET /sample-mwos/?sample_run_id=uuid
 */
export async function fetchSampleMWOs(params?: {
  sample_run_id?: string;
}): Promise<SampleMWO[]> {
  const searchParams = new URLSearchParams();

  if (params?.sample_run_id) {
    searchParams.set('sample_run_id', params.sample_run_id);
  }

  const queryString = searchParams.toString();
  const url = `/sample-mwos/${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient<{ results: SampleMWO[] }>(url);
  return response.results;
}

/**
 * Get single SampleMWO detail
 * GET /sample-mwos/{id}/
 */
export async function fetchSampleMWO(id: string): Promise<SampleMWO> {
  return apiClient<SampleMWO>(`/sample-mwos/${id}/`);
}

// ========================================
// Sample APIs
// ========================================

/**
 * List all Samples (filterable by request)
 * GET /samples/?sample_request_id=uuid
 */
export async function fetchSamples(params?: {
  sample_request_id?: string;
}): Promise<Sample[]> {
  const searchParams = new URLSearchParams();

  if (params?.sample_request_id) {
    searchParams.set('sample_request_id', params.sample_request_id);
  }

  const queryString = searchParams.toString();
  const url = `/samples/${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient<{ results: Sample[] }>(url);
  return response.results;
}

/**
 * Get single Sample detail
 * GET /samples/{id}/
 */
export async function fetchSample(id: string): Promise<Sample> {
  return apiClient<Sample>(`/samples/${id}/`);
}

// ========================================
// SampleAttachment APIs
// ========================================

/**
 * List all SampleAttachments (filterable by request or sample)
 * GET /sample-attachments/?sample_request_id=uuid&sample_id=uuid
 */
export async function fetchSampleAttachments(params?: {
  sample_request_id?: string;
  sample_id?: string;
}): Promise<SampleAttachment[]> {
  const searchParams = new URLSearchParams();

  if (params?.sample_request_id) {
    searchParams.set('sample_request_id', params.sample_request_id);
  }
  if (params?.sample_id) {
    searchParams.set('sample_id', params.sample_id);
  }

  const queryString = searchParams.toString();
  const url = `/sample-attachments/${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient<{ results: SampleAttachment[] }>(url);
  return response.results;
}

/**
 * Get single SampleAttachment detail
 * GET /sample-attachments/{id}/
 */
export async function fetchSampleAttachment(id: string): Promise<SampleAttachment> {
  return apiClient<SampleAttachment>(`/sample-attachments/${id}/`);
}

/**
 * Create new SampleAttachment
 * POST /sample-attachments/
 */
export async function createSampleAttachment(
  payload: CreateSampleAttachmentPayload
): Promise<SampleAttachment> {
  return apiClient<SampleAttachment>('/sample-attachments/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/**
 * Delete SampleAttachment
 * DELETE /sample-attachments/{id}/
 */
export async function deleteSampleAttachment(id: string): Promise<void> {
  return apiClient<void>(`/sample-attachments/${id}/`, {
    method: 'DELETE',
  });
}

// ========================================
// SampleActuals APIs
// ========================================

/**
 * Fetch SampleActuals for a specific run
 * GET /sample-actuals/?sample_run_id=uuid
 */
export async function fetchSampleActuals(params?: {
  sample_run_id?: string;
}): Promise<SampleActuals[]> {
  const searchParams = new URLSearchParams();

  if (params?.sample_run_id) {
    searchParams.set('sample_run_id', params.sample_run_id);
  }

  const queryString = searchParams.toString();
  const url = `/sample-actuals/${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient<{ results: SampleActuals[] }>(url);
  return response.results;
}

/**
 * Get single SampleActuals detail
 * GET /sample-actuals/{id}/
 */
export async function fetchSampleActualsDetail(id: string): Promise<SampleActuals> {
  return apiClient<SampleActuals>(`/sample-actuals/${id}/`);
}

/**
 * Update SampleActuals
 * PATCH /sample-actuals/{id}/
 */
export async function updateSampleActuals(
  id: string,
  payload: Partial<SampleActuals>
): Promise<SampleActuals> {
  return apiClient<SampleActuals>(`/sample-actuals/${id}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// ========================================
// Kanban APIs (P0-2)
// ========================================

export interface KanbanLane {
  status: string;
  label: string;
  count: number;
  overdue: number;
  due_soon: number;
}

export interface KanbanCountsResponse {
  lanes: KanbanLane[];
  summary: {
    total: number;
    overdue_total: number;
    due_this_week: number;
  };
  meta: {
    as_of: string;
    days_ahead: number;
  };
}

export interface KanbanRunItem {
  id: string;
  run_no: number;
  status: string;
  status_label: string;
  run_type: string;
  run_type_label: string;
  quantity: number;
  target_due_date: string | null;
  is_overdue: boolean | null;
  days_until_due: number | null;
  sample_request: {
    id: string;
    request_type: string;
    priority: string;
    brand_name: string;
  };
  style: {
    id: string;
    style_number: string;
    style_name: string;
  } | null;
  revision: {
    id: string;
    revision_label: string;
  } | null;
}

export interface KanbanRunsResponse {
  runs: KanbanRunItem[];
  meta: {
    count: number;
    as_of: string;
  };
}

/**
 * Get Kanban lane counts
 * GET /kanban/counts/?days_ahead=7
 */
export async function fetchKanbanCounts(daysAhead?: number): Promise<KanbanCountsResponse> {
  const params = new URLSearchParams();
  if (daysAhead) {
    params.set('days_ahead', String(daysAhead));
  }
  const queryString = params.toString();
  const url = `/kanban/counts/${queryString ? `?${queryString}` : ''}`;
  return apiClient<KanbanCountsResponse>(url);
}

/**
 * Kanban filter parameters (300+ styles support)
 */
export interface KanbanFilters {
  status?: string;
  priority?: string;
  overdue_only?: boolean;
  due_this_week?: boolean;
  brand?: string;
  style_number?: string;
  run_type?: string;
  search?: string;
  limit?: number;
}

/**
 * Get Kanban runs for board display
 * GET /kanban/runs/?status=draft,materials_planning&priority=urgent&overdue_only=true
 */
export async function fetchKanbanRuns(params?: KanbanFilters): Promise<KanbanRunsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.status) {
    searchParams.set('status', params.status);
  }
  if (params?.priority) {
    searchParams.set('priority', params.priority);
  }
  if (params?.overdue_only) {
    searchParams.set('overdue_only', 'true');
  }
  if (params?.due_this_week) {
    searchParams.set('due_this_week', 'true');
  }
  if (params?.brand) {
    searchParams.set('brand', params.brand);
  }
  if (params?.style_number) {
    searchParams.set('style_number', params.style_number);
  }
  if (params?.run_type) {
    searchParams.set('run_type', params.run_type);
  }
  if (params?.search) {
    searchParams.set('search', params.search);
  }
  if (params?.limit) {
    searchParams.set('limit', String(params.limit));
  }
  const queryString = searchParams.toString();
  const url = `/kanban/runs/${queryString ? `?${queryString}` : ''}`;
  return apiClient<KanbanRunsResponse>(url);
}

/**
 * Transition sample run status (for drag-drop)
 * POST /sample-runs/{id}/{action}/
 */
export async function transitionSampleRun(
  runId: string,
  action: string,
  payload?: { notes?: string; reason?: string }
): Promise<SampleRun> {
  return apiClient<SampleRun>(`/sample-runs/${runId}/${action}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
}

// ========================================
// P1: Batch Operations
// ========================================

export interface BatchTransitionResult {
  run_id: string;
  old_status?: string;
  new_status?: string;
  action?: string;
  success: boolean;
  error?: string;
}

export interface BatchTransitionResponse {
  total: number;
  succeeded: number;
  failed: number;
  results: BatchTransitionResult[];
  errors: { run_id?: string; error: string }[];
}

/**
 * Batch transition multiple sample runs
 * POST /sample-runs/batch-transition/
 */
export async function batchTransitionSampleRuns(
  runIds: string[],
  action: string,
  payload?: { notes?: string; reason?: string }
): Promise<BatchTransitionResponse> {
  return apiClient<BatchTransitionResponse>('/sample-runs/batch-transition/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      run_ids: runIds,
      action,
      ...payload,
    }),
  });
}

// ========================================
// P1: Alerts API
// ========================================

export interface Alert {
  id: string;
  type: 'overdue' | 'due_soon' | 'stale';
  severity: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  run_id: string;
  request_id: string;
  style_number: string | null;
  status: string;
  days_overdue?: number;
  days_until_due?: number;
  days_stale?: number;
  target_due_date?: string;
  created_at?: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  summary: {
    overdue: number;
    due_soon: number;
    stale: number;
    total: number;
  };
  meta: {
    as_of: string;
    due_soon_days: number;
    stale_days: number;
  };
}

export interface AlertsParams {
  include_overdue?: boolean;
  include_due_soon?: boolean;
  include_stale?: boolean;
  due_soon_days?: number;
  stale_days?: number;
  limit?: number;
}

/**
 * Get alerts for sample runs
 * GET /alerts/
 */
export async function fetchAlerts(params?: AlertsParams): Promise<AlertsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.include_overdue !== undefined) {
    searchParams.set('include_overdue', String(params.include_overdue));
  }
  if (params?.include_due_soon !== undefined) {
    searchParams.set('include_due_soon', String(params.include_due_soon));
  }
  if (params?.include_stale !== undefined) {
    searchParams.set('include_stale', String(params.include_stale));
  }
  if (params?.due_soon_days) {
    searchParams.set('due_soon_days', String(params.due_soon_days));
  }
  if (params?.stale_days) {
    searchParams.set('stale_days', String(params.stale_days));
  }
  if (params?.limit) {
    searchParams.set('limit', String(params.limit));
  }
  const queryString = searchParams.toString();
  const url = `/alerts/${queryString ? `?${queryString}` : ''}`;
  return apiClient<AlertsResponse>(url);
}

// ========================================
// P2: Excel Export APIs
// ========================================

/**
 * Export MWO as Excel
 * GET /sample-runs/{id}/export-mwo/
 */
export async function exportMWO(runId: string): Promise<Blob> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2'}/sample-runs/${runId}/export-mwo/`, {
    method: 'GET',
    headers: {
      // Add auth headers if needed
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export MWO');
  }

  return response.blob();
}

/**
 * Export Estimate as Excel
 * GET /sample-runs/{id}/export-estimate/
 */
export async function exportEstimate(runId: string): Promise<Blob> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2'}/sample-runs/${runId}/export-estimate/`, {
    method: 'GET',
    headers: {
      // Add auth headers if needed
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export Estimate');
  }

  return response.blob();
}

/**
 * Export T2 PO as Excel
 * GET /sample-runs/{id}/export-po/
 */
export async function exportPO(runId: string): Promise<Blob> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2'}/sample-runs/${runId}/export-po/`, {
    method: 'GET',
    headers: {
      // Add auth headers if needed
    },
  });

  if (!response.ok) {
    throw new Error('Failed to export PO');
  }

  return response.blob();
}

/**
 * Helper function to trigger file download
 * Creates a temporary link and clicks it to download the blob
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==================== P3: PDF Export Functions ====================

/**
 * Export MWO as PDF
 * GET /sample-runs/{id}/export-mwo-pdf/
 */
export async function exportMWOPDF(runId: string): Promise<Blob> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2'}/sample-runs/${runId}/export-mwo-pdf/`,
    { method: 'GET' }
  );

  if (!response.ok) {
    throw new Error('Failed to export MWO PDF');
  }

  return response.blob();
}

/**
 * Export Estimate as PDF
 * GET /sample-runs/{id}/export-estimate-pdf/
 */
export async function exportEstimatePDF(runId: string): Promise<Blob> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2'}/sample-runs/${runId}/export-estimate-pdf/`,
    { method: 'GET' }
  );

  if (!response.ok) {
    throw new Error('Failed to export Estimate PDF');
  }

  return response.blob();
}

/**
 * Export T2 PO as PDF
 * GET /sample-runs/{id}/export-po-pdf/
 */
export async function exportPOPDF(runId: string): Promise<Blob> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2'}/sample-runs/${runId}/export-po-pdf/`,
    { method: 'GET' }
  );

  if (!response.ok) {
    throw new Error('Failed to export PO PDF');
  }

  return response.blob();
}

/**
 * Export Complete MWO as PDF (Tech Pack + BOM + Spec with translations)
 * GET /sample-runs/{id}/export-mwo-complete-pdf/
 *
 * @param runId - Sample Run ID
 * @param includeTechpack - Whether to include Tech Pack pages (default: true)
 */
export async function exportMWOCompletePDF(
  runId: string,
  includeTechpack: boolean = true
): Promise<Blob> {
  const params = new URLSearchParams();
  params.set('include_techpack', String(includeTechpack));

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2'}/sample-runs/${runId}/export-mwo-complete-pdf/?${params.toString()}`,
    { method: 'GET' }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to export complete MWO PDF');
  }

  return response.blob();
}


/**
 * Batch export multiple SampleRuns to ZIP
 * POST /sample-runs/batch-export/
 */
export async function batchExportSampleRuns(
  runIds: string[],
  exportTypes: string[] = ['mwo', 'estimate', 'po'],
  format: 'pdf' | 'excel' = 'pdf'
): Promise<Blob> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v2'}/sample-runs/batch-export/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        run_ids: runIds,
        export_types: exportTypes,
        format: format,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to batch export');
  }

  return response.blob();
}


// ==================== P9: Scheduler/Gantt API ====================

export interface SchedulerRunItem {
  id: string;
  run_no: number;
  run_type: string;
  run_type_label: string;
  status: string;
  status_label: string;
  progress: number;
  color: string;
  start_date: string | null;
  target_due_date: string | null;
  is_overdue: boolean | null;
  days_until_due: number | null;
  quantity: number;
  brand_name: string | null;
  priority: string;
}

export interface SchedulerStyleItem {
  id: string;
  style_number: string;
  style_name: string;
  runs_count: number;
  progress: number;
  is_overdue: boolean;
  earliest_due: string | null;
  latest_due: string | null;
  runs: SchedulerRunItem[];
}

export interface SchedulerResponse {
  styles?: SchedulerStyleItem[];
  runs?: (SchedulerRunItem & { style: { id: string; style_number: string; style_name: string } | null })[];
  pagination: {
    page: number;
    page_size: number;
    total_pages: number;
    total_count: number;
  };
  date_range: {
    start: string;
    end: string;
  };
  status_colors: Record<string, string>;
  meta: {
    as_of: string;
    view: 'style' | 'run';
  };
}

export interface SchedulerFilters {
  view?: 'style' | 'run';
  start_date?: string;
  end_date?: string;
  search?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

/**
 * Get Scheduler/Gantt data
 * GET /scheduler/
 */
export async function fetchSchedulerData(params?: SchedulerFilters): Promise<SchedulerResponse> {
  const searchParams = new URLSearchParams();

  if (params?.view) searchParams.set('view', params.view);
  if (params?.start_date) searchParams.set('start_date', params.start_date);
  if (params?.end_date) searchParams.set('end_date', params.end_date);
  if (params?.search) searchParams.set('search', params.search);
  if (params?.status) searchParams.set('status', params.status);
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.page_size) searchParams.set('page_size', String(params.page_size));

  const queryString = searchParams.toString();
  const url = `/scheduler/${queryString ? `?${queryString}` : ''}`;

  return apiClient<SchedulerResponse>(url);
}


// ==================== P18: Progress Dashboard API ====================

export interface StatusCount {
  count: number;
  label: string;
  progress?: number;
  color?: string;
}

export interface ProgressAlert {
  type: 'error' | 'warning' | 'info';
  category: 'sample' | 'procurement' | 'production';
  title: string;
  description: string;
}

export interface ProgressDashboardResponse {
  sample_progress: {
    by_status: Record<string, StatusCount>;
    overdue: number;
    due_soon: number;
  };
  quotation_progress: {
    by_status: Record<string, StatusCount>;
    by_type: { sample: number; bulk: number };
    pending: number;
  };
  procurement_progress: {
    by_status: Record<string, StatusCount>;
    overdue_deliveries: number;
    due_soon_deliveries: number;
  };
  production_progress: {
    by_status: Record<string, StatusCount>;
    overdue: number;
  };
  material_progress: {
    by_status: Record<string, StatusCount>;
  };
  summary: {
    total_samples: number;
    active_samples: number;
    total_quotes: number;
    pending_quotes: number;
    total_po: number;
    active_po: number;
    total_prod_orders: number;
    active_prod_orders: number;
  };
  alerts: ProgressAlert[];
  meta: {
    as_of: string;
    days_ahead: number;
    style_filter: string | null;
  };
}

/**
 * P18: Get unified progress dashboard data
 * GET /progress-dashboard/
 */
export async function fetchProgressDashboard(params?: {
  style_id?: string;
  days_ahead?: number;
}): Promise<ProgressDashboardResponse> {
  const searchParams = new URLSearchParams();

  if (params?.style_id) searchParams.set('style_id', params.style_id);
  if (params?.days_ahead) searchParams.set('days_ahead', String(params.days_ahead));

  const queryString = searchParams.toString();
  const url = `/progress-dashboard/${queryString ? `?${queryString}` : ''}`;

  return apiClient<ProgressDashboardResponse>(url);
}
