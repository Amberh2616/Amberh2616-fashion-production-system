# Fashion Production System - Claude Project Memory

**Last Updated:** 2025-12-18
**Project Status:** v2.2.1 Sprint 1 In Progress - Backend & Frontend Initialized
**Version:** 2.2.1

---

## Project Overview

### What Is This?

**AI-Augmented PLM + ERP Lite System**

A smart production management system designed for **one person to manage 300+ styles per season** in export merchandising.

### Core Value Proposition

```
Traditional: 1 person → max 50 styles → burnout
AI System:   1 person → 300+ styles → 70-80% automation
```

### The Real Problem We're Solving

**把文件變成可運算的資料（Turn Documents into Computable Data）**

客人丟來 Tech Pack（PDF 圖+文+表格）→ 系統自動抓出：
- BOM（物料清單）
- Measurement（尺寸表）
- Construction（工序說明）
- Packaging/Label（包裝標籤）

然後用流程把資料推進：
```
文件 → AI 結構化 → 人工審核 → 可運算資料 → 自動生成單據
       (draft)     (verified)   (OrderItemBOM)  (MWO/PO PDF)
```

---

## Critical Design Principles

### AI's Role (Level 2 Automation)

```
+----------------------------------+
| AI's Role (Level 2 Automation)   |
+----------------------------------+
| DO:                              |
| - Structure raw data             |
| - Generate drafts + suggestions  |
| - Flag risks/issues              |
| - Learn from corrections         |
|                                  |
| DON'T:                           |
| - Make final decisions           |
| - Auto-overwrite verified data   |
| - Send emails automatically      |
| - Place orders without approval  |
+----------------------------------+
| Human's Role:                    |
| - Review AI outputs              |
| - Approve / Reject / Correct     |
| - Final decision authority       |
| - Lock consumption for Prod PO   |
+----------------------------------+
```

**Key Insight:** AI 輸出 `change_plan`（建議 patch），系統顯示成「可套用的建議」，你按「Apply」才寫入 verified。這樣做到：人+AI 協作、但你永遠是最後決策者。

---

## System Architecture (6 Core Modules)

### 1. Intake（文件中心）
- 上傳、綁定 style/revision
- 檔案版本管理
- 下載（presigned URL）
- 檔案去重（SHA256 hash）

### 2. AI Parsing（結構化解析）
- Tech Pack → BOM/Measurement/Construction
- 多策略 pipeline（規則/表格偵測/Vision LLM）
- 輸出：Evidence + Confidence + Issues
- Cost tracking per extraction

### 3. Draft Review（你每天工作的主畫面）⭐ CORE
- 左 40%：PDF viewer（可點擊頁面）
- 右 60%：資料表（BOM/Measurement/Construction tabs）
- AI Issue 清單（缺欄位、衝突、低信心）
- 修正後寫入 verified
- Approve → 解鎖訂單建立

### 4. Orders（大貨/訂單管理）
- SalesOrder + SalesOrderItem（款色尺量）
- 建立 item 後自動生成 OrderItemBOM（訂單級 BOM）
- 尺碼分配（size breakdown）

### 5. Consumption（用量成熟度管理）⭐ KEY DESIGN
- OrderItemBOM（訂單級 BOM，真正用於計算 PO）
- 三段值：pre_estimate / confirmed / locked
- Marker Report 回填主料用量
- Sample Trim Measurement 回填副料用量
- Trim Rule Library 估算（Phase 1 先 20 條規則）

### 6. Documents Output（單據產出）
- MWO PDF（製造單，中文，給工廠）
- PO PDF（採購單，按供應商分組）
- Email 草稿（先不自動寄，Phase 2）

---

## The Consumption Maturity Problem（用量成熟度生命週期）

### Why This Matters

Tech Pack 常常沒用量，或用量不準：
- 主料（Fabric）：要等 Marker Report（排版圖）才知道實際用量
- 副料（Trim）：要等樣衣實測或用規則估算

**系統必須支撐這個成熟過程：**

