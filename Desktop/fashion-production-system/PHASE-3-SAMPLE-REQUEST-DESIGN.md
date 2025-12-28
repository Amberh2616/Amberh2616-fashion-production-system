# Phase 3: Sample Request System（樣衣請求系統）

**設計時間**：2025-12-28 20:30
**設計原則**：Request-based（請求驅動），不是 Flow-based（流程驅動）
**核心理念**：流程是結果，不是前提

---

## 🎯 Phase 3 定位（修正版）

> **Phase 3 = 管理「樣衣請求（Sample Requests）」與其執行結果**
>
> 流程由品牌需求決定，不由系統預設。

### 為什麼要從「流程」改成「請求」？

**❌ 舊思維（流程驅動）**：
- 系統預設：Proto → Fit → Sales
- 每個品牌都要走相同流程
- 第 2-3 個品牌就會爆炸（流程不符）

**✅ 新思維（請求驅動）**：
- 品牌提出樣衣需求（類型、數量、用途）
- 需求可能要先報價、才決定做不做
- 需求核准後：調料 → 製作 → 交付
- **流程是品牌需求的結果**

### Phase 3 解決的問題

1. **品牌提出樣衣需求**（類型不固定）
2. **需求可能要先報價**（有的品牌要先看成本）
3. **需求核准後執行**：
   - 調料（T2 PO for Sample）
   - 下製造單（Sample MWO）
   - 追蹤與交付
4. **支援各種場景**：
   - 直接 Sales Sample → Bulk PO
   - Proto → Fit → Bulk PO（無 Sales）
   - Proto only → 客戶否決
   - Photo sample ×2（只給行銷）
   - Wear Test / Marketing / Trade Show...

### Phase 3 不解決的問題（Phase 4+）

- ❌ Bulk PO（大貨訂單）
- ❌ Bulk MWO（大貨製造）
- ❌ PP Sample（通常在 Bulk PO 之後）

---

## 📐 核心模型設計

### 模型關係圖（文字版）

```
SampleRequest（樣衣請求）⭐ 核心
   │
   ├─→ SampleCostEstimate（樣衣報價）[0..N]
   │    └─ status: draft → sent → accepted/rejected
   │
   ├─→ T2POForSample（調料採購）[0..N]
   │    └─ T2POLineForSample（快照明細）[N]
   │
   ├─→ SampleMWO（製造單）[0..1]
   │    └─ bom_snapshot + construction_snapshot（JSON）
   │
   ├─→ Sample（實體樣衣）[0..N]
   │    └─ photos, feedback
   │
   └─→ SampleAttachment（附件/照片）[0..N]
```

---

## 📊 Database Schema

### 設計原則

1. **Phase 3 嚴禁 FK 指向 Phase 2**
   - ❌ 不得 `FK(BOMItem)`
   - ✅ 只能快照欄位或 JSON

2. **所有「生成文件」必須凍結來源**
   - `source_revision_id`（來源 Revision）
   - `snapshot_hash`（SHA256 of canonical JSON）
   - `snapshot_at`（快照時間）

3. **狀態欄位設計**
   - 用 `CharField choices` 或 enum
   - 保留 `status_updated_at`

---

### Table 1: `sample_requests`（樣衣請求）⭐ 核心

**用途**：承接品牌樣衣需求（request-based），可先報價再決定是否執行。

**Columns**：

```sql
id                    UUID PRIMARY KEY
revision_id           UUID NOT NULL REFERENCES style_revisions(id)
brand_name            VARCHAR(120)  -- 先用字串，未來可換 FK
request_type          VARCHAR(32) NOT NULL
request_type_custom   VARCHAR(80)  -- 當 request_type='custom' 必填
quantity_requested    INT NOT NULL DEFAULT 1 CHECK (>= 1)
size_set_json         JSONB  -- {"sizes":["S","M"], "notes":"..."}
purpose               TEXT  -- 用途說明
need_quote_first      BOOLEAN NOT NULL DEFAULT FALSE
priority              VARCHAR(16) NOT NULL DEFAULT 'normal'
due_date              DATE
status                VARCHAR(24) NOT NULL DEFAULT 'draft'
approval_status       VARCHAR(16) NOT NULL DEFAULT 'na'
notes_internal        TEXT
notes_customer        TEXT
brand_context_json    JSONB  -- 品牌客製欄位都塞這裡
created_by            UUID REFERENCES users(id)
created_at            TIMESTAMPTZ NOT NULL
updated_at            TIMESTAMPTZ NOT NULL
status_updated_at     TIMESTAMPTZ NOT NULL
```

