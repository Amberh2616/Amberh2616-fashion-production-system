# Fashion Production System - Claude Project Memory

**Last Updated:** 2025-12-28 20:30
**Project Status:** Phase 2-2 Backend Complete (100%) - BOM Editor 90% + Costing APIs Tested
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

## 當前狀態（2025-12-28 18:00）

### ✅ 已完成

#### Phase 1: Foundation
- ✅ Django 4.2.8 + DRF setup（8 apps, 9 migrations）
- ✅ Next.js 14 frontend setup
- ✅ Core models: Style, Revision, BOMItem
- ✅ Real BOM data imported（7 items, 13 fields）

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
- ✅ 真實測試數據：LW1FLWS（7 BOM items → 7 CostLines）
  - Material cost: $5.50
  - Total cost: $29.50 → $32.50（更新後）
  - Unit price: $42.15 → $50.01（35% margin）
- ✅ 快照模式驗證（BOM 改動不影響已生成 CostSheet）

---

### 🚧 Phase 2 進行中

#### Phase 2-1: BOM 完善（剩餘 10%）
- [ ] Unit price inline edit
- [ ] Consumption status dropdown
- [ ] Material status enum dropdown

#### Phase 2-2: Costing System（Backend 100% ✅, Frontend 待開發）
- ✅ CostSheet + CostLine models（含 3 個微調點）
- ✅ Migrations（2 個）
- ✅ Generate API（POST）
- ✅ Query/Update API（GET/PATCH）
- ✅ 真實數據測試通過
- [ ] **Costing UI 頁面（下一步）**
  - [ ] `/dashboard/revisions/{id}/costing` 路由
  - [ ] Summary card（material/labor/overhead/margin/unit_price）
  - [ ] Cost lines table（TanStack Table, read-only）
  - [ ] Version switcher（v1/v2/v3）
  - [ ] Generate new version button
  - [ ] Edit summary fields form
- [ ] 整合測試（BOM → Costing 完整流程）

**預估時間:**
- ~~Phase 2-2 Backend: 1 天~~ ✅ **完成**
- Phase 2-2 Frontend: 1 天
- Phase 2-1 剩餘: 0.5 天
- **剩餘: 1.5 天**

---

### 📋 Phase 3+ 規劃（延後）

#### Phase 3: Sample Management
- Sample 管理（Proto/Fit/Sales）
- Sample MWO 生成
- T2 PO for Sample
- Sample Tracking

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

---

## 文檔索引

- **CLAUDE.md**（本文件）：專案概覽、商業流程、當前進度
- **CLAUDE-TECHNICAL.md**：技術細節、API 規格、環境變數
- **VISION-LLM-WORKFLOW.md**：Vision LLM 提取流程、成本分析
- **SESSION_2025-12-27_COMPLETE.md**：2025-12-27 完整會議記錄
- **docs/DATABASE-SCHEMA_v2.2.1_COMPLETE2.md**：數據庫 schema
- **docs/API-SPEC_v2.2.1_COMPLETE.md**：API 規格
- **docs/DECISIONS_v2.2.1.md**：架構決策記錄

---

**Last Updated:** 2025-12-28 18:00