```
unknown → pre_estimate → confirmed → locked
   ↓           ↓             ↓          ↓
客人沒給    估算值(RFQ可用)  有證據    PP前鎖定(Prod PO用)
```

### Gating Rules（關鍵控管）

| PO Type | Fabric 用量要求 | Trim 用量要求 |
|---------|---------------|-------------|
| **RFQ（詢價單）** | unknown/pre_estimate/confirmed/locked（都可以） | 同左 |
| **Production（正式生產單）** | confirmed/locked（必須有證據）| confirmed/locked（必須有證據）|

**這個設計是整個系統的核心邏輯！**

---

## Data Layer Architecture（資料層設計）

### Two-Level BOM Architecture（兩層 BOM 架構）⭐

```
Level 1: Revision BOM（模板層）
├─ BOMItem (template from tech pack)
├─ Measurement (size spec)
└─ ConstructionStep (process)

Level 2: Order BOM（訂單實例層）
└─ OrderItemBOM (order-specific instance)
   ├─ Links to: BOMItem (template)
   ├─ Contains: pre_estimate_value / confirmed_value / locked_value
   ├─ Evidence: marker_document / sample_measurement_record
   └─ This is where PO calculations happen!
```

**為什麼要兩層？**
- 同款不同訂單：用量/供應商/證據 可能不同
- 支援：Marker 回填、樣衣實測回填、用量鎖定後再生成 Production PO
- 追溯性：可以查到「這張 PO 是基於哪個證據、哪個用量值」

### Core Entities

```
Style（款）
  └─ StyleRevision（Rev A/Rev B）
      ├─ BOMItem（模板 BOM）
      ├─ Measurement（尺寸表）
      └─ ConstructionStep（工序）

SalesOrder（訂單）
  └─ SalesOrderItem（款色尺量）
      └─ OrderItemBOM（訂單級 BOM）⭐
          ├─ pre_estimate_value
          ├─ confirmed_value
          ├─ locked_value
          ├─ consumption_status (unknown/pre_estimate/confirmed/locked)
          ├─ consumption_source (manual/rule_based/marker_report/sample_measurement)
          ├─ marker_document (FK to MarkerReport)
          └─ sample_measurement_record (FK to SampleTrimMeasurement)

PurchaseOrderDraft / PurchaseOrder
  └─ POLine
      └─ Points to OrderItemBOM (not BOMItem!)
```

---

## MVP Must-Have: 7 Core Pages

### 1. Styles 列表（300 款表格）
- 篩選：季、狀態、客戶、due date
- 多選 → Batch Parse
- Status badges: uploaded/parsing/draft/approved

### 2. Style 詳細頁
- Revisions 列表（Rev A/B/C）
- 最新狀態、文件列表
- Quick actions

### 3. Upload/Intake 頁
- 拖拉上傳 tech pack/bom/spec/artwork
- 自動綁定 style + revision
- 檔案去重提示

### 4. Parse Run 狀態頁
- 顯示 AI 進度（0-100%）
- 成本追蹤（$1.23）
- 失敗原因（哪裡出錯）

### 5. Draft Review 主頁（最重要！）⭐
```
+---------------------------------------------------------------+
|  LW1FLPS - Nulu Cami Tank                    Status: Draft    |
+---------------------------------------------------------------+
|                                                               |
|  [LEFT 40%]                  |  [RIGHT 60%]                   |
|  Original Tech Pack PDF      |  AI Results + Edit Area        |
|  (Scrollable, Zoomable)      |                                |
|                              |  Tabs:                         |
|  Click BOM page ->           |  +---------------------------+  |
|  Right side jumps to BOM     |  | BOM | Measurement |       |  |
|                              |  | Construction              |  |
|                              |  +---------------------------+  |
|  +-------------------+       |                                |
|  | [PDF Viewer]      |       |  AI Issues:                    |
|  |                   |       |  +---------------------------+  |
|  | Page 3/12         |       |  | ! Missing: Fabric code    |  |
|  |                   |       |  | ! Conflict: Usage = 0     |  |
|  +-------------------+       |  | i Low confidence: 65%     |  |
|                              |  +---------------------------+  |
|  [< Prev] [Next >]           |  [Approve] [Save Draft]       |
+------------------------------+--------------------------------+
```

