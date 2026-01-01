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
 * GET /sample-runs/?sample_request_id=uuid
 */
export async function fetchSampleRuns(params?: {
  sample_request_id?: string;
}): Promise<SampleRun[]> {
  const searchParams = new URLSearchParams();

  if (params?.sample_request_id) {
    searchParams.set('sample_request_id', params.sample_request_id);
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
