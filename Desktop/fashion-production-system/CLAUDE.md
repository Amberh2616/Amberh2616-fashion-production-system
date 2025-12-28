# Fashion Production System - Claude Project Memory

**Last Updated:** 2025-12-29 00:15
**Project Status:** Phase 3-1 Day 3 Complete - Sample Request System MVP API (100%)
**Version:** 3.1.0-alpha

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
文件 → AI 結構化 → 人工審核 → 可運算資料 → 報價/下單
       (draft)     (verified)   (BOM/Costing)  (Sample/Bulk PO)
```

---

## 🔒 核心名詞定義（系統統一語言）

### 1. **BOM（Bill of Materials）物料清單**
- **定義**：定義「一件衣服需要用哪些料、用多少」
- **階段**：開發 / 報價前
- **狀態**：Draft → Confirmed
- **來源**：Tech Pack AI 解析 + 人工確認
- **包含**：material_name, supplier, consumption, unit_price, leadtime
- **本質**：技術與成本基礎資料（跨所有階段共用）

### 2. **Costing / Quote（成衣報價）**
- **定義**：計算一件衣服的成本與報價
- **類型**：
  - **Sample Costing**：樣品報價（小量、高價）
  - **Bulk Costing**：大貨報價（大量、低價、FOB）
- **輸入**：BOM（consumption + unit_price）
- **輸出**：FOB 價格
- **階段**：客戶下單前
- **版本**：v1 / v2 / v3（可多版本）
- **本質**：報價計算與版本管理

### 3. **Sample（樣衣）**
- **定義**：確認款式、版型、工藝的試樣
- **類型**：
  - Proto Sample（初樣）
  - Fit Sample（版型樣）
  - Sales Sample（業務樣）
- **階段**：BULK PO 之前
- **特點**：需要調料（T2 PO for Sample）、需要報價（Sample Costing）

### 4. **BULK PO（大貨成衣訂單）** ⭐ 關鍵分水嶺
- **定義**：客戶下給你的「大貨成衣訂單」
- **內容**：Style / Color / Size / Qty / 交期
- **來源**：客戶（外部）
- **時間點**：報價被接受後
- **用途**：決定要做多少件衣服 → 作為 T2 PO 的依據
- **本質**：成衣訂單（你要出貨給客戶的）

### 5. **PP Sample（Pre-Production Sample）產前樣**
- **定義**：大貨上線前最後確認
- **時間點**：收到 BULK PO 之後、大貨生產之前
- **用料**：用大貨的料、大貨的工藝、大貨的包裝
- **目的**：鎖定所有規格（PP Meeting）
- **本質**：產前鎖定行為（不是開發階段的樣衣）

### 6. **T2 PO（對供應商的採購單）**
- **定義**：你對布廠/副料廠（Tier 2 供應商）下的採購單
- **類型**：
  - **T2 PO for Sample**：樣品物料採購（小量、急、貴）
  - **T2 PO for Bulk**：大貨物料採購（大量、正常交期）
- **依據**：
  - Sample: BOM × 樣品數量
  - Bulk: BULK PO Qty × BOM consumption
- **本質**：採購單（只對供應商）

### 7. **MWO (Manufacturing Work Order) 製造單**
- **定義**：給工廠的生產指令
- **類型**：
  - Sample MWO（樣衣製造單）
  - Bulk MWO（大貨製造單）
- **內容**：Style, BOM, Construction, QC points, Qty, Due date

---

## 🧭 完整系統流程（雙線整合）

### **階段 1：開發與樣衣（BULK PO 之前）**

```
Tech Pack Upload
      ↓
AI Parse → Draft BOM
      ↓
BOM Confirmation (consumption + unit_price)
      ↓
┌──────────────────────────────────────┐
│   多次樣衣循環（Proto → Fit → Sales）  │
│                                      │
│   Sample Costing #1 (樣品報價)        │
│         ↓                            │
│   T2 PO for Sample #1 (調料)         │
│         ↓                            │
│   Proto Sample 製作                  │
│         ↓                            │
│   客戶確認 → 需要修改                 │
│         ↓                            │
│   BOM 調整 → Sample Costing #2       │
│         ↓                            │
│   Fit Sample 製作                    │
│         ↓                            │
│   客戶確認 ✅                         │
└──────────────────────────────────────┘
```

### **階段 2：報價談判（BULK PO 之前）**

```
BOM Confirmed (consumption 鎖定)
      ↓
