/**
 * Production Order API Client
 */

import { apiClient } from "./client";
import type {
  ProductionOrder,
  ProductionOrderDetail,
  ProductionOrderListResponse,
  CreateProductionOrderPayload,
  UpdateProductionOrderPayload,
  CalculateMRPPayload,
  CalculateMRPResponse,
  GeneratePOPayload,
  GeneratePOResponse,
  ProductionOrderStats,
  RequirementsSummary,
  MaterialRequirement,
  MaterialRequirementListResponse,
} from "../types/production-order";

const BASE_URL = "/api/v2/production-orders";
const REQUIREMENTS_URL = "/api/v2/material-requirements";

// ============================================================================
// Production Order API
// ============================================================================

export interface ProductionOrderListParams {
  page?: number;
  page_size?: number;
  status?: string;
  customer?: string;
  style_revision?: string;
  search?: string;
  ordering?: string;
}

export async function getProductionOrders(
  params: ProductionOrderListParams = {}
): Promise<ProductionOrderListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.page_size) searchParams.set("page_size", params.page_size.toString());
  if (params.status) searchParams.set("status", params.status);
  if (params.customer) searchParams.set("customer", params.customer);
  if (params.style_revision) searchParams.set("style_revision", params.style_revision);
  if (params.search) searchParams.set("search", params.search);
  if (params.ordering) searchParams.set("ordering", params.ordering);

  const url = searchParams.toString()
    ? `${BASE_URL}/?${searchParams.toString()}`
    : `${BASE_URL}/`;
  return apiClient.get<ProductionOrderListResponse>(url);
}

export async function getProductionOrder(id: string): Promise<ProductionOrderDetail> {
  return apiClient.get<ProductionOrderDetail>(`${BASE_URL}/${id}/`);
}

export async function createProductionOrder(
  data: CreateProductionOrderPayload
): Promise<ProductionOrder> {
  return apiClient.post<ProductionOrder>(`${BASE_URL}/`, data);
}

export async function updateProductionOrder(
  id: string,
  data: UpdateProductionOrderPayload
): Promise<ProductionOrder> {
  return apiClient.patch<ProductionOrder>(`${BASE_URL}/${id}/`, data);
}

export async function deleteProductionOrder(id: string): Promise<void> {
  return apiClient.delete(`${BASE_URL}/${id}/`);
}

// ============================================================================
// Production Order Actions
// ============================================================================

export async function calculateMRP(
  id: string,
  payload: CalculateMRPPayload = {}
): Promise<CalculateMRPResponse> {
  return apiClient.post<CalculateMRPResponse>(
    `${BASE_URL}/${id}/calculate-mrp/`,
    payload
  );
}

export async function generatePO(
  id: string,
  payload: GeneratePOPayload = {}
): Promise<GeneratePOResponse> {
  return apiClient.post<GeneratePOResponse>(
    `${BASE_URL}/${id}/generate-po/`,
    payload
  );
}

export async function getRequirementsSummary(
  id: string
): Promise<RequirementsSummary> {
  return apiClient.get<RequirementsSummary>(
    `${BASE_URL}/${id}/requirements-summary/`
  );
}

export async function confirmProductionOrder(
  id: string
): Promise<{ status: string; message: string }> {
  return apiClient.post<{ status: string; message: string }>(
    `${BASE_URL}/${id}/confirm/`
  );
}

export async function getProductionOrderStats(): Promise<ProductionOrderStats> {
  return apiClient.get<ProductionOrderStats>(`${BASE_URL}/stats/`);
}

// ============================================================================
// Material Requirements API
// ============================================================================

export interface MaterialRequirementListParams {
  page?: number;
  page_size?: number;
  production_order?: string;
  status?: string;
  category?: string;
  search?: string;
  ordering?: string;
}

export async function getMaterialRequirements(
  params: MaterialRequirementListParams = {}
): Promise<MaterialRequirementListResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", params.page.toString());
  if (params.page_size) searchParams.set("page_size", params.page_size.toString());
  if (params.production_order) searchParams.set("production_order", params.production_order);
  if (params.status) searchParams.set("status", params.status);
  if (params.category) searchParams.set("category", params.category);
  if (params.search) searchParams.set("search", params.search);
  if (params.ordering) searchParams.set("ordering", params.ordering);

  const url = searchParams.toString()
    ? `${REQUIREMENTS_URL}/?${searchParams.toString()}`
    : `${REQUIREMENTS_URL}/`;
  return apiClient.get<MaterialRequirementListResponse>(url);
}

export async function getMaterialRequirement(id: string): Promise<MaterialRequirement> {
  return apiClient.get<MaterialRequirement>(`${REQUIREMENTS_URL}/${id}/`);
}

export async function updateMaterialRequirementStock(
  id: string,
  currentStock: number
): Promise<{ id: string; current_stock: number; order_quantity_needed: number; message: string }> {
  return apiClient.patch<{ id: string; current_stock: number; order_quantity_needed: number; message: string }>(
    `${REQUIREMENTS_URL}/${id}/update-stock/`,
    { current_stock: currentStock }
  );
}