### 6. Order 建立/管理頁
- 輸入大貨 PO 資訊
- 建立 order items
- 尺碼量分配（XS:200, S:400...）
- 自動生成 OrderItemBOM

### 7. MWO/PO 產出中心
- 選多款 → Batch 生成 MWO/PO PDF
- 下載、版本管理
- 重新計算（手動觸發）

---

## End-to-End Workflow（實際每天怎麼用）

### Day 1: Upload & Parse
```
1. 選擇「整個資料夾」上傳（50 份 tech pack PDF）
   → 系統自動建 style + revision + document

2. 在 Styles 列表多選 50 款 → [Batch Parse]
   → AI 解析中（3-5 分鐘/款）
   → 喝咖啡等通知
```

### Day 2: Review & Approve
```
3. 進 Draft Review 頁面（一款一款看）
   → 快速修正缺欄位/衝突（2-3 issues/款）
   → [Approve Revision]（完成 40 款）
```

### Day 3: Create Orders
```
4. 收到大貨訂單 → 建 SalesOrder
   → 建 SalesOrderItem（連到 approved revision）
   → 系統自動生成 OrderItemBOM（用量 status = pre_estimate）
```

### Day 4: RFQ PO
```
5. [Generate PO Drafts - RFQ]
   → 用 pre_estimate 生成 PO
   → 按供應商分組（Eclat, YKK, TrimCo）
   → 下載 PDF → 發給供應商詢價
```

### Day 5: Marker & Sample
```
6. 收到 Marker Report（主料排版圖）
   → 上傳 + 解析
   → 自動回填 OrderItemBOM.confirmed_value

7. 樣衣打好 → 實測副料（鬆緊帶、拉鍊）
   → 輸入測量值
   → 回填 OrderItemBOM.confirmed_value
```

### Day 6: Lock & Production PO
```
8. PP 前確認用量無誤 → [Lock Consumption]
   → OrderItemBOM.consumption_status = locked

9. [Generate PO Drafts - Production]
   → 系統檢查：fabric/trim 都 confirmed/locked？
   → 生成 Production PO（最終下單量）
   → 下載 PDF → 發給供應商正式下單
```

### Day 7: Generate MWO
```
10. [Batch Generate MWO]（20-50 款）
    → 製造單 PDF（中文，給工廠）
    → 包含：BOM + 尺寸表 + 工序 + QC points
    → 下載 → Email 給工廠
```

**重點：用 Batch 對 20-50 款一批做，不會一次 300 款全跑完！**

---

## Technology Stack

### Confirmed Stack

```
Frontend:     Next.js 14 (TypeScript + App Router)
Backend:      Django 4.2 + Django REST Framework
Database:     PostgreSQL 15 (UUID PKs)
Cache:        Redis 7
File Storage: MinIO (dev) / AWS S3 (prod)
Task Queue:   Celery (Redis broker)
PDF Gen:      WeasyPrint (HTML template → PDF)
AI:           OpenAI GPT-4 Vision + GPT-4o Mini
```

### Why These Choices?

**Django:**
- 成熟的 ORM（複雜 BOM 關聯很適合）
- DRF 快速建 API
- Celery 整合完善（異步任務）
- Admin 後台（快速測試資料）

**Next.js:**
- App Router（模組化路由）
- SSR/ISR 支援（SEO 友好）
- 表格/PDF/批次操作 UI 庫豐富

**WeasyPrint:**
- HTML/CSS 模板 → PDF
- 可維護性最高（不用寫 ReportLab 程式碼）
- 支援中文字型、表格、分頁

**Celery:**
- Parse/PDF 生成不能阻塞 UI（5-30 秒）
- 批次操作需要進度追蹤
- 重試機制（API 失敗自動重試）

### Architecture

