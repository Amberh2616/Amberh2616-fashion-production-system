# DATABASE-SCHEMA_v2.2.1_COMPLETE
**Last Updated:** 2025-12-17  
**DB:** PostgreSQL 15 (UUID PKs)  
**Backend:** Django 4.2 + DRF + Celery + Redis  
**Storage:** MinIO (dev) / S3 (prod)  
**Goal:** 一人可管 300+ 款：資料夾匯入 → AI 解析 → 人工審核 → 核可 → 生成 MWO/PO（RFQ/Production）→ 批次操作

---

## 0) 本版重點（你剛剛確認的「用量成熟度生命周期」已落地）

### 0.1 用量成熟度生命周期（Consumption Maturity Lifecycle）
> 用量不可能一次到位，所以系統必須原生支援「估算 → 確認 → 鎖定」。

**Stage 0: `unknown`**（Tech Pack 沒給 / 無法算）  
**Stage 1: `pre_estimate`**（RFQ/報價用）  
- 主料：類似款參考值（2.0–2.5 yd/pc）或人工估
- 副料：規則庫估算（elastic = opening + overlap + shrinkage）

**Stage 2: `confirmed`**  
- 主料：Marker Report 回填（可 per size + 加權平均）
- 副料：樣衣實測表單回填

**Stage 3: `locked`**（PP 前手動鎖定，用於 Production PO）  
- locked 後禁止修改（除非 unlock 並記錄理由/權限）

### 0.2 Gating（採購單生成門檻）
- **RFQ PO：允許任何狀態**（unknown / pre_estimate / confirmed / locked）  
- **Production PO：必須 confirmed 或 locked**
  - fabric：必須有 marker 或等價證據（confirmed/locked）
  - trim：必須樣衣實測或可接受規則庫 + 人工 verify（confirmed/locked）

### 0.3 Phase 1 MVP 的「自動化」取捨（安全落地）
- PO 重算：Phase 1 **手動按鈕觸發**（後端 Celery）
- PDF 生成：**非同步 Celery**（API 回 `generating`）
- Issues：只用 **DraftReviewItem** 一張表（避免 ExtractionIssue 重複）

---

## 1) ERD（Mermaid）— v2.2.1 COMPLETE

```mermaid
erDiagram
  ORGANIZATION ||--o{ USER : has

  ORGANIZATION ||--o{ STYLE : owns
  STYLE ||--o{ STYLE_REVISION : versions
  STYLE_REVISION ||--o{ DOCUMENT : files

  ORGANIZATION ||--o{ SUPPLIER : manages
  ORGANIZATION ||--o{ FACTORY : manages
  ORGANIZATION ||--o{ MATERIAL : catalogs

  STYLE_REVISION ||--o{ BOM_ITEM : template_bom
  STYLE_REVISION ||--o{ MEASUREMENT : spec
  STYLE_REVISION ||--o{ CONSTRUCTION_STEP : construction

  STYLE_REVISION ||--o{ EXTRACTION_RUN : parsing_runs
  EXTRACTION_RUN ||--o{ AI_EXTRACTION_LOG : ai_calls
  EXTRACTION_RUN ||--o{ DRAFT_REVIEW_ITEM : issues

  ORGANIZATION ||--o{ SALES_ORDER : has
  SALES_ORDER ||--o{ SALES_ORDER_ITEM : items
  SALES_ORDER_ITEM }o--|| STYLE : references
  SALES_ORDER_ITEM }o--|| STYLE_REVISION : uses_approved_revision

  SALES_ORDER_ITEM ||--o{ ORDERITEM_BOM : order_level_bom
  ORDERITEM_BOM }o--|| BOM_ITEM : from_template
  ORDERITEM_BOM }o--|| MATERIAL : material
  ORDERITEM_BOM }o--|| SUPPLIER : supplier
  ORDERITEM_BOM }o--|| DOCUMENT : evidence_doc

  SALES_ORDER_ITEM ||--o{ MARKER_REPORT : marker_reports
  MARKER_REPORT }o--|| DOCUMENT : file_doc

  SALES_ORDER_ITEM ||--o{ SAMPLE_TRIM_MEASUREMENT : trim_measures
  SAMPLE_TRIM_MEASUREMENT }o--|| USER : measured_by
  SAMPLE_TRIM_MEASUREMENT }o--|| DOCUMENT : evidence_photos

  ORGANIZATION ||--o{ TRIM_CONSUMPTION_RULE : rule_library

  SALES_ORDER_ITEM ||--o{ MANUFACTURING_ORDER : generates
  MANUFACTURING_ORDER }o--|| DOCUMENT : mwo_pdf

  SALES_ORDER_ITEM ||--o{ PURCHASE_ORDER : generates
  PURCHASE_ORDER ||--o{ PURCHASE_ORDER_LINE : lines
  PURCHASE_ORDER }o--|| SUPPLIER : supplier
  PURCHASE_ORDER_LINE }o--|| ORDERITEM_BOM : based_on

  ORGANIZATION ||--o{ BATCH_RUN : batch_jobs
  BATCH_RUN ||--o{ BATCH_RUN_ITEM : items
```

