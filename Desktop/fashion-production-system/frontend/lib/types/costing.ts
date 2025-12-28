/**
 * Costing Types - Phase 2-2
 */

export type CostingType = 'sample' | 'bulk';

export interface CostLine {
  id: number;
  bom_item: string;
  material_name: string;
  supplier: string;
  category: string;
  unit: string;
  consumption: string; // Decimal as string
  unit_price: string; // Decimal as string
  line_cost: string; // Decimal as string
  sort_order: number;
}

export interface CostSheet {
  id: number;
  revision: string; // UUID
  costing_type: CostingType;
  costing_type_display: string;
  version_no: number;
  is_current: boolean;

  // Cost inputs
  labor_cost: string;
  overhead_cost: string;
  freight_cost: string;
  packaging_cost: string;
  testing_cost: string;

  // Pricing params
  margin_pct: string;
  wastage_pct: string;

  // Calculated results
  material_cost: string;
  total_cost: string;
  unit_price: string;

  // Metadata
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CostSheetDetail extends CostSheet {
  lines: CostLine[];
}

export interface CostSheetListResponse {
  count: number;
  results: CostSheet[];
}

export interface GenerateCostSheetPayload {
  costing_type: CostingType;
  labor_cost?: string;
  overhead_cost?: string;
  freight_cost?: string;
  packaging_cost?: string;
  testing_cost?: string;
  margin_pct?: string;
  wastage_pct?: string;
  notes?: string;
}

export interface UpdateCostSheetPayload {
  labor_cost?: string;
  overhead_cost?: string;
  freight_cost?: string;
  packaging_cost?: string;
  testing_cost?: string;
  margin_pct?: string;
  wastage_pct?: string;
  notes?: string;
}

/**
 * Phase 2-2I: Duplicate CostSheet with new margin/wastage
 * Used for "pure negotiation" scenario (same BOM, different pricing stance)
 */
export interface DuplicateCostSheetPayload {
  margin_pct: string;
  wastage_pct: string;
  notes?: string;
}