```
+-------------------------------------------+
|     Next.js Frontend (Port 3000)          |
|  - Draft Review Dashboard (CORE)          |
|  - Styles List + Upload                   |
|  - Orders + MWO/PO Center                 |
+-------------------+-----------------------+
                    | REST API (JSON)
+-------------------+-----------------------+
|     Django Backend (Port 8000)            |
|  +-- apps/core/       (User, Org)         |
|  +-- apps/styles/     (Style, Revision)   |
|  +-- apps/documents/  (Upload, Storage)   |
|  +-- apps/parsing/    (ExtractionRun)     |
|  +-- apps/orders/     (SalesOrder, Item)  |
|  +-- apps/consumption/(OrderItemBOM)      |
|  +-- apps/procurement/(PO, Supplier)      |
|  +-- apps/manufacturing/(MWO)             |
|  |                                        |
|  +-- services/ai/     (GPT-4 client)      |
|  +-- services/storage/(S3/MinIO)          |
+-------------------+-----------------------+
                    | Celery Tasks
+-------------------+-----------------------+
|     Background Workers                    |
|  - PDF Parsing (PyMuPDF)                  |
|  - AI Extraction (async, 3-5 min)         |
|  - PDF Generation (WeasyPrint)            |
|  - Marker Parsing                         |
+-------------------------------------------+
          |                   |
    PostgreSQL 15         Redis 7
```

---

## Project Structure

```
fashion-production-system/
├── backend/                     # Django Backend
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── celery.py
│   ├── apps/
│   │   ├── core/               # Organization, User, Auth
│   │   ├── styles/             # Style, StyleRevision
│   │   ├── documents/          # Document, upload/download
│   │   ├── parsing/            # ExtractionRun, DraftReviewItem
│   │   ├── orders/             # SalesOrder, SalesOrderItem
│   │   ├── consumption/        # OrderItemBOM, MarkerReport, TrimMeasurement
│   │   ├── procurement/        # PO, POLine, Supplier
│   │   └── manufacturing/      # MWO
│   ├── services/
│   │   ├── ai/                 # AI client, prompts, extractors
│   │   │   ├── client.py
│   │   │   ├── prompts/
│   │   │   └── extractors/
│   │   └── storage/            # S3/MinIO, presigned URLs
│   └── requirements/
│       ├── base.txt
│       ├── development.txt
│       └── production.txt
│
├── frontend/                    # Next.js Frontend
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── styles/
│   │   │   │   ├── page.tsx              # List
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx          # Detail
│   │   │   │       └── review/
│   │   │   │           └── page.tsx      # Draft Review ⭐
│   │   │   ├── orders/
│   │   │   ├── procurement/
│   │   │   └── manufacturing/
│   │   └── api/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui
│   │   ├── styles/
│   │   │   ├── PDFViewer.tsx
│   │   │   ├── BOMTable.tsx
│   │   │   ├── MeasurementTable.tsx
│   │   │   └── IssuesPanel.tsx
│   │   └── layout/
│   ├── lib/
│   │   ├── api/                # API client + React Query
│   │   ├── hooks/
│   │   └── utils/
│   └── store/                  # Zustand stores
│
├── docs/
│   ├── DATABASE-SCHEMA_v2.2.1_COMPLETE2.md     # ⭐ Main schema
│   ├── DATABASE-SCHEMA_v2.2.1_DJANGO_MODELS.md # Dev reference
│   ├── API-SPEC_v2.2.1_COMPLETE.md             # All endpoints
│   ├── AI-JSON-SCHEMA_v2.2.1_COMPLETE.md       # AI I/O formats
│   ├── TRIM-RULES-LIBRARY_v1.0.md              # 20 trim rules
│   ├── DECISIONS_v2.2.1.md                     # ADR
│   └── TASK-BREAKDOWN.md                       # 3 sprints
│
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
├── .archive/                   # Old versions
├── CLAUDE.md                   # This file
└── README.md
```

---

## Development Roadmap (v2.2.1)

### Sprint 1 (Weeks 1-2): Foundation + Upload/Intake

**T1. Repo & Infra (1.5d)**
- Django + DRF, PostgreSQL, Redis, Celery, MinIO
- `docker-compose up` 跑起整套環境
- Health endpoint