**`request_type` Choices**（白名單 + custom）：
- 核心類：`proto, fit, sales, photo, marketing, wear_test`
- 特殊類：`material_test, color_approval, size_set, replacement`
- 展會類：`trade_show, counter, sealed`
- 擴充：`custom`（必填 `request_type_custom`）

**`status` 狀態機**：
```
draft（草稿）
  → quote_requested（需要報價且已送出）
  → quoted（已出報價）
  → approved（核准可執行）
  → in_execution（已開始執行 PO/MWO）
  → completed（交付完成）
  → rejected（客戶否決）
  → cancelled（取消）
```

**狀態轉移規則**：
- `need_quote_first=true`：draft → quote_requested → quoted → approved
- `need_quote_first=false`：draft → approved
- approved → in_execution：生成第一張 PO/MWO 時自動轉
- completed：至少 1 個 Sample delivered

**`approval_status` Choices**：
- `na`（不適用）
- `approved`（核准）
- `rejected`（拒絕）

**Constraints**：
```sql
CHECK (quantity_requested >= 1)
CHECK (request_type='custom' IMPLIES request_type_custom IS NOT NULL AND LENGTH(request_type_custom) > 0)
```

**Indexes**：
```sql
CREATE INDEX idx_sample_requests_revision_status ON sample_requests(revision_id, status);
CREATE INDEX idx_sample_requests_brand_status ON sample_requests(brand_name, status);
CREATE INDEX idx_sample_requests_due_date ON sample_requests(due_date);
CREATE INDEX idx_sample_requests_created_at ON sample_requests(created_at);
```

---

### Table 2: `sample_cost_estimates`（樣衣報價）

**用途**：樣衣報價/預估（可多版本），JSON 彈性應對不同品牌報價格式。

**Columns**：

```sql
id                         UUID PRIMARY KEY
sample_request_id          UUID NOT NULL REFERENCES sample_requests(id) ON DELETE CASCADE
estimate_version           INT NOT NULL  -- 從 1 起
status                     VARCHAR(16) NOT NULL DEFAULT 'draft'
currency                   CHAR(3) NOT NULL DEFAULT 'USD'
valid_until                DATE
estimated_total            NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (>= 0)
breakdown_snapshot_json    JSONB NOT NULL DEFAULT '{}'
source                     VARCHAR(16) NOT NULL DEFAULT 'manual'
source_revision_id         UUID  -- 冗餘記錄
snapshot_hash              VARCHAR(64)
created_by                 UUID REFERENCES users(id)
created_at                 TIMESTAMPTZ NOT NULL
updated_at                 TIMESTAMPTZ NOT NULL
```

**`status` Choices**：
- `draft, sent, accepted, rejected, expired`

**`source` Choices**：
- `manual`（手動建立）
- `from_phase2_costing`（從 Phase 2 Costing 複製）

**`breakdown_snapshot_json` 結構建議**：

```json
{
  "materials": [
    {"name": "Nulu Fabric", "qty": 2.64, "uom": "yd", "unit_price": 12, "subtotal": 31.68},
    {"name": "Elastic", "qty": 1.05, "uom": "yd", "unit_price": 3, "subtotal": 3.15}
  ],
  "labor": [
    {"name": "Cutting", "hours": 1.5, "rate": 10, "subtotal": 15},
    {"name": "Sewing", "hours": 4, "rate": 12, "subtotal": 48}
  ],
  "overhead": [
    {"name": "Pattern adjustment", "amount": 20},
    {"name": "Express shipping", "amount": 35}
  ],
  "notes": "Sample price includes rush fee."
}
```

**Constraints**：
```sql
UNIQUE (sample_request_id, estimate_version)
```

**Indexes**：
```sql
CREATE INDEX idx_estimates_request_status ON sample_cost_estimates(sample_request_id, status);
```