Bulk Costing v1 (大貨報價)
├─ Material cost (大量採購價)
├─ Labor (大貨工價)
├─ Overhead + Freight
└─ FOB Price: $15/pc
      ↓
發報價給客戶
      ↓
客戶談判：「太貴了，能降嗎？」
      ↓
Bulk Costing v2 (調整報價)
└─ FOB Price: $14.50/pc
      ↓
客戶確認報價 ✅
```

### **階段 3：收到 BULK PO ←────── 【關鍵分水嶺】**

```
BULK PO Received
├─ Style: LW1FLPS
├─ Color: Black, White
├─ Size: XS:500, S:1000, M:1500, L:800, XL:200
├─ Total: 4000 pcs
├─ FOB Price: $14.50/pc
└─ Delivery: 2025-03-15
```

### **階段 4：產前確認（BULK PO 之後）**

```
T2 PO for Bulk (大貨物料採購)
├─ Nulu Fabric: 2100 yds
├─ Lead time: 72 days
└─ Expected: 2025-02-10
      ↓
PP Sample 製作（用大貨料）
      ↓
PP Meeting（產前會議）
├─ 鎖定 BOM consumption ✅
├─ 鎖定工藝 ✅
└─ 鎖定包裝 ✅
      ↓
PP Sample 確認 ✅
```

### **階段 5：大貨生產（PP 確認後）**

```
Material Tracking (物料到貨)
      ↓
Bulk MWO (大貨製造單)
      ↓
Production Tracking
├─ Cutting → Sewing → Ironing → Packing
└─ QC Inspection
      ↓
Shipping
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

---

## 🔒 Phase 2/3 邊界規則（Data Immutability Contract）

> **核心原則：Phase 2 輸出的資料，一旦標記為 confirmed，Phase 3 不得修改其語意，只能引用或複製。**

### Phase 2 輸出定義

**Confirmed 資料（可信任資料）**：
- **BOMItem / Measurement / ConstructionStep**
  - `is_verified = True` **AND**
  - `translation_status = 'confirmed'`
  - 必須有 `verified_by` 和 `verified_at`

**Draft 資料（不可信任）**：
- `is_verified = False` OR `translation_status = 'pending'`
- 僅供參考，不得用於生產流程

---

### Phase 3 使用規則

#### ✅ 允許的操作

1. **讀取 Confirmed 資料**
   - 從 BOMItem 讀取 consumption, unit_price
   - 從 Measurement 讀取尺寸規格
   - 從 ConstructionStep 讀取工序說明

2. **複製到 Phase 3 模型（快照模式）**
   - 生成 T2 PO 時：快照 BOMItem → PO Line
   - 生成 CostSheet 時：快照 BOMItem → CostLine
   - 生成 MWO 時：快照 ConstructionStep → MWO Steps

3. **創建新 Revision**
   - 如需修改，創建 Rev B, Rev C
   - 新 Revision 重新走 Draft → Review → Confirm 流程

#### ❌ 禁止的操作

1. **修改 Phase 2 Confirmed 資料的語意**
   - ❌ 不得自動回寫到 BOMItem.consumption
   - ❌ 不得修改 Measurement.values
   - ❌ 不得更改 ConstructionStep.description

2. **AI 自動覆蓋已確認資料**
   - ❌ 不得用新的 AI 提取結果覆蓋 verified 資料
   - ❌ 不得自動合併/更新翻譯

3. **未經審核使用 Draft 資料**
   - ❌ T2 PO 不得使用 `is_verified = False` 的 BOM
   - ❌ Costing 不得使用 `translation_status = 'pending'` 的物料名稱

---

### 例外情況與處理

#### 情況 1：發現 Confirmed 資料有錯

**處理方式**：
1. 手動 Unverify：`is_verified = False`
2. 修改資料
3. 重新 Verify：`is_verified = True`, 更新 `verified_by`, `verified_at`

**注意**：
- 必須記錄 unverify 原因（notes 欄位）
- Phase 3 已使用該資料的單據需要人工檢查

#### 情況 2：小幅調整（不影響語意）

**允許直接修改**：
- 修正錯別字（material_name）
- 調整單位換算（yards → meters，consumption 同步調整）
- 更新供應商資訊（supplier, supplier_article_no）

**禁止直接修改**：
- Consumption 數值（影響成本計算）
- Material 類型變更（fabric → trim）
- Placement 變更（影響裁剪方案）

