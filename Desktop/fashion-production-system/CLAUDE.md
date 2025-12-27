# Fashion Production System - Claude Project Memory

**Last Updated:** 2025-12-27 15:30
**Project Status:** v2.2.1 Sprint 1 - Draft Review UI Testing (90%) + BOM Design Complete
**Version:** 2.2.1

> 📘 **Technical Reference:** See `CLAUDE-TECHNICAL.md` for API specs, commands, environment variables, and tech stack details.

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

## Current Status (2025-12-27)

### ✅ Completed

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
- [x] Django 4.2.8 + DRF setup
- [x] Core Models (8 apps, 1154 lines, 9 migrations)
- [x] Next.js 14 frontend shell
- [x] Environment configuration

#### Sprint 1 - Block-Based Parsing (2025-12-21)
- [x] Block-Based Parsing Models (`apps/parsing/models_blocks.py`)
  - Revision, RevisionPage, DraftBlock, DraftBlockHistory
  - BBox flat fields for performance
  - Three-layer text: source_text / translated_text / edited_text
- [x] Serializers with bbox conversion
- [x] Parse Task - Page 4 MVP (Celery + pdfplumber)
- [x] PDF/Translation utils
- [x] Risk analysis document
- [x] Media URL configuration
- [x] Frontend code received (react-pdf + block editor)

#### Session 2025-12-22 Fixes
- [x] react-resizable-panels v4.x API migration
- [x] Missing API functions handled
- [x] Conflicting pages disabled
- [x] Port 3000 conflict resolved
- [x] CORS configuration verified
- [x] API endpoint path corrected
- [x] Type definitions created
- [x] Architecture mismatch identified

#### Session 2025-12-27 Progress ⭐ NEW

**Major Milestone 1: Draft Review UI Real Testing (90% Complete)**
- [x] **Block Extraction Working**
  - 7 complete callout blocks extracted (not 26 word fragments)
  - Full sentences: "binding with encased elastic topstitch"
  - Test Revision ID: `d3be25b0-01e5-4e3d-afe8-ca9578f1ebb2`

- [x] **AI Translation Functional**
  - OpenAI GPT-4o Mini integration working
  - Examples:
    - "binding with encased elastic topstitch" → "包邊搭配包覆彈性上車縫"
    - "neckline binding with encased elastic" → "頸線包邊搭配包覆彈性帶"
    - "inner shelf bra layer (see details" → "內襯胸墊層（詳情請參閱）"

- [x] **Review Page Accessible**
  - URL: http://localhost:3000/dashboard/revisions/{id}/review
  - PDF viewer rendering correctly
  - Block list displaying with translations
  - Edit/Save functionality ready for testing

- [x] **Batch Testing Capability** (2025-12-27 晚上)
  - Created `seed_10_revisions.py` command
  - 10 test revisions generated with realistic data
  - Revisions list page working at `/dashboard/revisions`

- [x] **Bilingual Overlay System Design** (2025-12-27 晚上) ⭐ NEW
  - Problem identified: "如何確認 100% 翻譯完成？"
  - Solution: 雙語疊層 + Coverage Check + Preview PDF
  - 3-Phase plan created (UI → Preview PDF → Finalize/Lock)
  - Phase 1 components完成 (4 files created)

- [x] **Phase 1 Integration Complete** (2025-12-27 23:00) ✅
  - ✅ BilingualOverlay.tsx - 主疊層組件
  - ✅ BlockOverlayItem.tsx - 單個 block 渲染（inline/card 模式）
  - ✅ CoveragePanel.tsx - 翻譯完整性統計
  - ✅ canRenderInline.ts - bbox 容納判斷邏輯
  - ✅ react-pdf 安裝和配置完成（69 packages）
  - ✅ 替換 iframe → react-pdf（Document + Page）
  - ✅ 完整整合到 review 頁面
  - ✅ Auto scale + renderTextLayer=false
  - ✅ Coverage Panel 顯示統計（Total/Translated/Missing）
  - ✅ Show Missing Only 篩選功能
  - ✅ Next Missing 快速跳轉功能
  - ⏳ 等待用戶測試驗證

- [ ] **User Acceptance Testing (Pending)**
  - Translation quality validation needed
  - Editing workflow testing needed
  - Repeatability assessment (10+ tech packs scenario)

**Major Milestone 2: BOM → PO Complete System Design**
- [x] **Three-Layer Architecture Finalized**
  - Level 1: Revision BOM (template layer)
  - Level 2: Order BOM (order instance layer) ⭐ critical
  - Level 3: PO (procurement layer with price freeze)

- [x] **Initial Design Complete** (see `1227-01.txt`)
  - `supplier_article_no` - Procurement identification key
  - `source_type` & `source_ref` - Evidence tracking
  - `po_type` - RFQ vs Production distinction
  - Price freeze mechanism in POLine (COPY not reference)

- [x] **Critical Corrections Applied** ⚠️ (see `BOM-PO-DESIGN-CORRECTIONS.md`)
  - #1: Supplier normalization (prevent grouping errors)
  - #2: Auto-recalc totals + lock mechanism
  - #3: RFQ gating - reject unknown (not just pre_estimate)
  - #4: Currency field required (USD/NTD/CNY)
  - #5: Unit standardization (yd/m/cm/pc)