---

## 2) Core Tables & Fields（含約束、索引、狀態）

> 以下用「DB 欄位」描述為主，Django model 可直接照此落地。  
> 所有 PK：UUID；所有表都有 `organization_id`（未來 multi-tenant 需要就直接開）。

### 2.1 Style / Revision / Document

#### `style`
- `id` UUID PK
- `organization_id` FK
- `style_number` (index)
- `style_name`
- `season` (index)
- `customer` (index)
- `status` (`active/archived`)
- `created_at`, `updated_at`
Constraints:
- unique `(organization_id, style_number, season, customer)`

#### `style_revision`
- `id` UUID PK
- `organization_id` FK
- `style_id` FK
- `revision_label` (index) — Rev A / Rev B
- `status` (`uploaded/parsing/draft/approved/superseded/failed`)
- `file_hash` (index)
- `previous_revision_id` FK self nullable
- `ai_extraction_raw` JSONB nullable
- `ai_confidence` float nullable
- `detected_changes` JSONB nullable
- `verified_by_id`, `verified_at`
- `created_at`
Constraints:
- unique `(organization_id, style_id, revision_label)`
Indexes:
- `(organization_id, style_id, status)`
- `(organization_id, status, created_at)`
- `(organization_id, file_hash)`

#### `document`
- `id` UUID PK
- `organization_id` FK
- `revision_id` FK nullable（有些屬於 order_item 的文件可以不綁 revision）
- `sales_order_item_id` FK nullable（marker / mwo / po 會用到）
- `doc_type` (index): techpack/bom/spec/construction/artwork/marker_report/sample_photo/fit_comment/mwo_pdf/po_pdf/annotated_zh_pdf/other
- `filename`, `storage_key`, `mime_type`
- `file_hash` (index), `file_size`, `page_count`
- `ocr_metadata` JSONB nullable
- `created_at`
Indexes:
- `(organization_id, revision_id, doc_type)`
- `(organization_id, sales_order_item_id, doc_type)`
- `(organization_id, file_hash)`

---

### 2.2 Template Data（Revision Level）— BOM/Spec/Construction

#### `bom_item`（Revision 模板 BOM）
> 模板層可以存「參考估算」與「規則」，但真正下單用量在 OrderItemBOM。

Core fields:
- `id` UUID PK
- `organization_id`
- `revision_id` FK
- `line_no` int
- `category` (index) `fabric/trim/label/packaging/other`
- `material_id` FK nullable（字典化後可填）
- `raw_material_name` text（AI 從 PDF 抓到的原文）
- `supplier_id` FK nullable
- `color`, `color_code`
- `notes`
- `ai_confidence` float, `is_verified` bool

Template consumption (optional):
- `estimated_consumption` decimal nullable（參考值）
- `consumption_uom` text nullable（例如 `yd/pc`, `m/pc`, `pcs/pc`）

Trim rule hooks (optional):
- `consumption_method` enum:
  - `manual`
  - `fixed_per_pc`
  - `rule_based`
  - `marker_report` (通常只用在 fabric template 標記，不直接算)
  - `sample_measurement`
- `consumption_rule` JSONB nullable（rule_based 的規則定義）

Constraints:
- unique `(revision_id, line_no)`
Indexes:
- `(organization_id, revision_id, category)`
- `(organization_id, supplier_id)`
- `(organization_id, material_id)`