---

### 數據流向圖

```
Phase 2 (Foundation)
┌─────────────────────────────────┐
│ Tech Pack PDF                   │
│    ↓ AI Parse                   │
│ Draft Data (JSON)               │
│    ↓ Human Review               │
│ Confirmed Data                  │
│ ✓ is_verified = True            │
│ ✓ translation_status = confirmed│
│ ✓ verified_by, verified_at      │
└─────────────────────────────────┘
          │
          │ READ ONLY (Snapshot Copy)
          ↓
Phase 3+ (Operations)
┌─────────────────────────────────┐
│ T2 PO Lines (快照)              │
│ CostLines (快照)                │
│ MWO Steps (快照)                │
│                                 │
│ ❌ 不得回寫到 Phase 2            │
└─────────────────────────────────┘
```

---

### 開發者檢查清單

在 Phase 3+ 寫代碼時，如果要使用 Phase 2 資料：

- [ ] 確認使用的是 `is_verified = True` 的資料？
- [ ] 確認 `translation_status = 'confirmed'`？
- [ ] 是否使用快照模式（複製），而非引用模式？
- [ ] 是否有回寫邏輯？如果有，立刻刪除！
- [ ] 異常情況是否有人工審核流程？

---

## System Architecture (Modules)

### **Phase 1-2: Foundation (BULK PO 之前)**
1. **Intake（文件中心）** - Tech Pack 上傳與管理
2. **AI Parsing（結構化解析）** - Tech Pack → BOM/Measurement/Construction
3. **Draft Review（審稿系統）** - 雙語疊層、AI 翻譯、人工校正
4. **BOM Management（物料清單）** - 用量與價格管理
5. **Costing（報價系統）** - Sample Costing / Bulk Costing

### **Phase 3-4: Order Management (BULK PO 階段)**
6. **Sample Management** - Proto/Fit/Sales 樣衣追蹤
7. **BULK PO** - 大貨訂單管理
8. **PP Sample** - 產前樣確認

### **Phase 5-6: Production (大貨生產)**
9. **T2 PO** - 物料採購與追蹤
10. **MWO** - 製造單生成
11. **Production** - 生產追蹤
12. **Shipping** - 出貨追蹤

---

## Phase 2 規劃（當前重點）⭐

### **Phase 2 定位**

> **Phase 2 = 在「沒有 BULK PO」的世界裡，完成 BOM → Costing（Sample & Bulk）的可用系統**

### **Phase 2 邊界鎖定**

#### ✅ Phase 2 允許存在
- BOM（通用，Draft/Confirmed）
- CostSheet（Sample Costing / Bulk Costing）
- CostLine（Lite，snapshot only）

#### ❌ Phase 2 嚴格禁止
- BULK PO（Phase 4）
- T2 PO for Sample/Bulk（Phase 3/4）
- PP Sample（Phase 4）
- Production/MWO（Phase 5）
- 任何 qty × consumption 計算

---

### **Phase 2 數據模型**

#### 1. BOMItem（擴展版）
```python
class BOMItem(models.Model):
    revision = ForeignKey(Revision)

    # 物料識別
    material_name, supplier, category, unit
    supplier_article_no, color

    # 用量與成本
    consumption = DecimalField  # per garment
    unit_price = DecimalField
    wastage_rate, leadtime_days

    # 狀態
    consumption_status = CharField  # draft/confirmed
    material_status = CharField

    # 元數據
    ai_confidence, is_verified
```

#### 2. CostSheet（Sample & Bulk 共用）
```python
class CostSheet(models.Model):
    revision = ForeignKey(Revision)
    costing_type = CharField  # sample/bulk
    version_no = IntegerField
    is_current = BooleanField

    # 成本輸入
    labor_cost, overhead_cost, freight_cost

    # 定價參數
    margin_pct = DecimalField  # 30%
    wastage_pct = DecimalField  # 5%

    # 計算結果快照
    material_cost, total_cost, unit_price
```

#### 3. CostLine（Lite - Snapshot Only）
```python
class CostLine(models.Model):
    cost_sheet = ForeignKey(CostSheet)
    bom_item = ForeignKey(BOMItem)

    # 快照（報價當下）
    material_name, supplier, category, unit
    consumption, unit_price

    # 計算結果
    line_cost = DecimalField
```

---

### **Phase 2 API 端點**