---

### Table 3: `t2pos_for_sample`（樣品調料 PO）

**用途**：樣品調料採購單（合約文件，不可漂移）。

**Columns**：

```sql
id                    UUID PRIMARY KEY
sample_request_id     UUID NOT NULL REFERENCES sample_requests(id)
estimate_id           UUID REFERENCES sample_cost_estimates(id)
po_no                 VARCHAR(40)  -- issued 後生成
supplier_name         VARCHAR(120) NOT NULL
status                VARCHAR(16) NOT NULL DEFAULT 'draft'
issued_at             TIMESTAMPTZ
confirmed_at          TIMESTAMPTZ
delivered_at          TIMESTAMPTZ
delivery_date         DATE
currency              CHAR(3) NOT NULL DEFAULT 'USD'
total_amount          NUMERIC(12,2) NOT NULL DEFAULT 0
notes                 TEXT
-- Snapshot provenance
source_revision_id    UUID NOT NULL
snapshot_at           TIMESTAMPTZ NOT NULL
snapshot_hash         VARCHAR(64) NOT NULL
```

**`status` Choices**：
- `draft, issued, confirmed, delivered, cancelled`

**Indexes**：
```sql
CREATE INDEX idx_t2po_sample_request_status ON t2pos_for_sample(sample_request_id, status);
CREATE INDEX idx_t2po_supplier_status ON t2pos_for_sample(supplier_name, status);
CREATE INDEX idx_t2po_po_no ON t2pos_for_sample(po_no);
CREATE INDEX idx_t2po_delivery_date ON t2pos_for_sample(delivery_date);
```

---

### Table 4: `t2po_lines_for_sample`（PO 明細）

**用途**：PO 明細（必須快照欄位，禁止 FK BOMItem）。

**Columns**：

```sql
id                      UUID PRIMARY KEY
t2po_id                 UUID NOT NULL REFERENCES t2pos_for_sample(id) ON DELETE CASCADE
line_no                 INT NOT NULL
material_name           VARCHAR(200) NOT NULL
supplier_article_no     VARCHAR(80)
uom                     VARCHAR(16) NOT NULL  -- yd, m, pcs
consumption_per_piece   NUMERIC(12,4) NOT NULL DEFAULT 0
wastage_pct             NUMERIC(6,4) NOT NULL DEFAULT 0  -- 0.10 = 10%
quantity_requested      NUMERIC(12,4) NOT NULL DEFAULT 0
unit_price              NUMERIC(12,4) NOT NULL DEFAULT 0
line_total              NUMERIC(12,2) NOT NULL DEFAULT 0
```

**計算公式**：
```
quantity_requested = quantity_requested × consumption_per_piece × (1 + wastage_pct)
line_total = quantity_requested × unit_price
```

**Wastage 預設規則**（可 line-level override）：
- Fabric/major: 10%
- Trims: 5%
- Labels/package: 0%

**Constraints**：
```sql
UNIQUE (t2po_id, line_no)
CHECK (wastage_pct >= 0)
CHECK (quantity_requested >= 0)
CHECK (unit_price >= 0)
```

**Indexes**：
```sql
CREATE INDEX idx_t2po_lines_t2po ON t2po_lines_for_sample(t2po_id);
CREATE INDEX idx_t2po_lines_material ON t2po_lines_for_sample(material_name);
```

---

### Table 5: `sample_mwos`（樣衣製造單）

**用途**：樣衣製造單（歷史指令，不可漂移）。

**Columns**：

```sql
id                           UUID PRIMARY KEY
sample_request_id            UUID NOT NULL REFERENCES sample_requests(id)
estimate_id                  UUID REFERENCES sample_cost_estimates(id)
mwo_no                       VARCHAR(40)
factory_name                 VARCHAR(120) NOT NULL
status                       VARCHAR(16) NOT NULL DEFAULT 'draft'
start_date                   DATE
due_date                     DATE
notes                        TEXT
-- Snapshots
source_revision_id           UUID NOT NULL
snapshot_at                  TIMESTAMPTZ NOT NULL
snapshot_hash                VARCHAR(64) NOT NULL
bom_snapshot_json            JSONB NOT NULL DEFAULT '[]'
construction_snapshot_json   JSONB NOT NULL DEFAULT '[]'
qc_snapshot_json             JSONB NOT NULL DEFAULT '{}'
```

