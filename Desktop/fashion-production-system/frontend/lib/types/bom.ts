/**
 * BOM (Bill of Materials) Types
 */

export type BOMCategory = 'fabric' | 'trim' | 'packaging' | 'label';

export type ConsumptionMaturity = 'unknown' | 'pre_estimate' | 'confirmed' | 'locked';

export type MaterialStatus =
  | 'Pending Submission'
  | 'Pending Approval'
  | 'Approved'
  | 'Approved with Limitations'
  | 'Rejected'
  | 'Discontinued';

export type TranslationStatus = 'pending' | 'confirmed';

export interface BOMItem {
  id: string;
  revision: string;
  item_number: number;
  category: BOMCategory;
  category_display: string;
  material_name: string;
  supplier: string;
  supplier_article_no: string | null;
  color: string;
  color_code: string;
  material_status: string | null;
  consumption: string; // Decimal as string
  consumption_maturity: ConsumptionMaturity;
  consumption_maturity_display: string;
  unit: string;
  placement: string[];
  wastage_rate: string; // Decimal as string
  unit_price: string | null; // Decimal as string
  leadtime_days: number | null;
  ai_confidence: number | null;
  is_verified: boolean;
  // Translation fields
  material_name_zh?: string;
  description_zh?: string;
  translation_status?: TranslationStatus;
  translated_at?: string;
  translated_by?: string;
}

export interface BOMListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BOMItem[];
}

export interface UpdateBOMItemPayload {
  supplier_article_no?: string;
  material_status?: string;
  consumption?: string;
  unit_price?: string;
  leadtime_days?: number;
  wastage_rate?: string;
  is_verified?: boolean;
  // Translation fields
  material_name_zh?: string;
  description_zh?: string;
  translation_status?: TranslationStatus;
}

export interface TranslateBatchResponse {
  success: boolean;
  translated_count: number;
  skipped_count: number;
  error_count: number;
  errors?: string[];
}