1. **POST** `/api/v2/revisions/{id}/cost-sheets/` - 生成新版本
2. **GET** `/api/v2/cost-sheets/{id}/` - 查詢報價（含明細）
3. **PATCH** `/api/v2/cost-sheets/{id}/` - 更新 Summary
4. **GET** `/api/v2/revisions/{id}/cost-sheets/` - 版本列表

---

### **Phase 2 UI 設計**

#### BOM 頁面（90% 完成）
- ✅ TanStack Table
- ✅ Inline edit: consumption
- ⏳ Inline edit: unit_price
- ⏳ Status dropdowns
- ✅ Edit drawer
- ✅ 搜尋、排序

#### Costing 頁面（待開發）
```
[ Header ] Costing Type: Sample/Bulk | Version: v1/v2/v3

[ Summary Card ]
- Material Cost: $45.30 (from lines)
- Labor/Overhead/Freight: [editable]
- Wastage %: [editable]
- Margin %: [editable]
→ Unit Price: $79.00 (大字)

[ Cost Lines Table - Read Only ]
- Material | Consumption | Unit Price | Line Cost
- Total: $45.30

[ Actions ] Save | Duplicate
```

---

## 當前狀態（2025-12-28 22:30）⭐

### ✅ 已完成

#### Phase 1: Foundation
- ✅ Django 4.2.8 + DRF setup（8 apps, 9 migrations）
- ✅ Next.js 14 frontend setup
- ✅ Core models: Style, Revision, BOMItem
- ✅ Real BOM data imported（**15 items**, 4 categories）⭐ **完整**

#### Draft Review UI (100% ✅)
- ✅ Block extraction（pdfplumber + Vision LLM）
- ✅ AI Translation（GPT-4o Mini）
- ✅ Bilingual Overlay System
- ✅ Coverage Panel（翻譯完整性統計）
- ✅ User validation passed

#### BOM Editor UI (90% ✅)
- ✅ TanStack Table v8 implementation
- ✅ BOM 列表頁：`/dashboard/revisions/{id}/bom`
- ✅ Inline edit consumption（debounced auto-save）
- ✅ Edit drawer（完整欄位編輯）
- ✅ Optimistic updates + rollback
- ✅ Visual feedback（saving/saved/error icons）
- ✅ 全局搜尋、排序
- ✅ API 正常運作（GET/PATCH）

#### Backend
- ✅ BOM API（GET/PATCH）
- ✅ API 路徑修正
- ✅ 真實數據導入

#### Phase 2-2: Costing Backend (100% ✅) **NEW**
- ✅ CostSheet + CostLine models（含 3 個微調點）
  - Micro-adjustment #1: Decimal + quantize（避免浮點誤差）
  - Micro-adjustment #2: 獨立 sort_order（不依賴 item_number）
  - Micro-adjustment #3: Transaction 保護 is_current 標記
- ✅ Migrations 創建並應用（0001_initial, 0002_alter_revision）
- ✅ 4 個 API 全部實作並測試通過：
  - POST `/api/v2/revisions/{id}/cost-sheets/` - 生成新版本（快照 BOM）
  - GET `/api/v2/revisions/{id}/cost-sheets/` - 版本列表（可篩選）
  - GET `/api/v2/cost-sheets/{id}/` - 單一詳細（含 nested lines）
  - PATCH `/api/v2/cost-sheets/{id}/` - 更新 summary（自動重算）
- ✅ 真實測試數據：LW1FLWS（**15 BOM items** → **15 CostLines**）⭐ **完整**
  - BOM 包含：7 fabric + 4 trim + 2 label + 2 packaging
  - Material cost: $9.51
  - Sample: Total $39.01 → Unit Price $60.02（35% margin）
  - Bulk: Total $28.51 → Unit Price $38.01（25% margin）
- ✅ 快照模式驗證（BOM 改動不影響已生成 CostSheet）
- ✅ 資料連貫性驗證（5/5 測試通過）⭐ **NEW**
  - BOM 完整性：15/15 ✓
  - Cost Lines 映射：15/15 ✓
  - 金額計算正確性 ✓
  - 前端 API 可用性 ✓

---

### ✅ Phase 2 完成（100%）⭐ NEW