#### `measurement`
- `id`, `organization_id`, `revision_id`
- `point_code` nullable, `point_name` (index)
- `values` JSONB（如 `{"XS":40,"S":42}`）
- `unit` (`cm/inch`)
- `tolerance_plus`, `tolerance_minus`
- `ai_confidence`, `is_verified`
Constraints:
- unique `(revision_id, point_name)`

#### `construction_step`
- `id`, `organization_id`, `revision_id`
- `step_no` (index), `title`
- `instruction` text（工廠中文指示）
- `machine_type`, `qc_point`
- `ai_confidence`, `is_verified`
Constraints:
- unique `(revision_id, step_no)`

---

## 3) Parsing / AI Governance（可追溯、可審核）

#### `extraction_run`
= 一次完整解析任務容器（包含多策略、多次 AI 呼叫）
- `id`, `organization_id`, `revision_id`
- `pipeline_name` (default/default_ocr/vision_fallback)
- `status` (`pending/running/completed/failed/cancelled`)
- `requested_sections` JSONB
- `strategies` JSONB（實際跑了哪些策略）
- `started_at`, `finished_at`
- `created_by_id`, `meta` JSONB
Indexes:
- `(organization_id, revision_id, status)`
- `(organization_id, status, started_at)`

#### `ai_extraction_log`
- `id`, `organization_id`, `run_id`, `revision_id`
- `extraction_type` (index): bom/measurement/construction/translate/ocr/plan
- `model_name`, `prompt_version`
- `input_digest` JSONB
- `output` JSONB, `confidence` float, `issues` JSONB
- `processing_time_ms`, `api_cost_usd`
- `error`, `retry_of_id`
- `created_at`
Indexes:
- `(organization_id, run_id)`
- `(organization_id, revision_id)`
- `(organization_id, extraction_type)`
- `(organization_id, created_at)`

#### `draft_review_item`（唯一 Issue 表）
- `id`, `organization_id`, `revision_id`
- `run_id` nullable（是哪次解析跑出的）
- `status` (`open/applied/resolved/ignored/rejected`)
- `severity` (`error/warn/info`)
- `title`, `message`
- `entity_type`, `entity_id`, `field_path`
- `change_plan` JSONB（patches/suggestions/evidence）
- `created_by_ai_log_id`, `resolved_by_id`, `resolved_at`, `created_at`
Indexes:
- `(organization_id, status, severity)`
- `(organization_id, revision_id, status)`
- `(organization_id, run_id)`

---

## 4) Orders / ERP Lite（下單、生成製造單、採購單）

#### `sales_order`
- `id`, `organization_id`
- `order_no` (index, unique per org)
- `customer` (index), `season` (index)
- `status` (`open/closed/cancelled`)
- `created_at`

#### `sales_order_item`
- `id`, `organization_id`
- `sales_order_id` FK
- `style_id` FK
- `approved_revision_id` FK（必須 revision.status=approved）
- `colorway`
- `total_qty` int
- `size_breakdown` JSONB
- `factory_id` FK nullable
- `delivery_date` date nullable
- `status` (`planning/sampling/bulk/shipped`)
- `created_at`, `updated_at`
Indexes:
- `(organization_id, sales_order_id)`
- `(organization_id, style_id)`
- `(organization_id, status)`

---

## 5) ⭐ OrderItemBOM（訂單級用量成熟度，核心表）

#### `orderitem_bom`
**Purpose:** 把模板 BOMItem 轉成「訂單實際用料」，支援 `unknown → pre_estimate → confirmed → locked`。

Identity & mapping:
- `id`, `organization_id`
- `sales_order_item_id` FK
- `bom_item_id` FK（模板）
- `line_no` int（訂單內排序）
- `category` (index)
- `material_id` FK nullable
- `supplier_id` FK nullable
- `raw_material_name` text（可複製模板，允許訂單層改名）
- `color`, `color_code`

**Three-value fields（避免覆寫、保留歷史）：**
- `pre_estimate_value` decimal nullable
- `confirmed_value` decimal nullable
- `locked_value` decimal nullable
- `consumption_uom` text