**T2. Core Models + Migrations (2.5d)**
- Organization, Style, StyleRevision, Document
- Supplier, Material, Factory
- BOMItem, Measurement, ConstructionStep

**T3. Upload API (2d)**
- Presigned URL upload (S3/MinIO)
- File validation + hash dedup

**T4. Intake: Folder Grouping (2.5d)**
- 上傳多檔自動分組成 style/revision
- Filename heuristics（style number regex）

**T5. Minimal Frontend Shell (1.5d)**
- Next.js + shadcn/ui
- Layout: sidebar + topbar
- Pages: `/styles` list, `/styles/[id]` detail

---

### Sprint 2 (Weeks 3-4): Parsing + Draft Review + Approve

**T6. Parse Job Framework (2d)**
- Celery job + polling/SSE
- Progress tracking in DB

**T7. Extraction Strategy 1: PyMuPDF (3d)**
- BOM/spec/construction 表格抽取
- Evidence 儲存（page/bbox/text）

**T8. Draft Review Items Generation (1.5d)**
- 缺欄位、衝突、低信心 → DraftReviewItem

**T9. Revision Data Editor UI (3d)**
- BOM/Measurement/Construction 可編輯表格
- Inline editing + auto-save

**T10. Approve Revision Flow (1d)**
- State checks（severity=error 不能 approve）
- Status flip: draft → approved

---

### Sprint 3 (Weeks 5-6): Orders + MWO/PO + Batch

**T11. Sales Orders + Items (2d)**
- CRUD SalesOrder + SalesOrderItem
- 建立 item → 自動生成 OrderItemBOM

**T12. Generate MWO (3d)**
- Snapshot + PDF template
- WeasyPrint HTML → PDF
- Celery async

**T13. Generate PO Drafts (3d)**
- Group by supplier
- Gating rules（RFQ vs Production）
- UNASSIGNED bucket

**T14. Batch APIs + UI (3d)**
- `/batch/parse`, `/batch/generate-mwo`, `/batch/generate-po-drafts`
- UI 多選 + progress tracking

**T15. Review Queue UI (2d)**
- Issues 列表 + filters
- Open item → jump to table row

---

## Key Design Decisions (ADRs)

完整決策記錄在 `DECISIONS_v2.2.1.md`，這裡列重點：

### D-001: BatchRun 範圍（Phase 1）
- 只做 3 個批次：Parse, Generate MWO, Generate PO
- concurrency_limit = 5, retry_limit = 2

### D-004: PO Line 指向 Order 層
- `PurchaseOrderLine` 必須指向 `OrderItemBOM`（不是 BOMItem）
- 支援訂單級用量變動與追溯

### D-005: 用量成熟度生命週期
- `unknown → pre_estimate → confirmed → locked`
- 三段值儲存：pre_estimate_value / confirmed_value / locked_value
- `locked` 由使用者手動觸發

### D-006: PO Draft 重算
- Phase 1 採「手動觸發」（UI 按鈕）
- `approved/issued` PO 不自動動

### D-007: Storage
- MinIO (dev) + S3 (prod)
- Presigned URL（避免公開 bucket）

### D-009: PDF 渲染庫
- WeasyPrint 為主（HTML/CSS → PDF）
- 維護成本低、支援中文

### D-011: draft vs verified（人機協作）
- AI 永遠是草稿（draft）
- 使用者修正後才寫入 verified（source of truth）

### D-013: Multi-tenant
- 所有資料表都帶 `organization_id`（即使 MVP 單人也保留）

---

## API Quick Reference

完整 API 規格在 `API-SPEC_v2.2.1_COMPLETE.md`（617 行），這裡列常用：

### Auth
```
POST /api/v2/auth/login
GET  /api/v2/auth/me
```

### Styles & Revisions
```
POST   /api/v2/styles
GET    /api/v2/styles
GET    /api/v2/styles/{id}
POST   /api/v2/styles/{id}/revisions
POST   /api/v2/revisions/{id}/approve
```