#### Phase 2-1: BOM 完善（100% ✅ **真正完成**）
- ✅ Inline edit consumption
- ✅ Edit drawer
- ✅ Search & sort
- ✅ Verification tracking（verified_by, verified_at）⭐ NEW
- ✅ Translation status（pending/confirmed）⭐ NEW
- ✅ UI confirmation visual（綠色邊框 + ✓ 圖示）⭐ NEW
- ✅ Phase 2/3 boundary declaration ⭐ NEW

#### Phase 2-2: Costing System (100% ✅ **完成**)

**Backend (100% ✅):**
- ✅ CostSheet + CostLine models（含 3 個微調點）
- ✅ Migrations（2 個）
- ✅ Generate API（POST）
- ✅ Query/Update API（GET/PATCH）
- ✅ 真實數據測試通過

**Frontend (100% ✅):**
- ✅ `/dashboard/revisions/{id}/costing` 路由
- ✅ Summary card（material/labor/overhead/margin/unit_price）
- ✅ Cost lines table（TanStack Table, read-only）
- ✅ Version switcher（Sample/Bulk tabs）
- ✅ Generate new version button + dialog
- ✅ Edit summary fields form + dialog
- ✅ React Query hooks（4個）
- ✅ TypeScript types（完整）
- ✅ UI 可用性修復（2025-12-28 19:00）：
  - shadcn/ui CSS 變數配置（globals.css + tailwind.config.ts）
  - API 路徑修正（/api/v2）
  - Dialog 背景正常顯示
  - 所有功能驗證通過

**Integration Test (100% ✅):**
- ✅ 11 test cases passed
- ✅ Generate Sample/Bulk costing
- ✅ Update cost sheet summary
- ✅ Version management（auto-increment, is_current flag）
- ✅ Independent version sequences（Sample vs Bulk）
- ✅ Auto-calculation accuracy verified
- ✅ Frontend rendering verified
- ✅ Test report: `1228-02.txt`

**預估時間:**
- ~~Phase 2-2 Backend: 1 天~~ ✅ **完成**
- ~~Phase 2-2 Frontend: 1 天~~ ✅ **完成**
- ~~Phase 2-2 Integration: 0.5 天~~ ✅ **完成**
- Phase 2-1 剩餘: 0.5 天
- **剩餘: 0.5 天**

---

---

### ✅ Phase 3-1: Sample Request System MVP API（100% ✅）⭐ **NEW (2025-12-29)**

#### Django App 創建
- ✅ 創建 apps.samples app（7 個核心模型）
- ✅ 註冊到 INSTALLED_APPS
- ✅ Migrations 生成並應用（0001_initial）
- ✅ Django Admin 配置（7 個模型 + Inline）

#### 核心模型（7 張表）
- ✅ **SampleRequest** - 樣衣請求（核心實體，Request-based 設計）
- ✅ **SampleCostEstimate** - 樣衣報價（多版本支援，JSON 彈性）
- ✅ **T2POForSample** + **T2POLineForSample** - 樣品調料採購單（快照模式）
- ✅ **SampleMWO** - 樣衣製造單（JSON 快照：BOM/Construction/QC）
- ✅ **Sample** - 實體樣衣（可多件/多次迭代）
- ✅ **SampleAttachment** - 附件/照片（Request 或 Sample 級別）

#### API 實作（Day 3 MVP）
- ✅ **7 個 ModelViewSet**（CRUD + select_related/prefetch_related 優化）
- ✅ **8 個 workflow actions**（submit/quote/approve/reject/cancel/start_execution/complete/allowed_actions）
- ✅ **SafeModelSerializer**（Phase 2/3 邊界保護，防止 draft 後修改敏感欄位）
- ✅ **Service 層狀態機**（transitions.py，264 lines，集中化邏輯）
- ✅ **DRF Router 配置**（7 個資源端點）
- ✅ **Query params filtering**（sample_request_id, t2po_id 等）

#### 測試套件（9/9 通過）✅
- ✅ **9 個 API 測試**（100% 通過，6.85s）
- ✅ **Phase 2/3 邊界保護測試**（test_phase23_boundary_no_bom_fk）
- ✅ **狀態機邏輯測試**（submit/approve/reject transitions）
- ✅ **業務規則驗證測試**（quote/approve/complete prerequisites）
- ✅ **pytest 配置**（pytest.ini）