**`status` Choices**：
- `draft, issued, in_progress, completed, cancelled`

**Constraints**：
```sql
UNIQUE (sample_request_id)  -- Phase 3 先限制 1 request 對 1 MWO
```

**Indexes**：
```sql
CREATE INDEX idx_mwo_factory_status ON sample_mwos(factory_name, status);
CREATE INDEX idx_mwo_due_date ON sample_mwos(due_date);
```

---

### Table 6: `samples`（實體樣衣）

**用途**：實體樣衣（可多件、多次迭代）。

**Columns**：

```sql
id                  UUID PRIMARY KEY
sample_request_id   UUID NOT NULL REFERENCES sample_requests(id)
sample_mwo_id       UUID REFERENCES sample_mwos(id)
physical_ref        VARCHAR(60)  -- 實體編號/包裹號
quantity_made       INT NOT NULL DEFAULT 1
status              VARCHAR(16) NOT NULL DEFAULT 'in_production'
received_date       DATE
delivered_date      DATE
customer_feedback   TEXT
fit_comments        TEXT
created_at          TIMESTAMPTZ NOT NULL
```

**`status` Choices**：
- `in_production, completed, delivered, rejected`

**Indexes**：
```sql
CREATE INDEX idx_samples_request_status ON samples(sample_request_id, status);
CREATE INDEX idx_samples_delivered_date ON samples(delivered_date);
```

---

### Table 7: `sample_attachments`（附件/照片）

**用途**：照片/附件。

**Columns**：

```sql
id                  UUID PRIMARY KEY
sample_request_id   UUID REFERENCES sample_requests(id)
sample_id           UUID REFERENCES samples(id)
file_url            TEXT NOT NULL
file_type           VARCHAR(24) NOT NULL  -- photo, pdf, other
caption             VARCHAR(200)
uploaded_by         UUID REFERENCES users(id)
uploaded_at         TIMESTAMPTZ NOT NULL
```

**Constraint**：
```sql
CHECK (sample_request_id IS NOT NULL OR sample_id IS NOT NULL)
```

---

## 🔌 API Specification

### 共用規則

1. **Phase 2 資料讀取限制**：
   - 只允許讀取：`is_verified=true AND translation_status='confirmed'`
   - 若無 confirmed 資料：回 `400 VALIDATION_ERROR`

2. **快照規則**：
   - 所有 generate 都要寫入 `snapshot_hash`（SHA256 of canonical JSON）
   - 快照後 Phase 2 修改不影響已生成文件