### Upload
```
POST /api/v2/documents/upload-init        # Get presigned URL
POST /api/v2/documents/{id}/upload-complete
GET  /api/v2/documents/{id}/download      # Get presigned download
```

### Parsing
```
POST /api/v2/revisions/{id}/parse         # Trigger (async)
GET  /api/v2/extraction-runs/{id}         # Check status
GET  /api/v2/revisions/{id}/draft         # Get AI results
PATCH /api/v2/revisions/{id}/verified     # Write corrections
```

### Orders & Consumption
```
POST  /api/v2/sales-orders
POST  /api/v2/sales-orders/{id}/items
GET   /api/v2/sales-order-items/{id}/bom
PATCH /api/v2/order-item-bom/{id}
POST  /api/v2/order-item-bom/{id}/lock    # Lock consumption
```

### Marker & Trim
```
POST /api/v2/sales-order-items/{id}/marker-reports
POST /api/v2/marker-reports/{id}/parse
POST /api/v2/sales-order-items/{id}/trim-measurements
```

### PO & MWO
```
POST /api/v2/sales-order-items/{id}/po-drafts/generate
POST /api/v2/po-drafts/{id}/approve
POST /api/v2/po-drafts/{id}/export-pdf
POST /api/v2/sales-order-items/{id}/mwo/generate
```

### Batch
```
POST /api/v2/batch-runs
GET  /api/v2/batch-runs/{id}
POST /api/v2/batch-runs/{id}/cancel
```

---

## AI Task Schemas

完整 AI I/O 格式在 `AI-JSON-SCHEMA_v2.2.1_COMPLETE.md`（430 行），這裡列架構：

### Tech Pack Parsing
```json
{
  "task": "techpack_parse",
  "revision_id": "uuid",
  "targets": ["bom","measurement","construction"],
  "language": {"source":"en","target":"zh-TW"}
}
```

Output includes:
- `bom.items[]` (with evidence + field_confidence)
- `measurement.points[]`
- `construction.steps[]`
- `issues[]` (missing_field, conflict, low_confidence)

### Marker Report Parsing
```json
{
  "task": "marker_parse",
  "marker_report_id": "uuid",
  "parsed_data": {
    "consumption_per_size": {"XS":2.2,"S":2.3,"M":2.5},
    "weighted_avg": 2.38
  },
  "backfill": {
    "new_confirmed_value": 2.38,
    "consumption_status": "confirmed"
  }
}
```

### Trim Estimation (Rule-based)
```json
{
  "task": "trim_estimate",
  "rule": {
    "formula": "waist_opening + overlap",
    "params": {"overlap": 2.5}
  },
  "measurements": {"waist_opening": 66.0},
  "result": {"pre_estimate_value": 68.5}
}
```

---

## Trim Rules Library

在 `TRIM-RULES-LIBRARY_v1.0.md` 定義了 20 條常用規則：

### Categories
- **Elastic（鬆緊帶）**: 7 rules (waist, leg, armhole, strap, cuff, neckline, underbust)
- **Binding/Tape（包邊）**: 5 rules (neckline, armhole, hem, sleeve, pocket)
- **Drawcord（拉繩）**: 2 rules (waist, hood)
- **Strap（肩帶）**: 3 rules (bra strap, crossback, waist tie)
- **Zipper（拉鍊）**: 1 rule (center front)
- **Fixed Count（固定數量）**: 2 rules (care label, hang tag)

### Example Rule
```json
{
  "rule_id": "TRIM-001",
  "rule_name": "Waist Elastic (Standard Overlap)",
  "formula": "waist_opening + overlap",
  "formula_params": {"overlap": 2.5},
  "required_measurement_points": ["waist_opening"],
  "output_uom": "cm/pc",
  "confidence_level": 0.75
}
```

---

## Cost Estimates

### AI Costs (Monthly - 300 Styles)