Lifecycle:
- `consumption_status` enum: `unknown/pre_estimate/confirmed/locked`
- `consumption_source` text:
  - `rule_based` / `marker_report` / `sample_measurement` / `manual` / `template`

Evidence / traceability:
- `marker_document_id` FK document nullable（主料 marker）
- `sample_trim_measurement_id` FK nullable（副料實測）
- `evidence_document_id` FK document nullable（泛用證據）

Commercial:
- `wastage_rate` decimal default 5.0
- `unit_price` decimal nullable
- `currency` text

Cache:
- `calculated_total_qty` decimal nullable（可選，做快取）

Verify & lock:
- `is_verified` bool default false
- `verified_by_id`, `verified_at`
- `locked_by_id`, `locked_at`, `lock_reason`

Audit:
- `notes`
- `created_at`, `updated_at`

Constraints:
- unique `(sales_order_item_id, bom_item_id)`（一個訂單 item 對應一條模板 BOM）

Indexes（必做）：
- `(organization_id, sales_order_item_id)`
- `(organization_id, consumption_status)`
- `(organization_id, category, consumption_status)`
- `(organization_id, supplier_id)`
- `(organization_id, material_id)`

---

## 6) MarkerReport（主料用量回填）

#### `marker_report`
- `id`, `organization_id`
- `sales_order_item_id` FK
- `document_id` FK document（doc_type=marker_report）
- `file_type` (`csv/excel/pdf`)

Parse:
- `parse_status` (`pending/parsing/completed/failed`)
- `parsed_data` JSONB (包含 per size + weighted_avg + efficiency 等)
- `parse_method` (`rule_based/ai_vision`)
- `parse_cost_usd` decimal nullable

Backfill:
- `backfill_status` (`not_started/completed/failed`)
- `backfill_log` JSONB（逐條回填紀錄）

Timestamps:
- `created_at`, `updated_at`

Indexes:
- `(organization_id, sales_order_item_id, parse_status)`
- `(organization_id, created_at)`

---

## 7) SampleTrimMeasurement（副料實測回填）

#### `sample_trim_measurement`
- `id`, `organization_id`
- `sales_order_item_id` FK
- `measured_by_id` FK user
- `measured_at`
- `measurements` JSONB（陣列：bom_item_id、measured_value、uom、notes、photo doc ids）
- `backfill_status` (`pending/completed/partial`)
- `backfill_log` JSONB
- `created_at`, `updated_at`

---

## 8) TrimConsumptionRule（副料規則庫）

#### `trim_consumption_rule`
- `id`, `organization_id`
- `rule_name` (index, unique per org)
- `material_category` (elastic/binding/tape/label/button/...)
- `description`
- `rule_type` (`fixed_qty/formula`)

Fixed:
- `fixed_qty`, `fixed_uom`

Formula:
- `formula` text（例如 `waist_opening + overlap + shrinkage_allowance`）
- `formula_params` JSONB（overlap、shrinkage...）
- `required_measurement_points` JSONB list

Stats:
- `usage_count`
- `avg_accuracy` float nullable（Phase 2：與實測比誤差）

Control:
- `is_active`
- `created_at`, `updated_at`

---

## 9) MWO / PO（文件化輸出）

#### `manufacturing_order`
- `id`, `organization_id`
- `sales_order_item_id` OneToOne FK
- `factory_id` FK nullable
- `status` (`draft/generating/approved/issued/failed`)
- `snapshot` JSONB（鎖定 revision + orderitem_bom + spec + construction）
- `pdf_document_id` FK document（doc_type=mwo_pdf）
- `created_at`, `updated_at`

#### `purchase_order`
- `id`, `organization_id`
- `sales_order_item_id` FK
- `supplier_id` FK nullable（null=UNASSIGNED）
- `po_type` (`rfq/production`)
- `status` (`draft/generating/approved/issued/failed/cancelled`)
- `snapshot` JSONB
- `pdf_document_id` FK document（doc_type=po_pdf）
- `created_at`, `updated_at`

#### `purchase_order_line`
- `id`, `organization_id`
- `purchase_order_id` FK
- `orderitem_bom_id` FK
- `description`
- `qty`, `uom`
- `unit_price`, `currency`
- `meta` JSONB（rounding、moq、leadtime）

---

## 10) Batch Jobs（300 款批次）