#### Phase 2/3 邊界規則遵守（架構驗證）
- ✅ **NO FK to BOMItem**（快照欄位取代，測試驗證）
- ✅ **快照模式**（snapshot_hash, snapshot_at, source_revision_id）
- ✅ **狀態保護**（SafeModelSerializer 防止 draft 後修改）
- ✅ **只讀 Phase 2**（confirmed 資料，無回寫邏輯）
- ✅ **業務規則驗證**（prerequisites：quote → estimate, approve → accepted estimate, complete → delivered sample）

#### 可用 API 端點（33 個）
**CRUD 端點（RESTful）:**
- `/api/v2/sample-requests/`（GET/POST/GET{id}/PATCH{id}/DELETE{id}）
- `/api/v2/sample-attachments/`
- `/api/v2/sample-cost-estimates/`
- `/api/v2/t2pos-for-sample/`
- `/api/v2/t2po-lines-for-sample/`
- `/api/v2/sample-mwos/`
- `/api/v2/samples/`

**Workflow Actions（8 個）:**
- `POST /api/v2/sample-requests/{id}/submit/`
- `POST /api/v2/sample-requests/{id}/quote/`
- `POST /api/v2/sample-requests/{id}/approve/`
- `POST /api/v2/sample-requests/{id}/reject/`
- `POST /api/v2/sample-requests/{id}/cancel/`
- `POST /api/v2/sample-requests/{id}/start-execution/`
- `POST /api/v2/sample-requests/{id}/complete/`
- `GET  /api/v2/sample-requests/{id}/allowed-actions/`

#### 實作亮點
1. **ViewSet + @action 架構** - 不是 19 個散亂 API views，7 個清晰 ViewSet
2. **Service 層狀態機** - 邏輯集中在 services/transitions.py，易於測試和維護
3. **SafeModelSerializer** - 自動保護 draft 後敏感欄位（READ_ONLY_ON_SUBMITTED）
4. **業務規則驗證** - Prerequisites 檢查（quote/approve/complete）
5. **Phase 2/3 邊界保護** - 快照模式 + 架構測試驗證

#### 檔案結構
```
backend/apps/samples/
├── models.py              (754 lines - 7 models)
├── serializers.py         (183 lines)
├── views.py               (285 lines - 7 ViewSets)
├── urls.py                (67 lines)
├── admin.py               (211 lines)
├── services/
│   └── transitions.py     (264 lines - State machine)
├── tests/
│   └── test_api_sample_request.py (356 lines - 9 tests)
└── migrations/
    └── 0001_initial.py
```

#### 測試結果
```
9 passed, 3 warnings in 6.85s

關鍵測試：
✓ test_create_sample_request_ok
✓ test_submit_transition_ok
✓ test_submit_forbidden_after_submission（邊界保護）
✓ test_phase23_boundary_no_bom_fk（架構驗證）
✓ test_quote_requires_estimate（業務規則）
✓ test_approve_requires_accepted_estimate_when_quote_needed
✓ test_complete_requires_delivered_sample
✓ test_allowed_actions_endpoint
✓ test_attachment_creation_ok
```

---

### 📋 Phase 3+ 規劃（進行中）

#### Phase 3-2: Day 4 計劃
- [ ] 補齊剩餘 actions（T2 PO/MWO generate/preview）
- [ ] 從 Phase 2 Costing 複製估價功能
- [ ] 快照生成 service 函數（create_t2po_from_request, create_mwo_from_request）
- [ ] 更多測試（T2 PO/MWO 生成、快照完整性）
- [ ] API 文檔（drf-spectacular）

#### Phase 3-3: Sample Management UI
- [ ] Sample Request 列表頁
- [ ] Sample Request 詳情工作台
- [ ] Estimate/T2PO/MWO 生成 UI
- [ ] 狀態轉換 UI

#### Phase 4: BULK PO & PP
- BULK PO 系統
- PP Sample 管理
- PP Meeting 流程

#### Phase 5: Bulk Procurement
- T2 PO for Bulk
- Material Tracking

#### Phase 6: Bulk Production
- Bulk MWO 生成
- Production Tracking

---

## 重要提醒

### 名詞對照表（避免混淆）

| 正確名詞 | 錯誤/混淆說法 | 說明 |
|---------|-------------|------|
| **BOM** | 物料表、料表 | Bill of Materials |
| **Costing** | 報價單、Quote | 成衣報價計算 |
| **Sample Costing** | 樣品報價 | 小量、高價 |
| **Bulk Costing** | 大貨報價 | 大量、低價、FOB |
| **BULK PO** | 訂單、成衣訂單 | 客戶下的大貨成衣訂單 |
| **T2 PO** | 採購單、PO | 對供應商的採購單 |
| **PP Sample** | 產前樣 | BULK PO 之後的最終確認 |

