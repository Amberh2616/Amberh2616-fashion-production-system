# Fashion Production System - Business Flow

**Last Updated:** 2026-01-12

此文檔詳細說明系統的業務流程、數據模型和核心設計思想。

---

## 目錄

- [核心產品思想](#核心產品思想)
- [完整業務流程](#完整業務流程)
- [用量數據流](#用量數據流)
- [報價流程設計](#報價流程設計)
- [觸發點設計](#觸發點設計)
- [Tech Pack 翻譯流程](#tech-pack-翻譯流程)

---

## 核心產品思想

> **這是整個系統的核心靈魂，所有功能設計必須圍繞這個思想。**

### 主要用戶：成衣廠（Garment Factory）

```
┌─────────────────────────────────────────────────────────────────┐
│                    系統核心定位                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ❌ 錯誤理解：「品牌強迫供應商用這個系統」                        │
│                                                                 │
│  ✅ 正確理解：「成衣廠自己想用，品牌順便得到監控」                │
│                                                                 │
│  主要用戶 = 成衣廠（操作者、付費者）                             │
│  次要受益者 = 品牌（獲得可視性，減少派人監督成本）               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 成衣廠的價值主張

```
成衣廠為什麼想用這套系統？
├── 1. 省人力（1 套系統 = 10-20 人的跟單工作）
├── 2. 更好的進度監控（AI 智能追蹤，不遺漏）
├── 3. 減少錯誤（BOM 自動計算，採購不漏項）
├── 4. 資料可追溯（客戶投訴時有證據）
└── 5. 決策依據（成本透明、風險可見）
```

### 品牌的附加價值

```
品牌為什麼喜歡供應商用這套系統？
├── 1. 不用派人去工廠盯進度（系統自動同步）
├── 2. WIP 狀態即時可見（Supplier Portal）
├── 3. 交期預測更準確（AI 風險預警）
├── 4. 品質問題可追溯（審計日誌）
└── 5. 省監督人力成本（AI 代替人工追蹤）
```

### 商業模式

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  成衣廠付費 → 得到省人力的工具                                   │
│       ↓                                                         │
│  品牌免費獲得 → 供應鏈可視性（Supplier Portal）                  │
│       ↓                                                         │
│  雙贏 → 成衣廠省錢，品牌省人力，都開心                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

這就是為什麼系統值 NT$3,000,000+：
├── 對成衣廠：年省 NT$3,500,000+ 人力成本
├── 對品牌：免費獲得供應商監控（品牌不用付錢）
└── 對你：成衣廠付費，品牌推薦使用
```

---

## 完整業務流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           成衣廠完整工作流程                                 │
└─────────────────────────────────────────────────────────────────────────────┘

【Phase 1: 開發階段】 ✅ 已完成
───────────────────────────────────────────────────────────────────────────────
Tech Pack 上傳 → AI 解析 → BOM 提取 → 翻譯審校 → Style/Revision 批准


【Phase 2: 樣衣階段】 ✅ 已完成
───────────────────────────────────────────────────────────────────────────────
SampleRequest
├── Run 1: Proto Sample (原版樣) → Estimate ✅ 需報價
├── Run 2: Fit Sample (尺寸樣) → Estimate ✅ 需報價
├── Run 3: Size Set Sample (全套尺寸樣) → Estimate ✅ 需報價
│                                              │
│   ════════════════════════════════════════════════════════════════════════
│   📍 用量確認 (confirmed_value → locked_value)
│   📍 大貨報價 (CostSheet Bulk)
│   📍 客戶確認下單 → ProductionOrder
│   ════════════════════════════════════════════════════════════════════════
│
├── Run 4: PP Sample (產前樣) → ❌ 不報價（價格已定）
└── Run 5: TOP Sample (頭缸樣) → ❌ 不報價（從大貨扣除）


【Phase 3: 報價階段】
───────────────────────────────────────────────────────────────────────────────
CostSheet (Bulk Costing)
├── 用量：locked_value (鎖定用量)
├── 物料成本 = BOM × locked_value × 單價 × (1 + 損耗%)
├── 人工成本 + 製造費用 + 利潤 margin
└── 輸出：報價單 PDF → 發給客戶


【Phase 4: 大貨階段】 ✅ P17+ 完成
───────────────────────────────────────────────────────────────────────────────
ProductionOrder (大貨訂單) ✅
├── 客戶確認報價 → 下單
├── 尺碼分解 (S=1000, M=3000, L=4000, XL=2000)
└── 總數量：10,000 件
         │
         ↓
MaterialRequirement (物料需求計算 MRP) ✅
├── 每個 BOM 項目：訂單數量 × consumption × (1 + 損耗%)
└── 輸出：物料需求清單（自動計算）
         │
         ↓ ⭐ 每筆物料單獨審核
         │
├── 審核：確認數量、單價、需求日期、預計交期
├── 下採購單：每筆物料生成獨立 PO（方便追蹤）
└── 交期追蹤：pending → shipped → received
         │
         ↓
PurchaseOrder (每筆物料獨立採購單) ✅
├── 下載 PDF → 發送給供應商
└── 追蹤交期 + 收貨狀態
```

### 樣衣類型對照表

| Run | 類型 | 數量 | 需報價？ | 說明 |
|-----|------|------|----------|------|
| 1 | Proto Sample (原版樣) | 1-3 件 | ✅ 是 | 確認版型設計 |
| 2 | Fit Sample (尺寸樣) | 2-5 件 | ✅ 是 | 確認合身度 |
| 3 | Size Set Sample (全套尺寸樣) | 5-50 件 | ✅ 是 | 最後報價樣 |
| | **═══ 大貨報價 + 下單 ═══** | | | |
| 4 | PP Sample (產前樣) | 10-30 件 | ❌ 否 | 價格已定 |
| 5 | TOP Sample (頭缸樣) | 50+ 件 | ❌ 否 | 從大貨扣除 |

---

## 用量數據流

### 三階段成熟度

```
BOMItem.consumption (原始用量 - Tech Pack 標註)
     │
     ├──→ pre_estimate_value (預估用量)
     │    ├─ 來源：工廠經驗估算
     │    └─ 用途：RFQ 詢價單 ✅
     │
     ├──→ confirmed_value (確認用量)
     │    ├─ 來源：Marker Report / 樣衣實際
     │    └─ 用途：RFQ ✅ / 大貨報價 ✅ / 生產採購 ✅
     │
     └──→ locked_value (鎖定用量)
          ├─ 來源：大貨確認鎖定（不可再改）
          └─ 用途：最終生產採購 ✅ / MRP 計算 ✅ / 成本結算 ✅
```

### 採購數量計算公式

```
採購數量 = 訂單數量 × locked_value × (1 + wastage_pct%)

範例：
= 10,000 件 × 0.82 yd × 1.05 = 8,610 yards
```

### MRP 計算公式

```
gross_requirement = order_quantity × consumption_per_piece
wastage_quantity = gross_requirement × wastage_pct%
total_requirement = gross_requirement + wastage_quantity
order_quantity_needed = max(0, total_requirement - current_stock)
```

---

## 報價流程設計

### 統一報價架構（P18）

```
【Phase 1: 樣衣報價】Run 1-3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SampleRun (Proto/Fit/Size Set)
       │
       ├──→ UsageScenario (purpose='sample_quote')
       │         └──→ UsageLine[] (consumption = pre_estimate_value)
       │
       └──→ CostSheetVersion (costing_type='sample')
                 ├── material_cost (從 CostLineV2 計算)
                 ├── labor_cost (手工輸入或預設)
                 ├── overhead_cost
                 └── unit_price (含利潤)

                   ════════════════════════════════════════
                   📍 Size Set 完成後，用量鎖定
                   📍 confirmed_value → locked_value
                   ════════════════════════════════════════

【Phase 2: 大貨報價】客戶詢價
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⭐ CostSheetVersion (costing_type='bulk')
       │
       ├──→ cloned_from = 最後一版 Sample CostSheet ⬅️ 關鍵連結！
       │
       ├──→ UsageScenario (purpose='bulk_quote')
       │         └──→ UsageLine[] (consumption = locked_value)
       │
       ├── material_cost (從鎖定用量重新計算)
       ├── labor_cost (可能因量大調整)
       ├── quantity_based_discount (量大折扣)
       └── unit_price (大貨價)

                   ════════════════════════════════════════
                   📍 客戶確認報價 → status = 'accepted'
                   ════════════════════════════════════════

【Phase 3: 生產訂單】客戶下單
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ProductionOrder
       ├──→ bulk_costing FK = CostSheetVersion (accepted)
       ├── unit_price (成交價，從報價帶入)
       └──→ MaterialRequirement[] (MRP 計算)
```

### 報價模型架構

```
UsageScenario (用量場景)
├── purpose: 'sample_quote' | 'bulk_quote'
├── version_no
└── UsageLine[] (物料用量)
         │
         ↓
CostSheetVersion (報價版本)
├── costing_type: 'sample' | 'bulk'
├── status: draft → submitted → accepted/rejected
├── cloned_from FK (版本追溯) ⭐ 核心連結
└── CostLineV2[] (成本明細)
```

### 連貫性設計要點

| 項目 | 設計 |
|------|------|
| **用量演進** | `pre_estimate_value` → `confirmed_value` → `locked_value` |
| **報價版本** | Sample v1 → v2 → Bulk v1 (cloned_from = Sample v2) |
| **價格追溯** | Bulk 報價可追溯到原始 Sample 報價 |
| **差異分析** | 比較 Sample vs Bulk 價格差異原因 |
| **狀態連動** | Sample accepted → 觸發 Bulk quote 創建按鈕顯示 |

---

## 觸發點設計

### 完整流程觸發點

| 觸發點 | 按鈕文字 | 位置 | 顯示條件 | API |
|--------|----------|------|----------|-----|
| T1 | Create Sample Request | Revision 詳情頁 | Revision approved | `POST /sample-requests/` |
| T2 | Edit Costing | Kanban Run 卡片 | Run 存在 | - |
| T3 | Submit Quote | Costing 編輯頁 | status='draft' | `POST /cost-sheets/{id}/submit/` |
| T4 | Accept Quote | Kanban 狀態按鈕 | status='quoted' | `POST /sample-runs/{id}/accept/` |
| T5 | Sample Done | Kanban 狀態按鈕 | Size Set Run | `POST /sample-runs/{id}/complete/` |
| **T6** | **Create Bulk Quote** | Request 詳情頁 | Size Set completed | `POST /cost-sheets/{id}/create-bulk-quote/` |
| T7 | Submit Bulk Quote | Bulk Costing 頁 | status='draft' | `POST /cost-sheets/{id}/submit/` |
| **T8** | **Create Production Order** | Bulk CostSheet 頁 | Bulk accepted | `POST /production-orders/` |
| T9 | Confirm Order | PO 詳情頁 | status='draft' | `POST /production-orders/{id}/confirm/` |
| T10 | Generate PO | PO 詳情頁 | status='confirmed' | `POST /production-orders/{id}/generate-po/` |

### 流程連結完整性

```
SampleRun (Size Set, accepted)
     │
     ├──→ costing_version FK → CostSheetVersion (sample)
     │                              │
     │                              ↓ POST /create-bulk-quote/
     │                         CostSheetVersion (bulk, accepted)
     │                              │
     │                              ↓ POST /create-production-order/
     │                         ProductionOrder
     │                              ├──→ bulk_costing FK
     │                              ├──→ approved_sample_run FK ← 反向連結！
     │                              │
     │                              ↓ POST /generate-po/
     │                         PurchaseOrder + POLine
     │                              │
     │                              ↓ Signal: post_save
     │                         MaterialRequirement.status = 'ordered'/'received'
```

---

## Tech Pack 翻譯流程

### 完整流程

```
階段 1：上傳與分類
  └→ /dashboard/upload
  └→ POST /api/v2/uploaded-documents/
  └→ POST /api/v2/uploaded-documents/{id}/classify/

階段 2：AI 提取
  └→ /dashboard/documents/{id}/review
  └→ POST /api/v2/uploaded-documents/{id}/extract/
  └→ 創建 TechPackRevision + DraftBlocks
  └→ 返回 tech_pack_revision_id

階段 3：人工審校
  └→ ⚡ 自動導航（2秒後）到 /dashboard/revisions/{id}/review
  └→ PATCH /api/v2/draft-blocks/{id}/ （編輯 edited_text）
  └→ POST /api/v2/revisions/{id}/approve/

階段 4：BOM/Spec 翻譯
  └→ /dashboard/revisions/{id}/bom - BOM 翻譯編輯
  └→ /dashboard/revisions/{id}/spec - Spec 翻譯編輯
  └→ 單項翻譯 + 批量 AI 翻譯

階段 5：MWO 完整匯出
  └→ GET /api/v2/sample-runs/{id}/export-mwo-complete-pdf/
  └→ 封面 + Tech Pack（中文疊加）+ BOM + Spec
  └→ Pillow + PyMuPDF 渲染中文
```

### 雙 Revision 設計

系統創建兩個 Revision 類型：

| Revision 類型 | 用途 | 關聯數據 |
|---------------|------|----------|
| `StyleRevision` | BOM/Measurement 編輯 | BOMItem, Measurement |
| `TechPackRevision (Revision)` | DraftBlocks 翻譯審校 | DraftBlock |

### MWO 匯出內容

```
┌─────────────────────────────────────────┐
│              SampleMWO                  │
├─────────────────────────────────────────┤
│ 1. 封面頁（中英雙語 MWO 資訊）           │
│                                         │
│ 2. Tech Pack (做工和結構)                │
│    └── 中文疊加在原圖上                  │
│                                         │
│ 3. BOM (物料清單)                        │
│    └── 含中文翻譯（藍色字）              │
│                                         │
│ 4. Spec (尺寸表)                         │
│    └── 含中文翻譯（藍色字）              │
└─────────────────────────────────────────┘
```

---

## 資料模型

### 核心關聯

```
Style → Revision → BOMItem (Verified)
                 → Measurement
                 → SampleRequest → SampleRun → MWO
                                            → CostSheetVersion
                                            → PurchaseOrder
                 → ProductionOrder → MaterialRequirement → PurchaseOrder
```

### 狀態機

#### SampleRun

```
DRAFT → SUBMITTED → QUOTED → PENDING_APPROVAL → APPROVED
                                              → REJECTED
APPROVED → MATERIALS → PO_ISSUED → IN_PRODUCTION → COMPLETED
ANY → CANCELLED
```

**12 狀態詳細：**

| 狀態 | 進度 | 說明 |
|------|------|------|
| draft | 0% | 草稿 |
| materials_planning | 10% | 物料規劃中 |
| po_drafted | 20% | PO 已起草 |
| po_issued | 30% | PO 已發出 |
| mwo_drafted | 40% | MWO 已起草 |
| mwo_issued | 50% | MWO 已發出 |
| in_progress | 60% | 生產中 |
| sample_done | 70% | 樣衣完成 |
| actuals_recorded | 80% | 實際數據已記錄 |
| costing_generated | 90% | 成本已生成 |
| quoted | 95% | 已報價 |
| accepted | 100% | 已接受 |

#### PurchaseOrder

```
draft → sent → confirmed → partial_received/received
any → cancelled
```

#### ProductionOrder

```
draft → confirmed → materials_ordered → in_production → completed
```

#### CostSheetVersion

```
draft → submitted → accepted/rejected
```

---

## 設計原則

1. **快照原則**：Run 的 BOM/Operation 是複製，不是 FK
2. **不可回寫**：Phase 3 資料不得修改 Phase 2 的 verified 資料
3. **採購拆單**：T2 PO 按供應商拆分，分 Draft/Issued
4. **文件編號**：MWO-YYMM-XXXXXX 格式，用 sequence 避免撞號
5. **SampleRun 是唯一的「執行真相來源」**：MWO / Estimate / T2 PO 都是 Run 的輸出文件