| Item | Quantity | Unit Cost | Monthly |
|------|----------|-----------|---------|
| Tech Pack Parse | 300 | $1.00 | $300 |
| Marker Parse | 200 | $0.40 | $80 |
| Trim Estimate | 500 | $0.05 | $25 |
| MWO Generation | 150 | $0.10 | $15 |
| PO Generation | 200 | $0.20 | $40 |
| Retries/Errors | - | - | $40 |
| **AI Subtotal** | | | **$500** |

### Infrastructure (Monthly)

| Item | Cost |
|------|------|
| VPS (4CPU/8GB) | $40-60 |
| PostgreSQL (managed) | $25-35 |
| Redis (managed) | $15-20 |
| S3 Storage (100GB) | $10-15 |
| Domain + SSL | $5 |
| **Infra Subtotal** | **$95-135** |

### Total Monthly Cost

```
Total: $600-650/month

ROI:
- Time saved: 200+ hours/month
- Equivalent labor: $4000+/month
- Net savings: $3400-3500/month
- ROI: 550-650%
```

---

## Important Reminders for Development

### 1. AI is Always a Draft
- All AI output → draft first
- 顯示 confidence scores
- Flag items < 70% confidence
- 人工修正後才寫入 verified

### 2. Two-Level BOM is Critical
- BOMItem = Revision 模板（不能直接用於 PO）
- OrderItemBOM = Order 實例（真正計算 PO 的地方）
- 不要搞混！

### 3. Consumption Gating is Non-Negotiable
```python
def generate_po(po_type):
    if po_type == "Production":
        for line in order_item_bom:
            if line.category == "fabric":
                assert line.consumption_status in ["confirmed", "locked"]
            if line.category == "trim":
                assert line.consumption_status in ["confirmed", "locked"]
```

### 4. Batch Operations, Not One-by-One
- 一次處理 20-50 款（不是 300 款）
- Progress tracking per item
- Failure 不能影響其他 items

### 5. Presigned URLs for Security
```python
# BAD: 不要這樣做
file.url = "https://bucket.s3.amazonaws.com/techpack.pdf"

# GOOD: 用 presigned URL
url = s3.generate_presigned_url(
    'get_object',
    Params={'Bucket': bucket, 'Key': key},
    ExpiresIn=900  # 15 minutes
)
```

### 6. Async PDF Generation
- PDF 生成可能 5-30 秒（含圖片、表格）
- 一定要用 Celery 非同步
- API 立即回 `{"status": "generating", "task_id": "..."}`

### 7. Version Control Matters
- StyleRevision 鏈結 `previous_revision_id`
- 產生 diff（detected_changes JSON）
- 追溯「哪一版導致哪次下單」

---

## Environment Variables

```env
# Django
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com
DATABASE_URL=postgres://user:pass@localhost:5432/fashion_plm
REDIS_URL=redis://localhost:6379/0

# AWS S3 (Production)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_STORAGE_BUCKET_NAME=fashion-plm-files
AWS_S3_REGION_NAME=us-west-2

# MinIO (Development)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=fashion-plm-dev

# AI
OPENAI_API_KEY=sk-xxx
OPENAI_ORG_ID=org-xxx

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v2
```

---

## Commands Reference

### Development

```bash
# Backend (Django)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements/development.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Frontend (Next.js)
cd frontend
npm install
npm run dev

# Celery Worker
cd backend
celery -A config worker -l info

# Docker (Full Stack)
docker-compose up -d
```

### Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

### Production