#### `batch_run`
- `id`, `organization_id`
- `batch_type` (`parse/generate_mwo/generate_po_drafts/...`)
- `status` (`queued/running/completed/failed/cancelled`)
- `concurrency_limit` default 5
- `retry_limit` default 2
- `params` JSONB
- `created_by_id`
- `started_at`, `finished_at`, `created_at`

#### `batch_run_item`
- `id`, `organization_id`
- `batch_run_id` FK
- `target_type` (`revision/sales_order_item/...`)
- `target_id`
- `status` (`queued/running/completed/failed/skipped`)
- `attempts`, `error`, `result` JSONB
- `started_at`, `finished_at`

---

## 11) Workflows（落地流程）

### 11.1 建 SalesOrderItem → 生成 OrderItemBOM
1. 建立 SalesOrderItem  
2. 複製 approved_revision 的 BOMItem → OrderItemBOM  
3. 套用「模板估算」或「規則庫」→ 寫入 `pre_estimate_value`（若能算）  
4. 任何缺欄位/低信心 → 產生 DraftReviewItem

### 11.2 Marker Report → 回填主料 confirmed
- 解析完成 → 更新 `confirmed_value` + status=`confirmed` + source=`marker_report`  
- Phase 1：提示你按「Recalculate PO」

### 11.3 樣衣副料實測 → 回填 trim confirmed
- 更新 `confirmed_value` + status=`confirmed` + source=`sample_measurement`

### 11.4 生成 PO Draft（RFQ / Production gating）
- RFQ：可用 pre_estimate；若 active 值 None → 開 issue  
- Production：fabric/trim 必須 confirmed/locked，否則阻擋並提示先補證據

### 11.5 Lock（PP 前）
- 手動 lock：把 active value 也寫入 `locked_value`，並記錄 lock user/time/reason

---

## 12) SQL Examples（常用查詢）

### 12.1 找出某季所有「缺用量」訂單物料
```sql
SELECT soi.id AS sales_order_item_id, s.style_number, oib.id AS orderitem_bom_id, oib.raw_material_name
FROM orderitem_bom oib
JOIN sales_order_item soi ON soi.id = oib.sales_order_item_id
JOIN style s ON s.id = soi.style_id
WHERE soi.organization_id = %(org)s
  AND s.season = %(season)s
  AND oib.consumption_status IN ('unknown')
ORDER BY s.style_number;
```

### 12.2 找出 Production gating 不合格的 fabric
```sql
SELECT s.style_number, oib.raw_material_name, oib.consumption_status
FROM orderitem_bom oib
JOIN sales_order_item soi ON soi.id = oib.sales_order_item_id
JOIN style s ON s.id = soi.style_id
WHERE oib.organization_id = %(org)s
  AND oib.category = 'fabric'
  AND oib.consumption_status NOT IN ('confirmed','locked');
```

### 12.3 Review Queue（open 且 severity=error）
```sql
SELECT dri.id, dri.title, dri.message, sr.revision_label, s.style_number
FROM draft_review_item dri
JOIN style_revision sr ON sr.id = dri.revision_id
JOIN style s ON s.id = sr.style_id
WHERE dri.organization_id = %(org)s
  AND dri.status = 'open'
  AND dri.severity = 'error'
ORDER BY dri.created_at DESC;
```

---

## 13) Migration Notes（v2.2.1 → 本 COMPLETE）

### 13.1 新增表
- `marker_report`
- `sample_trim_measurement`
- `trim_consumption_rule`

### 13.2 修改表
- `orderitem_bom` 新增：`pre_estimate_value/confirmed_value/locked_value`、marker/實測關聯  
- `bom_item` 新增：`estimated_consumption`、`consumption_method`、`consumption_rule`  
- `document` 建議加：`sales_order_item_id`（marker/mwo/po 更好追）

---

## 14) 結論
你提出的「Unknown → Pre-Estimate → Confirmed → Locked」是服裝跟單系統最關鍵、也最現實的設計。
本版 schema 已完整支援：
- 多來源用量（規則庫/marker/實測/人工）
- 證據追溯（documents + logs）
- gating（RFQ vs Production）
- 批次作業（300 款）
- 之後再擴充 sample flow（Phase 2）也不會打架