### 系統時序對照表

| 階段 | 商業事件 | 允許存在的 Model |
|------|---------|----------------|
| **開發/樣衣** | Proto/Fit Sample | Revision, BOMItem, CostSheet(sample) |
| **報價談判** | Bulk Costing v1/v2 | Revision, BOMItem, CostSheet(bulk) |
| **收到 BULK PO** | ⭐ 分水嶺 | **BulkPO（Phase 3+）** |
| **產前** | PP Sample | PPSample |
| **大貨採購** | T2 PO for Bulk | T2PO |
| **大貨生產** | Production | MWO, Tracking |

---

## 技術棧

### Backend
- Django 4.2.8
- Django REST Framework
- PostgreSQL
- Celery（非同步任務）

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- TanStack Query (React Query)
- TanStack Table v8
- shadcn/ui
- Tailwind CSS

### AI/ML
- OpenAI GPT-4o (Vision API)
- pdfplumber (PDF 文字提取)
- react-pdf (PDF 顯示)

---

## 服務器狀態

- ✅ Django backend: `http://localhost:8000`
- ✅ Next.js frontend: `http://localhost:3000`

### 測試 URLs
- BOM 列表：`http://localhost:3000/dashboard/revisions/abbfd005-159b-4ad8-a3cc-87c73098fc81/bom`
- Draft Review：`http://localhost:3000/dashboard/revisions/d3be25b0-01e5-4e3d-afe8-ca9578f1ebb2/review`
- **Costing（智能按鈕）**：`http://localhost:3000/dashboard/revisions/abbfd005-159b-4ad8-a3cc-87c73098fc81/costing` ⭐ NEW

---

## 文檔索引

- **CLAUDE.md**（本文件）：專案概覽、商業流程、當前進度
- **CLAUDE-TECHNICAL.md**：技術細節、API 規格、環境變數
- **VISION-LLM-WORKFLOW.md**：Vision LLM 提取流程、成本分析
- **SESSION_2025-12-27_COMPLETE.md**：2025-12-27 完整會議記錄（Draft Review UI）
- **SESSION_2025-12-28_COMPLETE.md**：2025-12-28 上午會議記錄（Phase 2-2I Version Policy）
- **SESSION_2025-12-28_DATA-INTEGRITY.md**：2025-12-28 晚上會議記錄（BOM 補齊 + 資料連貫性驗證）⭐ **NEW**
- **docs/DATABASE-SCHEMA_v2.2.1_COMPLETE2.md**：數據庫 schema
- **docs/API-SPEC_v2.2.1_COMPLETE.md**：API 規格
- **docs/DECISIONS_v2.2.1.md**：架構決策記錄

### Phase 2-2I Reports (2025-12-28)
- **1228-03.txt**：後端實作報告（635 行）
- **1228-04-frontend.txt**：前端實作報告（843 行）
- **1228-05-COMPLETE.txt**：完整總結報告（1000+ 行）
- **1228-06-TESTS-PASSED.txt**：驗收測試報告
- **1228-07-UI-FIXES.txt**：UI 可用性修復報告（shadcn/ui + API 路徑）

### Phase 2-1 Completion (2025-12-28)
- **PHASE-2-1-FIX-PLAN.md**：修復計劃（真正 Done 標準）
- **PHASE-2-1-COMPLETION-REPORT.md**：驗收報告（3 個自我測試）

### Phase 2 Data Integrity (2025-12-28 晚上) ⭐ **NEW**
- **SESSION_2025-12-28_DATA-INTEGRITY.md**：完整會議記錄
  - 刪除重複 Style
  - BOM 補齊（7 → 15 筆，添加 trim/label/packaging）
  - 重新生成完整 Costing（Sample + Bulk，各 15 lines）
  - 5/5 資料連貫性驗證測試通過
  - 前端 API 全部可用

### Phase 3 Design (2025-12-28)
- **PHASE-3-SAMPLE-REQUEST-DESIGN.md**：樣衣請求系統設計（Request-based，非 Flow-based）⭐ NEW
  - DB Schema（7 張表）
  - API Spec（19 個端點）
  - UI Spec（3 個頁面）
  - Phase 2/3 邊界檢查清單

---

**Last Updated:** 2025-12-28 20:45