3. **錯誤格式**：
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "No confirmed BOM items found. Verify in Phase 2 first.",
    "details": {"revision_id": "..."}
  }
}
```

---

### A. SampleRequest API

#### 1. List SampleRequests

```http
GET /api/v3/revisions/{revision_id}/sample-requests
```

**Query Parameters**：
- `status`: 篩選狀態
- `type`: 篩選類型
- `due_from`, `due_to`: 日期範圍
- `q`: 搜尋（brand_name / notes）

**Response**：
```json
{
  "count": 10,
  "results": [
    {
      "id": "uuid",
      "brand_name": "Ridestore",
      "request_type": "fit",
      "request_type_display": "Fit Sample",
      "quantity_requested": 2,
      "need_quote_first": true,
      "status": "approved",
      "due_date": "2026-01-15",
      "created_at": "..."
    }
  ]
}
```

---

#### 2. Create SampleRequest

```http
POST /api/v3/revisions/{revision_id}/sample-requests
```

**Request**：
```json
{
  "brand_name": "Ridestore",
  "request_type": "fit",
  "request_type_custom": null,
  "quantity_requested": 2,
  "size_set_json": {"sizes": ["S", "M"]},
  "need_quote_first": true,
  "priority": "urgent",
  "due_date": "2026-01-15",
  "purpose": "Fit adjustment v2",
  "notes_internal": "..."
}
```

**Response**: Created SampleRequest (201)

---

#### 3. Get SampleRequest Detail

```http
GET /api/v3/sample-requests/{id}
```

**Response**：
```json
{
  "id": "uuid",
  "revision": {"id": "...", "style_number": "LW1FLPS", "revision_label": "Rev A"},
  "brand_name": "Ridestore",
  "request_type": "fit",
  "quantity_requested": 2,
  "status": "approved",
  "due_date": "2026-01-15",
  "need_quote_first": true,
  "priority": "urgent",
  "purpose": "...",
  "notes_internal": "...",
  "notes_customer": "...",

  // Related documents summary
  "estimates": [
    {"id": "...", "version": 1, "status": "accepted", "total": "120.00"}
  ],
  "t2pos": [
    {"id": "...", "po_no": "PO-001", "supplier_name": "ABC", "status": "delivered"}
  ],
  "mwos": [
    {"id": "...", "mwo_no": "MWO-001", "factory_name": "XYZ", "status": "completed"}
  ],
  "samples": [
    {"id": "...", "quantity_made": 2, "status": "delivered"}
  ],
  "attachments": [
    {"id": "...", "file_type": "photo", "file_url": "..."}
  ],

  "created_at": "...",
  "updated_at": "..."
}
```

---

#### 4. Update SampleRequest

```http
PATCH /api/v3/sample-requests/{id}
```

**Editable Fields**（根據狀態）：
- `draft`：幾乎都可改
- `approved` 以後：只允許 `notes_internal`, `notes_customer`, `due_date`, `priority`

**Request**：
```json
{
  "due_date": "2026-01-20",
  "notes_customer": "Client requested earlier delivery"
}
```

---

#### 5. Change SampleRequest Status

```http
POST /api/v3/sample-requests/{id}/status
```

**Request**：
```json
{
  "to_status": "approved"
}
```

**Rules**：
- `need_quote_first=true`：必須先有至少 1 張 `estimate.status=accepted` 才可 approved
- `approved → in_execution`：生成第一張 PO/MWO 時自動轉
- `completed`：至少 1 個 Sample delivered

**Errors**：
- `400 INVALID_STATUS_TRANSITION`
- `400 QUOTE_REQUIRED_BEFORE_APPROVAL`

---

### B. SampleCostEstimate API

#### 6. List Estimates

```http
GET /api/v3/sample-requests/{id}/estimates
```

---

#### 7. Create Estimate (Manual)

```http
POST /api/v3/sample-requests/{id}/estimates
```

**Request**：
```json
{
  "source": "manual",
  "currency": "USD",
  "valid_until": "2026-01-05",
  "breakdown_snapshot_json": {
    "materials": [...],
    "labor": [...],
    "overhead": [...]
  }
}
```

---

#### 8. Create Estimate from Phase 2 Costing

```http
POST /api/v3/sample-requests/{id}/estimates/from-phase2-costing
```

**Request**：
```json
{
  "cost_sheet_id": "uuid",
  "currency": "USD"
}
```

**Behavior**：
- 讀取 Phase 2 confirmed CostSheet（快照）
- 生成一張 estimate（status=draft）

**Errors**：
- `400 NO_CONFIRMED_COSTING_FOUND`

---

#### 9. Change Estimate Status

```http
POST /api/v3/estimates/{estimate_id}/status
```

**Request**：
```json
{
  "to_status": "sent"
}
```

**Allowed Transitions**：
- draft → sent → accepted/rejected
- accepted 之後不可修改 breakdown

---

### C. T2 PO for Sample API

#### 10. Preview T2 PO

```http
POST /api/v3/sample-requests/{id}/t2po/preview
```

**Request**：
```json
{
  "supplier_name": "ABC Fabric Co.",
  "estimate_id": null,
  "wastage_policy": "default",
  "overrides": [
    {"material_name": "Elastic Binding", "wastage_pct": 0.05}
  ]
}
```

**Response**（preview）：
```json
{
  "currency": "USD",
  "lines": [
    {
      "line_no": 1,
      "material_name": "Nulu Fabric",
      "uom": "yd",
      "consumption_per_piece": 1.2,
      "wastage_pct": 0.10,
      "quantity_requested": 2.64,
      "unit_price": 12,
      "line_total": 31.68
    }
  ],
  "total_amount": 120.00
}
```

**Rules**：
- 只從 confirmed BOM 取資料
- 若 unit_price 在 BOM 沒有：允許 preview 回 0，前端可讓使用者輸入後 commit

---

#### 11. Generate T2 PO

```http
POST /api/v3/sample-requests/{id}/t2po
```

**Request**：
```json
{
  "supplier_name": "ABC Fabric Co.",
  "estimate_id": null,
  "lines": [
    {
      "line_no": 1,
      "material_name": "Nulu Fabric",
      "uom": "yd",
      "consumption_per_piece": 1.2,
      "wastage_pct": 0.10,
      "quantity_requested": 2.64,
      "unit_price": 12
    }
  ]
}
```

**Behavior**：
- 生成 `t2pos_for_sample` + `t2po_lines_for_sample`
- 寫入 `snapshot_hash/snapshot_at/source_revision_id`
- 自動更新 sample_request.status：approved → in_execution

**Response**: Created T2PO (201)

---

#### 12. Change T2PO Status

```http
POST /api/v3/t2pos/{t2po_id}/status
```

**Allowed Transitions**：
- draft → issued → confirmed → delivered / cancelled

---

### D. Sample MWO API

#### 13. Preview MWO

```http
POST /api/v3/sample-requests/{id}/mwo/preview
```

**Request**：
```json
{
  "factory_name": "XYZ Garment",
  "estimate_id": null
}
```

**Response**：
```json
{
  "factory_name": "XYZ Garment",
  "bom_snapshot_json": [...],
  "construction_snapshot_json": [...],
  "qc_snapshot_json": {}
}
```

---

#### 14. Generate MWO

```http
POST /api/v3/sample-requests/{id}/mwo
```

**Request**：
```json
{
  "factory_name": "XYZ Garment",
  "estimate_id": null,
  "start_date": "2026-01-10",
  "due_date": "2026-01-15",
  "notes": "..."
}
```

**Rules**：
- sample_request.status 必須是 approved 或 in_execution
- 只讀 confirmed BOM/Construction
- 生成後自動推 status 到 in_execution

**Response**: Created MWO (201)

---

#### 15. Change MWO Status

```http
POST /api/v3/mwos/{mwo_id}/status
```

**Allowed Transitions**：
- draft → issued → in_progress → completed / cancelled

---

### E. Sample (Physical) API

#### 16. Create Sample Record

```http
POST /api/v3/sample-requests/{id}/samples
```

**Request**：
```json
{
  "sample_mwo_id": "uuid",
  "quantity_made": 2,
  "physical_ref": "PKG-123"
}
```

---

#### 17. Update Sample

```http
PATCH /api/v3/samples/{sample_id}
```

**Editable**：status, dates, feedback

---

### F. Attachments API

#### 18. Upload Attachment to Request

```http
POST /api/v3/sample-requests/{id}/attachments
```

#### 19. Upload Attachment to Sample

```http
POST /api/v3/samples/{sample_id}/attachments
```

**Request**：
```json
{
  "file_url": "https://...",
  "file_type": "photo",
  "caption": "front view"
}
```

---

## 🎨 UI Specification

### Page Structure

在現有 Revision 詳情頁 tabs 新增：

```
/dashboard/revisions/{revisionId}/
  ├─ bom (Phase 2)
  ├─ costing (Phase 2-2)
  └─ sample-requests (Phase 3) ⭐ NEW