```bash
# Build frontend
cd frontend
npm run build

# Collect static (Django)
cd backend
python manage.py collectstatic

# Run with Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

---

## Current Status

### ✅ Completed (2025-12-18)

#### Design Phase (2025-12-17)
- [x] v2.2.1 Complete system design
- [x] Database schema design (`DATABASE-SCHEMA_v2.2.1_COMPLETE2.md`)
- [x] Django models specification (`DATABASE-SCHEMA_v2.2.1_DJANGO_MODELS.md`)
- [x] Complete API specification (`API-SPEC_v2.2.1_COMPLETE.md`)
- [x] AI JSON schema specification (`AI-JSON-SCHEMA_v2.2.1_COMPLETE.md`)
- [x] Trim rules library (`TRIM-RULES-LIBRARY_v1.0.md`)
- [x] Architecture decision records (`DECISIONS_v2.2.1.md`)
- [x] Task breakdown & sprint planning (`TASK-BREAKDOWN.md`)

#### Sprint 1 - Foundation (2025-12-18)
- [x] **T1 (Partial)**: Django project initialization
  - Django 4.2.8 + DRF setup
  - Project structure: `config/`, `apps/` (8 modules)
  - Requirements defined (`requirements/base.txt`)
  - Virtual environment created
  - SQLite database initialized
  - Celery configuration (`config/celery.py`)

- [x] **T2**: Core Models implementation (1154 lines total)
  - `apps/core/models.py` (74 lines): Organization, User
  - `apps/styles/models.py` (295 lines): Style, StyleRevision, BOMItem, Measurement, ConstructionStep
  - `apps/documents/models.py` (76 lines): Document
  - `apps/parsing/models.py` (140 lines): ExtractionRun, DraftReviewItem
  - `apps/orders/models.py` (92 lines): SalesOrder, SalesOrderItem
  - `apps/consumption/models.py` (224 lines): OrderItemBOM, MarkerReport, TrimMeasurement
  - `apps/procurement/models.py` (172 lines): Supplier, PurchaseOrder, POLine
  - `apps/manufacturing/models.py` (81 lines): MWO
  - **9 migration files** created and ready

- [x] **T5**: Next.js frontend shell
  - Next.js 14 + TypeScript + App Router
  - Dependencies installed: shadcn/ui, TanStack Query, TanStack Table
  - Project structure: `app/`, `components/`, `lib/`, `store/`
  - Dashboard routes: `/dashboard`, `/dashboard/bom`, `/dashboard/procurement`, `/dashboard/samples`, `/dashboard/techpacks`
  - Layout components ready

- [x] **Environment Configuration**
  - `backend/.env` configured
  - `frontend/.env.local` configured
  - Settings split: `config/settings/base.py`, `development.py`, `production.py`

### 🚧 In Progress
- [ ] **T1 (Remaining)**: PostgreSQL + Redis + MinIO setup (currently using SQLite)
- [ ] **T1**: Docker Compose full stack setup
- [ ] **T3**: Upload API + S3/MinIO integration
- [ ] **T4**: Intake folder grouping logic

### 📋 Next Steps (Priority Order)
1. **This Week**:
   - Complete Docker setup (PostgreSQL, Redis, MinIO)
   - Implement Upload API (presigned URLs)
   - Build Intake folder grouping
   - Create basic API endpoints (serializers, views)

2. **Week 2**:
   - Parsing job framework (Celery tasks)
   - PyMuPDF extraction strategy
   - Draft Review Items generation

3. **Week 3-4**:
   - Draft Review UI (PDF viewer + editable tables)
   - Approve flow
   - Issue management

4. **Week 5-6**:
   - Orders + MWO/PO generation
   - Batch operations

---

## References

### Documentation
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [TanStack Query](https://tanstack.com/query)
- [WeasyPrint](https://weasyprint.org/)
- [Celery](https://docs.celeryq.dev/)

### Project Documents (v2.2.1)
- `DATABASE-SCHEMA_v2.2.1_COMPLETE2.md` - Main schema doc (17KB)
- `DATABASE-SCHEMA_v2.2.1_DJANGO_MODELS.md` - Django dev reference (72KB)
- `API-SPEC_v2.2.1_COMPLETE.md` - All API endpoints (617 lines)
- `AI-JSON-SCHEMA_v2.2.1_COMPLETE.md` - AI I/O formats (430 lines)
- `TRIM-RULES-LIBRARY_v1.0.md` - 20 common trim rules
- `DECISIONS_v2.2.1.md` - Architecture decision records (14 ADRs)
- `TASK-BREAKDOWN.md` - 3-sprint development plan

---

**Last Updated:** 2025-12-18
**Version:** 2.2.1
**Status:** Sprint 1 In Progress - Backend & Frontend Initialized ✅