- [x] **Gating Rules Corrected**
  - RFQ PO: Allows pre_estimate/confirmed/locked (NOT unknown ❌)
  - Production PO: Requires confirmed/locked only
  - Validation logic: All fabric/trim must be confirmed before Production PO

- [x] **Implementation Plan (6 Phases)**
  - Phase 1: Model field additions (0.5 day)
  - Phase 2: BOM editor page (2 days)
  - Phase 3: Order creation + auto BOM copy (1 day)
  - Phase 4: RFQ PO generation (1 day)
  - Phase 5: Production PO + gating (1 day)
  - Phase 6: Marker/Trim backfill (optional)

- [ ] **Implementation Start (Awaiting Approval)**
  - Complete design documented in `1227-01.txt`
  - Ready to start Phase 1 migrations
  - Awaiting user confirmation to proceed

### 🎯 Current Focus (2025-12-27 晚上更新)

**Three Parallel Tracks:**

**Track A: Bilingual Overlay System** (Phase 1 完成 ✅)
- Status: 100% 實作完成，等待用戶測試驗證
- Completed: react-pdf + BilingualOverlay + CoveragePanel 完整整合
- Features:
  - ✅ 原文在上、中文在下（視覺驗證）
  - ✅ 自動檢測漏翻（Coverage Check）
  - ✅ Inline/Card 模式自動切換
  - ✅ Show Missing Only 篩選
  - ✅ Next Missing 快速跳轉
- Next: 用戶測試 → Phase 2 (Preview PDF) 或 Phase 3 (Finalize)

**Track B: Draft Review UI Validation** (90% → 95%)
- Status: Batch testing capability ready (10 test revisions)
- Blocker: Need user to test editing workflow with real tech pack
- Next: User acceptance testing → decision on UI improvements

**Track C: BOM → PO Implementation** (Design 100% → Implementation 0%)
- Status: Complete design approved (with 5 critical corrections)
- Blocker: Awaiting user "go" signal to start Phase 1
- Next: Django migrations for new fields (30 min task)

### 📋 Next Steps (Updated 2025-12-27)

#### 🥇 Track A: Draft Review UI - Final Validation (5 min)
**Status:** 90% complete, system working, need real usage test

**Action Items:**
1. [ ] Test editing workflow (change 2-3 translations)
2. [ ] Evaluate translation quality (AI output usable?)
3. [ ] Assess textarea UX (need larger edit area?)
4. [ ] Answer: Would you use this for 10 tech packs tomorrow?

**Deliverable:** User feedback → UI improvement decisions

---

#### 🥈 Track B: BOM → PO - Phase 1 Implementation (30 min)
**Status:** Design 100% complete, ready to start implementation

**Phase 1 Tasks:**
1. [ ] Add `supplier_article_no` to BOMItem model
2. [ ] Add fields to OrderItemBOM:
   - material_name, supplier, supplier_article_no, category
   - source_type, source_ref
3. [ ] Add `po_type` to PurchaseOrder model
4. [ ] Add `supplier_article_no` to POLine model
5. [ ] Run migrations
6. [ ] Test new fields in Django admin

**Deliverable:** Database schema updated, ready for Phase 2

**Awaiting:** User confirmation to proceed ("開始")

---

#### 🥉 P2 - Documentation Update (15 min)
- [ ] Update DATABASE-SCHEMA with new fields
- [ ] Document BOM → PO workflow in API-SPEC
- [ ] Create BOM Phase 1-6 implementation checklist

### 📝 Technical Debt (Updated 2025-12-27)

1. **Disabled Features (Low Priority)**
   - `/dashboard/techpacks` page (placeholder) - Not needed for MVP
   - `/dashboard/techpacks/[id]/review` page (placeholder) - Replaced by `/revisions/[id]/review`
   - 6 API mutation hooks commented out - Will implement if needed

2. **Pending User Testing**
   - ✅ Draft Review UI functional (90% complete)
   - ⏳ Awaiting real-world usage feedback
   - ⏳ Translation quality assessment
   - ⏳ Editing workflow validation

3. **Documentation Gaps (P2)**
   - Block-based API endpoints (working but not documented)
   - BOM → PO workflow documentation
   - User guide for Draft Review workflow

---

## Documentation Reference

### Core Documentation
- **This file (CLAUDE.md)**: Project overview, design principles, workflow, status
- **CLAUDE-TECHNICAL.md**: Tech stack, API specs, commands, environment variables
- **docs/DATABASE-SCHEMA_v2.2.1_COMPLETE2.md**: Main database schema
- **docs/API-SPEC_v2.2.1_COMPLETE.md**: Complete API specification
- **docs/DECISIONS_v2.2.1.md**: Architecture decision records

### Quick Links
- Cost estimates: See CLAUDE-TECHNICAL.md
- Commands: See CLAUDE-TECHNICAL.md
- Tech stack: See CLAUDE-TECHNICAL.md
- Environment setup: See CLAUDE-TECHNICAL.md