```

---

### Page 1: Sample Requests List

**Route**: `/dashboard/revisions/{revisionId}/sample-requests`

**Header**：
- Style / Color / Revision info
- Badge：`Phase 2 Confirmed BOM: ✅/❌`

**Filters**：
- Status dropdown
- Request type dropdown
- Due date range
- Search (brand_name / notes)

**Table Columns**（TanStack Table）：
- Request Type (含 custom label)
- Brand
- Qty
- Need Quote? (chip)
- Due Date
- Status (badge)
- Updated
- Actions: View

**Primary CTA**：
- `+ Create Sample Request`

---

### Page 2: Create/Edit SampleRequest (Drawer)

**Fields**：
- brand_name
- request_type (dropdown + custom text input)
- quantity_requested
- size_set_json（多選 sizes + notes）
- need_quote_first (checkbox)
- due_date
- priority
- purpose (textarea)
- notes_internal

**Buttons**：
- Save Draft
- Save & Request Quote（`need_quote_first=true` 時顯示）
- Save & Approve（`need_quote_first=false` 時可用）

**Validation**：
- `request_type=custom` 必填 custom text
- qty >= 1

---

### Page 3: SampleRequest Detail（工作台）⭐

**Route**: `/dashboard/sample-requests/{requestId}`

#### Section A: Request Info Card

- Type / Brand / Qty / Due / Priority
- Status badge + "Change Status" menu
- Need quote first indicator
- Purpose + notes

#### Section B: Estimates（報價列表）

**Card List**：
- Version #, status, total, currency, valid_until
- Actions:
  - Create Estimate (Manual)
  - Create From Phase 2 Costing (if exists)
  - Mark Sent / Accept / Reject
  - View Details（Drawer 顯示 breakdown）

#### Section C: Related Documents

**兩張卡並列**：

**T2 PO Card**：
- List: po_no, supplier, status, delivery_date, total
- CTA:
  - Preview T2 PO
  - Generate T2 PO
  - Update Status

**Sample MWO Card**：
- mwo_no, factory, status, due_date
- CTA:
  - Preview MWO
  - Generate MWO
  - Update Status

#### Section D: Samples (Physical)

- List: physical_ref, qty_made, status, delivered_date
- CTA: Add Sample Record

#### Section E: Photos / Attachments

- Upload + gallery grid
- Attach to request or specific sample

---

### UI Flow: Generate T2 PO

1. Click "Preview T2 PO"
2. Modal/Drawer 顯示：
   - Confirmed BOM items table
   - 可輸入/調整 unit_price、wastage_pct
   - 即時計算 totals
3. Confirm "Generate"
4. 成功後回到 Detail，T2PO card 刷新

**重要 UI 規則**：
- 若沒有 confirmed BOM：preview 顯示阻擋提示 + 連回 Phase 2 BOM tab

---

### UI Flow: Generate MWO

1. Preview 顯示 bom_snapshot + construction_snapshot（read-only）
2. 輸入 factory_name / start / due
3. Generate

---

## 🔒 Phase 2/3 邊界檢查清單

### 開發時必須確認（5 個問題）

#### 1️⃣ 數據來源檢查

- [ ] 我使用的是 `is_verified=True` 的資料？
- [ ] 我使用的是 `translation_status='confirmed'` 的資料？
- [ ] 如果 BOM 沒有 confirmed 資料，我會報錯？

#### 2️⃣ 快照模式檢查

- [ ] 我是複製欄位，而不是 FK 引用？
- [ ] 我有把 BOM/Construction 存成 JSON 快照？
- [ ] 我的 PO Line 是獨立的欄位，不是 FK？

#### 3️⃣ 回寫檢查

- [ ] 我的代碼有 `bom_item.save()`？→ 如果有，刪掉！
- [ ] 我有修改 Phase 2 的任何資料？→ 如果有，刪掉！
- [ ] 我有寫 `update()` Phase 2 模型？→ 如果有，刪掉！

#### 4️⃣ 計算檢查

- [ ] 我的 quantity 計算是基於 sample qty（1-3 pcs）？
- [ ] 我沒有用 bulk_quantity？
- [ ] 我沒有 × 500 or × 1000 的計算？

#### 5️⃣ 模型邊界檢查

- [ ] 我沒有創建 BULK PO 模型？
- [ ] 我沒有創建 T2 PO for Bulk？
- [ ] 我沒有創建 BulkMWO？

**5 個都打勾 → Phase 3 代碼安全 ✅**

---

## ⏱️ 開發時間估算

### Phase 3-1（1 週）：Request + Estimate + T2PO

| 任務 | 時間 | 說明 |
|------|------|------|
| SampleRequest 模型 | 0.5 天 | CRUD + 狀態機 |
| SampleCostEstimate 模型 | 0.5 天 | 版本化 + JSON |
| T2POForSample 模型 | 1 天 | 快照 + 計算邏輯 |
| API 端點 | 1 天 | 12 個端點 |
| 前端 UI | 1.5 天 | 列表 + 詳情 + Generate |
| 測試 | 0.5 天 | 單元測試 + E2E |

**總計**：5 天

---

### Phase 3-2（1 週）：MWO + Sample + Attachments

| 任務 | 時間 | 說明 |
|------|------|------|
| SampleMWO 模型 | 1 天 | JSON 快照邏輯 |
| Sample + Attachments 模型 | 0.5 天 | 簡單 CRUD |
| API 端點 | 0.5 天 | 7 個端點 |
| 前端 UI | 1.5 天 | MWO + Sample + Gallery |
| 測試 | 0.5 天 | 整合測試 |
| 文檔更新 | 1 天 | API 文檔、用戶手冊 |

**總計**：5 天

---

**Phase 3 總時間**：10 天（2 週）

---

## ✅ 驗收標準

### 功能完整性

- [ ] 能創建 SampleRequest（類型可白名單 + custom）
- [ ] need_quote_first=true 時，能創建 SampleCostEstimate 並走 sent/accepted
- [ ] accepted/approved 後，才能生成 T2PO / MWO
- [ ] 生成 PO/MWO 都是快照模式（不可漂移）
- [ ] 能產生 0..N 件 Sample 實體並上傳照片/回饋

### 數據安全性

- [ ] Phase 3 無任何 FK 指向 BOMItem
- [ ] 只讀 confirmed 資料
- [ ] 任何「未 confirmed」生成會報錯

### UI 可用性

- [ ] 能清楚看到樣衣請求列表
- [ ] 能追蹤 Estimate / T2 PO / MWO 狀態
- [ ] 能看到計算過程
- [ ] 若無 confirmed BOM，有清楚提示

---

## 🚀 開發順序建議

### Week 1: Backend + Core UI

**Day 1-2**: 模型設計 + Migration
- SampleRequest
- SampleCostEstimate
- T2POForSample + Lines

**Day 3-4**: API 實作
- SampleRequest CRUD + 狀態機
- Estimate CRUD + from Phase 2
- T2 PO preview + generate

**Day 5**: 前端列表頁
- Sample Requests List
- Create/Edit Drawer

---

### Week 2: Generate Flows + Integration

**Day 6-7**: 前端詳情頁 + Generate
- Request Detail 工作台
- Estimates section
- T2 PO preview/generate UI

**Day 8**: MWO + Sample
- SampleMWO 模型 + API
- Sample 模型 + API
- Attachments

**Day 9**: Integration Testing
- E2E 測試
- Bug fixes

**Day 10**: 文檔 + 驗收
- API 文檔
- 用戶手冊
- 驗收測試

---

## 📚 與其他 Phase 的關係

### 與 Phase 2 的關係

**✅ Phase 3 可以**：
- 讀取 Phase 2 confirmed 資料（BOM/Measurement/Construction）
- 快照複製到 JSON 或獨立欄位
- 從 Phase 2 Costing 複製報價模板

**❌ Phase 3 不得**：
- FK 指向 BOMItem / Measurement / ConstructionStep
- 修改 Phase 2 任何資料
- 使用未 confirmed 資料

---

### 與 Phase 4 的關係（未來）

**Phase 4 Bulk PO 可以**：
- 引用 SampleRequest / Sample 作為前置依據
- 但 Bulk 成本、用量計算完全在 Phase 4 進行

**Phase 3 不得出現**：
- `bulk_quantity` / `bulk_price` / `bulk_po_number`
- 任何大量計算（×500, ×1000）

---

## 🎯 總結

**Phase 3 定位**：樣衣請求管理（Request-based，不是 Flow-based）

**核心原則**：
- ✅ 快照模式（不引用 Phase 2）
- ✅ 只用 confirmed 資料
- ✅ 流程由品牌需求決定
- ❌ 不得回寫 Phase 2
- ❌ 不得有 BULK PO

**支援場景**：
- 直接 Sales Sample → Bulk PO
- Proto → Fit → Bulk PO
- Proto only → 客戶否決
- Photo / Marketing / Wear Test samples
- 任何品牌自定義流程

**開發時間**：10 天（2 週）

**準備好開始了嗎？** 🚀

---

**設計完成時間**：2025-12-28 20:45
**Status**：✅ READY TO IMPLEMENT
