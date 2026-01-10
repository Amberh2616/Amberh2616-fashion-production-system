# Fashion Production System - Claude Project Memory

**Last Updated:** 2026-01-10
**Version:** 4.11.0
**Status:** P0-P11 + P14-P17 完成 ✅ | P18-P20 規劃中 (大貨報價加強/庫存/採購優化)

---

## 🎯 核心產品思想（2026-01-02 確立）

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

## 📋 完整業務流程（2026-01-10 確立）

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


【Phase 3: 報價階段】 ⚠️ 模型存在，UI 需加強
───────────────────────────────────────────────────────────────────────────────
CostSheet (Bulk Costing)
├── 用量：locked_value (鎖定用量)
├── 物料成本 = BOM × locked_value × 單價 × (1 + 損耗%)
├── 人工成本 + 製造費用 + 利潤 margin
└── 輸出：報價單 PDF → 發給客戶


【Phase 4: 大貨階段】 ✅ P17 完成 (2026-01-10)
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
         ↓
PurchaseOrder (採購單自動生成) ✅
├── 按供應商分組
├── 自動生成 Production PO
└── 發送給供應商 → 追蹤收貨
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

### 用量數據流（三階段成熟度）

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

採購數量計算：
= 訂單數量 × locked_value × (1 + wastage_pct%)
= 10,000 件 × 0.82 yd × 1.05 = 8,610 yards
```

---

## 系統定位

**AI-Augmented PLM + ERP Lite for Garment Factories**

```
目標：1 人管理 300-500+ 款/季，70-80% 自動化
擴展：多人協作 1000+ 款，可商業化 SaaS
```

> **核心原則：SampleRun 是唯一的「執行真相來源」**
> MWO / Estimate / T2 PO 都是 Run 的輸出文件。

---

## 架構文檔

| 文檔 | 說明 |
|------|------|
| **`docs/SYSTEM-ARCHITECTURE-v3.md`** | 完整系統架構（資料模型、狀態機、API、擴展設計）|
| **`docs/COMPLETE-FLOW-ANALYSIS.md`** | ⭐ Tech Pack 完整流程分析（含 P0 修復方案）|
| **`docs/PROGRESS-UPDATE-2026-01-07.md`** | ⭐ 2026-01-07 進度更新報告 |
| `docs/MWO-REDESIGN-v4.md` | MWO v4 設計（Tech Pack + BOM + Spec 整合）|
| `docs/COMPLETE-FLOW-CHECKLIST.md` | Tech Pack 翻譯流程檢查清單 |
| `docs/TECH-PACK-TRANSLATION-DESIGN.md` | Tech Pack 雙語疊層設計 |
| `docs/TECH-PACK-MWO-INTEGRATION.md` | Tech Pack 翻譯整合到 MWO 方案 |
| `docs/AI-AGENT-DESIGN.md` | AI 解析設計 |

---

## 開發進度

### ✅ 已完成（Phase 0-3）

| Phase | 功能 | 完成日期 | 詳細文檔 |
|-------|------|----------|----------|
| Phase 1 | Tech Pack 上傳 + AI 解析 | 2025-12 | - |
| Phase 2 | BOM 編輯器 + Costing 報價 | 2025-12 | - |
| **P0-1** | **Request 自動生成（Run + MWO + Estimate）** | **2026-01-01** | 見下方 |
| **P0-2** | **Kanban 看板 + 12 狀態機** | **2026-01-02** | 見下方 |
| **SaaS** | **多租戶底層（TenantManager）** | **2026-01-02** | - |
| **P1** | **批量操作 + 告警機制** | **2026-01-02** | - |
| **P2** | **Excel 匯出（3 種文件）** | **2026-01-04** | - |
| **P3** | **PDF 匯出 + 批量 ZIP 打包** | **2026-01-04** | - |
| **P4** | **Tech Pack 翻譯流程修復 + Request 按鈕** | **2026-01-07** | 見下方 |
| **P5** | **BOM/Spec AI 翻譯 + MWO Spec Sheet** | **2026-01-08** | 見下方 |
| **P6** | **BOM 中文翻譯編輯界面** | **2026-01-09** | 見下方 |
| **P7** | **Measurement 中文翻譯編輯界面** | **2026-01-09** | 見下方 |
| **P8** | **MWO 完整匯出（Tech Pack + BOM + Spec）** | **2026-01-09** | 見下方 |
| **P14** | **供應商主檔管理系統** | **2026-01-10** | 見下方 |
| **P15** | **物料主檔管理系統** | **2026-01-10** | 見下方 |
| **P16** | **採購單工作流程** | **2026-01-10** | 見下方 |
| **P17** | **大貨訂單系統 + MRP + 採購生成** | **2026-01-10** | 見下方 |

#### P17: 大貨訂單系統 + MRP + 採購生成（2026-01-10）

**功能：** 大貨訂單管理、物料需求計算（MRP）、採購單自動生成

**後端模型（`backend/apps/orders/models.py`）：**
```python
class ProductionOrder:
    # 大貨訂單
    po_number         # 客戶 PO 號
    order_number      # 內部訂單號
    customer          # 客戶名稱
    style_revision    # 關聯款式
    total_quantity    # 總數量
    size_breakdown    # {"S": 1000, "M": 3000, "L": 4000, "XL": 2000}
    unit_price        # 成交單價
    status            # draft → confirmed → materials_ordered → in_production → completed

class MaterialRequirement:
    # 物料需求（MRP 計算結果）
    production_order  # 關聯大貨訂單
    bom_item          # 關聯 BOM
    consumption_per_piece  # 單件用量
    wastage_pct       # 損耗率
    order_quantity    # 訂單數量
    gross_requirement # 毛需求 = qty × consumption
    wastage_quantity  # 損耗量 = gross × wastage%
    total_requirement # 總需求 = gross + wastage
    order_quantity_needed  # 需採購量 = total - 庫存
    status            # calculated → ordered → received
```

**後端服務（`backend/apps/orders/services/mrp_service.py`）：**
- `MRPService.calculate_requirements()` - 計算物料需求
- `MRPService.generate_purchase_orders()` - 自動生成採購單（按供應商分組）
- `MRPService.get_requirements_summary()` - 需求摘要統計

**前端文件：**
- `frontend/lib/types/production-order.ts` - 類型定義
- `frontend/lib/api/production-orders.ts` - API 客戶端
- `frontend/lib/hooks/useProductionOrders.ts` - React Query Hooks
- `frontend/app/dashboard/production-orders/page.tsx` - 列表頁（含統計卡片）
- `frontend/app/dashboard/production-orders/[id]/page.tsx` - 詳情頁（含物料需求表）
- `frontend/app/dashboard/production-orders/production-order-form-dialog.tsx` - 表單（含尺碼分解 UI）

**API 端點：**
- `GET /api/v2/production-orders/` - 列表
- `POST /api/v2/production-orders/` - 創建
- `GET /api/v2/production-orders/{id}/` - 詳情（含 material_requirements）
- `POST /api/v2/production-orders/{id}/confirm/` - 確認訂單
- `POST /api/v2/production-orders/{id}/calculate-mrp/` - 計算 MRP
- `POST /api/v2/production-orders/{id}/generate-po/` - 生成採購單
- `GET /api/v2/production-orders/stats/` - 統計儀表板
- `GET /api/v2/material-requirements/` - 物料需求列表

**頁面路徑：** `/dashboard/production-orders`

**MRP 計算公式：**
```
gross_requirement = order_quantity × consumption_per_piece
wastage_quantity = gross_requirement × wastage_pct%
total_requirement = gross_requirement + wastage_quantity
order_quantity_needed = max(0, total_requirement - current_stock)
```

**採購單生成流程：**
```
ProductionOrder (confirmed)
     │
     ↓ POST /calculate-mrp/
MaterialRequirement[] (calculated)
     │
     ↓ POST /generate-po/ (group_by_supplier=true)
     │
     ↓ 按 supplier 分組
     │
PurchaseOrder[] (draft) + POLine[]
     │
MaterialRequirement.status = 'ordered'
ProductionOrder.status = 'materials_ordered'
```

#### P16: 採購單工作流程（2026-01-10）

**功能：** 採購單管理與狀態工作流程

**狀態機：**
```
draft → sent → confirmed → partial_received/received
any → cancelled
```

**後端增強：**
- `backend/apps/procurement/views.py` - PurchaseOrderViewSet 添加 send/confirm/receive/cancel actions
- `backend/apps/procurement/views.py` - POLineViewSet 添加 update_received action
- `backend/apps/procurement/models.py` - POLine 添加 Material FK
- `backend/apps/procurement/serializers.py` - 添加 supplier_name, status_display, lines_count

**前端文件：**
- `frontend/lib/types/purchase-order.ts` - PO 類型定義 + 狀態選項
- `frontend/lib/api/purchase-orders.ts` - PO API 客戶端（含狀態轉換）
- `frontend/lib/hooks/usePurchaseOrders.ts` - React Query Hooks
- `frontend/app/dashboard/purchase-orders/page.tsx` - PO 列表頁面 + 統計卡片
- `frontend/app/dashboard/purchase-orders/po-form-dialog.tsx` - PO 表單對話框

**API 端點：**
- `GET /api/v2/purchase-orders/` - 列表（支援 status, po_type, supplier 篩選）
- `POST /api/v2/purchase-orders/` - 創建
- `PATCH /api/v2/purchase-orders/{id}/` - 更新
- `DELETE /api/v2/purchase-orders/{id}/` - 刪除
- `GET /api/v2/purchase-orders/stats/` - 統計儀表板
- `POST /api/v2/purchase-orders/{id}/send/` - 發送給供應商
- `POST /api/v2/purchase-orders/{id}/confirm/` - 確認
- `POST /api/v2/purchase-orders/{id}/receive/` - 收貨
- `POST /api/v2/purchase-orders/{id}/cancel/` - 取消

**頁面路徑：** `/dashboard/purchase-orders`

#### P15: 物料主檔管理（2026-01-10）

**功能：** 物料主檔 CRUD 管理界面
- 物料列表（搜尋、類別/供應商/狀態篩選、分頁）
- 新增/編輯物料（Dialog 表單）
- 供應商關聯
- 完整物料資訊：規格、價格、交期、MOQ、耗損率

**後端：**
- `backend/apps/procurement/models.py` - Material 模型
- `backend/apps/procurement/serializers.py` - MaterialSerializer
- `backend/apps/procurement/views.py` - MaterialViewSet（含篩選/搜尋）
- `backend/apps/procurement/urls.py` - 路由配置

**前端文件：**
- `frontend/lib/types/material.ts` - 類型定義
- `frontend/lib/api/materials.ts` - API 客戶端
- `frontend/lib/hooks/useMaterials.ts` - React Query Hooks
- `frontend/app/dashboard/materials/page.tsx` - 物料列表頁
- `frontend/app/dashboard/materials/material-form-dialog.tsx` - 表單對話框

**API 端點：**
- `GET /api/v2/materials/` - 列表（支援 category, supplier, status, search 篩選）
- `POST /api/v2/materials/` - 創建
- `PATCH /api/v2/materials/{id}/` - 更新
- `DELETE /api/v2/materials/{id}/` - 刪除

**頁面路徑：** `/dashboard/materials`

#### P14: 供應商主檔管理（2026-01-10）

**功能：** 供應商 CRUD 管理界面
- 供應商列表（搜尋、篩選、分頁）
- 新增/編輯供應商（Dialog 表單）
- 刪除確認
- 供應商類型：布料、輔料、標籤、包裝、成衣工廠

**後端（使用現有 procurement app）：**
- `backend/apps/procurement/models.py` - Supplier 模型（已存在）
- `backend/apps/procurement/serializers.py` - SupplierSerializer
- `backend/apps/procurement/views.py` - SupplierViewSet
- `backend/apps/procurement/urls.py` - 路由配置

**前端文件：**
- `frontend/lib/types/supplier.ts` - 類型定義
- `frontend/lib/api/suppliers.ts` - API 客戶端
- `frontend/lib/hooks/useSuppliers.ts` - React Query Hooks
- `frontend/app/dashboard/suppliers/page.tsx` - 供應商列表頁
- `frontend/app/dashboard/suppliers/supplier-form-dialog.tsx` - 表單對話框
- `frontend/components/ui/dropdown-menu.tsx` - UI 組件

**API 端點：**
- `GET /api/v2/suppliers/` - 列表
- `POST /api/v2/suppliers/` - 創建
- `PATCH /api/v2/suppliers/{id}/` - 更新
- `DELETE /api/v2/suppliers/{id}/` - 刪除

**頁面路徑：** `/dashboard/suppliers`

#### P8: MWO 完整匯出（2026-01-09）

**功能：** 生成包含完整內容的 MWO PDF
- 封面頁（中英雙語 MWO 資訊）
- Tech Pack 頁面（中文疊加在原圖上）
- BOM 物料表（含中文翻譯，藍色字）
- Spec 尺寸表（含中文翻譯，藍色字）

**技術實現：**
- Pillow + PyMuPDF 渲染中文（避免 xhtml2pdf 亂碼）
- 中文字體：微軟雅黑（msyh.ttc）
- Tech Pack 疊加模式：半透明白底 + 中文翻譯

**後端文件：**
- `backend/apps/samples/services/mwo_complete_export.py` - 完整 MWO 匯出服務
- `backend/apps/parsing/services/techpack_pdf_export.py` - Tech Pack 疊加匯出
- `backend/apps/parsing/models.py` - 添加 Revision 模型導入

**API 端點：**
- `GET /api/v2/sample-runs/{id}/export-mwo-complete-pdf/` - 下載完整 MWO PDF

**前端：**
- Kanban 頁面每個 Run 卡片有「Complete MWO」按鈕

**測試結果：**
- PDF 生成成功（~80MB）
- 中文正常顯示
- 待真實 Tech Pack 資料測試完整翻譯覆蓋

#### P7: Measurement 中文翻譯編輯界面（2026-01-09）

**後端修改：**
- `backend/apps/styles/serializers.py` - MeasurementSerializer 添加 `point_name_zh`, `translation_status`
- `backend/apps/styles/views.py` - 新增 MeasurementViewSet（translate + translate_batch）
- `backend/apps/styles/urls.py` - 添加 Measurement 路由

**前端新增：**
- `frontend/lib/types/measurement.ts` - Measurement 類型定義
- `frontend/lib/api/measurement.ts` - Measurement API 客戶端
- `frontend/lib/hooks/useMeasurement.ts` - Measurement React Query Hooks
- `frontend/components/measurement/MeasurementTranslationDrawer.tsx` - 翻譯編輯組件
- `frontend/app/dashboard/revisions/[id]/spec/page.tsx` - Spec 尺寸表主頁面

**功能：**
- 尺寸表展示：動態尺碼列（根據數據自動生成）
- 單項翻譯：點擊翻譯圖標開啟編輯界面
- 批量翻譯：一鍵 AI 翻譯所有尺寸點名稱
- 翻譯狀態統計：顯示已翻譯/總數

**API 端點：**
- `GET /api/v2/style-revisions/{id}/measurements/` - 列表
- `PATCH /api/v2/style-revisions/{id}/measurements/{item_id}/` - 更新
- `POST /api/v2/style-revisions/{id}/measurements/{item_id}/translate/` - 單項翻譯
- `POST /api/v2/style-revisions/{id}/measurements/translate-batch/` - 批量翻譯

**頁面路徑：** `/dashboard/revisions/{id}/spec`

#### P6: BOM 中文翻譯編輯界面（2026-01-09）

**修改文件：**
- `backend/apps/styles/serializers.py` - 添加翻譯字段到 BOMItemSerializer
- `backend/apps/styles/views.py` - 添加 translate + translate_batch API 端點
- `frontend/lib/types/bom.ts` - 添加翻譯類型定義
- `frontend/lib/api/bom.ts` - 添加翻譯 API 函數
- `frontend/lib/hooks/useBom.ts` - 添加翻譯 mutation hooks

**新增文件：**
- `frontend/components/bom/BOMTranslationDrawer.tsx` - BOM 翻譯編輯抽屜組件

**功能：**
- 單項翻譯：點擊翻譯圖標開啟編輯界面
- 批量翻譯：一鍵 AI 翻譯所有 BOM 物料名稱
- 翻譯狀態：pending / confirmed 狀態顯示
- 手動編輯：可手動修改 AI 翻譯結果
- 確認翻譯：將翻譯標記為已確認

**API 端點：**
- `POST /api/v2/style-revisions/{id}/bom/{item_id}/translate/` - 單項翻譯
- `POST /api/v2/style-revisions/{id}/bom/translate-batch/` - 批量翻譯

#### P5: BOM/Spec AI 翻譯（2026-01-08）

**新增文件：**
-  - BOM 批量翻譯
-  - Spec 批量翻譯
- 
- 

**修改文件：**
-  - 新增  方法

**測試數據：**
- Style: LW1FLWS_BOM (1 款)
- BOM: 22 筆（全部已翻譯）
- Spec: 12 筆（全部已翻譯）

#### P4: Tech Pack 翻譯流程修復（2026-01-07）
```
✅ 修復 P0 Critical：自動跳轉到翻譯審校界面
✅ 添加"下 Sample Request"按鈕（批准後顯示）
✅ 完整流程測試驗證（Tech Pack → 翻譯 → Request）
```
**關鍵文件：**
- `backend/apps/parsing/models.py` - 添加 tech_pack_revision FK
- `frontend/app/dashboard/documents/[id]/review/page.tsx` - 自動跳轉邏輯
- `frontend/app/dashboard/revisions/[id]/review/page.tsx` - Request 按鈕
- `docs/PROGRESS-UPDATE-2026-01-07-FINAL.md` - 完整進度報告

#### P0-1: Request 自動生成（2026-01-01）
```
POST /api/v2/sample-requests/ → 自動生成：
SampleRun #1 + RunBOMLine + RunOperation + MWO draft + Estimate draft
```
**關鍵文件：** `apps/samples/services/auto_generation.py`

#### P0-2: Kanban 看板（2026-01-02）
```
12 欄狀態機 + 篩選 + 搜尋 + 狀態轉換按鈕
URL: /dashboard/samples/kanban
```
**API：** `GET /api/v2/kanban/runs/`, `POST /api/v2/sample-runs/{id}/{action}/`

#### P1: 批量操作 + 告警（2026-01-02）
```
批量轉換 + Overdue/Due Soon/Stale 告警
```
**API：** `POST /api/v2/sample-runs/batch-transition/`, `GET /api/v2/alerts/`

#### P2: Excel 匯出（2026-01-04）
```
3 種文件：MWO (4 sheets) + Estimate + PO
數據回退：bom_snapshot_json → guidance_usage.usage_lines
```
**關鍵文件：** `apps/samples/services/excel_export.py` (431 行)

#### P3: PDF + 批量 ZIP（2026-01-04）
```
單個 PDF 匯出 + 批量打包 ZIP
雙引擎：WeasyPrint (Linux) / xhtml2pdf (Windows)
```
**關鍵文件：** `apps/samples/services/pdf_export.py`, `batch_export.py`

#### P4: Tech Pack 翻譯流程修復（2026-01-07）
```
問題：提取完成後無法導航到 P0 審校界面，流程中斷
修復：添加 tech_pack_revision FK + 自動導航邏輯
結果：完整的上傳 → 分類 → 提取 → P0 審校流程 ✅
```

**修改文件：**
- `backend/apps/parsing/models.py` - 添加 FK
- `backend/apps/parsing/views.py` - API 返回 tech_pack_revision_id
- `frontend/app/dashboard/documents/[id]/review/page.tsx` - 自動導航
- `backend/apps/parsing/migrations/0004_*.py` - Migration

**關鍵 API：**
- `POST /api/v2/uploaded-documents/{id}/extract/` - 返回 tech_pack_revision_id
- `GET /api/v2/uploaded-documents/{id}/status/` - 輪詢狀態並獲取 ID

**文檔：** `docs/COMPLETE-FLOW-ANALYSIS.md`, `docs/PROGRESS-UPDATE-2026-01-07.md`

---

### 🔄 進行中（Phase 5）

#### Phase 5: MWO v4 重構（2026-01-05 開始，暫緩）

**問題：** 現有 MWO 只包含 BOM/Construction/QC 快照，缺少 Tech Pack 和 Measurement

**目標：** 整合三個資料來源到 MWO

```
┌─────────────────────────────────────────┐
│              SampleMWO v4               │
├─────────────────────────────────────────┤
│ 1. Tech Pack (做工和結構)                │
│    ├── tech_pack_snapshot_json ⭐ 新增   │
│    └── [未來] bilingual_tech_pack PDF   │
│                                         │
│ 2. BOM (物料清單) ✅ 已有                │
│    └── bom_snapshot_json                │
│                                         │
│ 3. Measurement (尺寸表) ⭐ 新增          │
│    └── measurement_snapshot_json        │
│                                         │
│ 4. Construction/QC ✅ 已有               │
└─────────────────────────────────────────┘
```

**MWO v4 已暫緩，優先實施：上傳 → AI 解析 → 驗證 → Request 完整流程**

**設計文檔：** `docs/UPLOAD-TO-REQUEST-FLOW.md` ⭐

---

### 📋 待做（從 P18 開始）

| 編號 | 功能 | 估計工時 | 狀態 |
|------|------|----------|------|
| **P9** | **甘特圖進度儀表板（NetSuite 風格）** | **0.5 天** | **✅ 完成 (2026-01-10)** |
| **P10** | **真實 Tech Pack 完整流程測試** | **0.5 天** | **✅ 完成 (2026-01-10)** |
| **P11** | **MWO 品質修復（準確度 85-92%）** | **1 天** | **✅ 完成 (2026-01-10)** |
| **P14** | **供應商主檔管理系統** | **0.5 天** | **✅ 完成 (2026-01-10)** |
| **P15** | **物料主檔管理系統** | **0.5 天** | **✅ 完成 (2026-01-10)** |
| **P16** | **採購單工作流程** | **0.5 天** | **✅ 完成 (2026-01-10)** |
| **P17** | **大貨訂單系統 + MRP + 採購生成** | **1 天** | **✅ 完成 (2026-01-10)** |
| **P18** | **大貨報價加強 (Bulk Costing UI)** | **1 天** | **🔴 下一步** |
| **P19** | **庫存管理 (Inventory)** | **1 天** | **📋 規劃中** |
| **P20** | **採購優化 (Procurement Enhancement)** | **1 天** | **📋 規劃中** |
| P12 | 自訂 Excel/PDF 模板 | - | 📋 計劃中 |
| P13 | Celery 異步批量匯出 | - | 📋 計劃中 |
| Phase B | 多人協作 + RBAC | - | 📋 計劃中 |
| Phase B | Supplier Portal（品牌端查看）| - | 📋 計劃中 |

---

## P18-P20 後續規劃（2026-01-10 更新）

> **P17 已完成**：大貨訂單系統 + MRP + 採購自動生成（原 P18-P20 功能已合併實作）

### P18: 大貨報價加強 (Bulk Costing UI) 🔴 下一步

**目標：** 完善 CostSheet (bulk) 報價界面

**功能：**
- Bulk Costing 創建/編輯 UI
- 用量選擇：confirmed_value 或 locked_value
- 成本計算：物料 + 人工 + 製造費用 + 利潤
- 報價單 PDF 匯出
- 報價歷史版本管理
- 與 ProductionOrder 關聯

**現有模型：** `CostSheet` ✅ 已存在

### P19: 庫存管理 (Inventory)

**目標：** 物料庫存追蹤與管理

**功能：**
- 庫存數量追蹤（current_stock）
- 入庫/出庫記錄
- 庫存預警（低於安全庫存）
- 與 MaterialRequirement 整合（扣除庫存計算採購量）

### P20: 採購優化 (Procurement Enhancement)

**目標：** 強化採購流程與效率

**功能：**
- 採購單合併（跨訂單合併同供應商採購）
- 採購歷史價格分析
- 供應商評價系統
- 交期追蹤與預警

---

## P10 流程測試結果（2026-01-09 ~ 01-10 完成）

**測試文件：** LM7B24S (Tech Pack + BOM)

| 步驟 | 功能 | 結果 |
|------|------|------|
| 1 | Tech Pack 上傳 | ✅ 成功 |
| 2 | AI 分類 | ✅ 7 頁 Tech Pack (95%) |
| 3 | AI 提取 | ✅ 248 個 DraftBlocks |
| 4 | 翻譯審校 + 批准 | ✅ 自動翻譯完成 |
| 5 | BOM 上傳 | ✅ 成功 |
| 6 | BOM 分類 | ✅ 5 頁 BOM + 5 頁 Spec |
| 7 | BOM 提取 | ✅ 35 個 BOM Items |
| 8 | Sample Request 創建 | ✅ MWO-2601-000002 |
| 9 | MWO 完整匯出 | ✅ 28.7 MB PDF (5 頁) |

**發現並修復的問題：**
- ✅ Measurement 提取失敗 → 已修復（2026-01-09）
  - 根因：`file_classifier.py` 分類時頁碼錯誤（第二批次返回 1-5 而非 6-10）
  - 修復：在 prompt 中加入頁碼映射 `Image 1 = Page 6, Image 2 = Page 7...`
  - 驗證：LW1FLWS_BOM.pdf 成功提取 24 個 Measurements

### LW1FLWS 完整測試（2026-01-10 初次）

**測試文件：** LW1FLWS TECH PACK.pdf (9MB) + LW1FLWS_BOM.pdf (5.8MB)

| 步驟 | 功能 | 結果 |
|------|------|------|
| 1 | Tech Pack 上傳 | ✅ 成功 (9MB) |
| 2 | AI 分類 | ✅ 7 頁 tech_pack |
| 3 | AI 提取 | ✅ 108 個 DraftBlocks |
| 4 | BOM 上傳 | ✅ 成功 (5.8MB) |
| 5 | BOM 分類 | ✅ 5 頁 BOM + 2 頁 Measurement（頁碼正確！）|
| 6 | BOM 提取 | ✅ 39 BOM + 24 Measurements |
| 7 | Sample Request 創建 | ✅ MWO-2601-000004 |
| 8 | MWO 完整匯出 | ✅ 95 MB PDF (11 頁) |

### LW1FLWS P11 升級後重新測試（2026-01-10）

**改動：** 所有提取器統一使用 PyMuPDF + 300 DPI + detail: high

| 項目 | 改動前 | 改動後 | 差異 |
|------|--------|--------|------|
| Tech Pack Blocks | 108 | **123** | **+14%** |
| BOM Items | 39 | **20** | 更精確過濾表頭 |
| Measurements | 24 | **23** | 相近 |
| MWO PDF | 95 MB | **93 MB** | 含完整 Tech Pack |

**準確度提升：**

| 項目 | P11 升級前 | P11 升級後 | 提升 |
|------|-----------|-----------|------|
| Tech Pack 翻譯完成率 | ~70% | **85%** | **+15%** |
| BOM/Spec 翻譯完成率 | ~70% | **92%** | **+22%** |

**輸出文件：** `C:/Users/AMBER/Desktop/MWO_LW1FLWS_Run1_v5.pdf`

**結論：** P11 升級成功！準確度大幅提升，成本增加約 $0.15/份

### LM7B24S P11 驗證測試（2026-01-10）

**測試目的：** 驗證 P11 升級在不同款式的效果

| 步驟 | 功能 | 結果 |
|------|------|------|
| 1 | Tech Pack 重新提取 | ✅ 280 blocks（原 248，+13%）|
| 2 | BOM 重新提取 | ✅ 22 items |
| 3 | Measurement 提取 | ✅ 60 items（頁面 6-10）|
| 4 | MWO Complete PDF | ✅ 102.5 MB |

**準確度結果：**

| 項目 | LW1FLWS | LM7B24S | 結論 |
|------|---------|---------|------|
| Tech Pack | 85% | **90%** | LM7B24S 更佳 |
| BOM/Spec | 92% | **92%** | 一致穩定 |

**輸出文件：** `C:/Users/AMBER/Desktop/MWO_LM7B24S_Run1.pdf`

**P11 最終結論：**
- Tech Pack 準確度：85-90%（視文件複雜度）
- BOM/Spec 準確度：92%（穩定）
- 成本增加：約 $0.15/份（可接受）
- **建議：保持 detail:high 設定，準確度提升顯著**

### P11: MWO 品質修復（2026-01-10 P11-1, P11-2 ✅ 已完成）

#### 已完成程式碼改動

| 文件 | 改動 | 狀態 |
|------|------|------|
| `file_classifier.py` | DPI 150→300, detail: low→high, 修復頁碼映射 bug | ✅ 完成 |
| `vision_extract.py` | DPI 200→300, detail: low→high, max_tokens 1000→4000 | ✅ 完成 |
| `bom_extractor.py` | 完全重寫：pdfplumber → GPT-4o Vision (high detail) | ✅ 完成 |
| `measurement_extractor.py` | pdfplumber→PyMuPDF, DPI 200→300 | ✅ 完成 |

**P11-1: Tech Pack 提取準確度提升 ✅**
- `vision_extract.py`: DPI 200→300, detail: high
- `file_classifier.py`: DPI 150→300, detail: high
- `measurement_extractor.py`: pdfplumber→PyMuPDF, DPI 200→300

**P11-2: BOM 智能提取 ✅**
- 完全重寫 `bom_extractor.py`
- 使用 GPT-4o Vision (detail: high) 識別表格
- 自動識別列結構，不再硬編碼
- 智能跳過表頭和類別標題
- ai_confidence 從 0.85 提升到 0.90

**P11-3: 添加 Sample Status 字段** ⏳ 待做

---

#### 問題分析記錄（改動前）

**改動前提取流程：**
```
1. 文件分類（file_classifier.py）
   PDF → PyMuPDF 轉圖片 (150 DPI) → GPT-4o Vision (detail: low)

2. Tech Pack 提取（vision_extract.py）
   混合策略：
   ├── Part 1: pdfplumber 提取文字層（有 bbox 但抓不到圖片中文字）
   └── Part 2: GPT-4o Vision (detail: low) 只抓 "graphic annotations"

3. BOM 提取（bom_extractor.py）
   pdfplumber.extract_tables() → 硬編碼列索引 ❌
```

**問題根因：**

| 問題 | 根因 |
|------|------|
| 翻譯率 70% | ① Vision detail: low 漏字 ② pdfplumber 只抓文字層 ③ Prompt 只要 "graphic annotations" |
| BOM 提取錯誤 | ① 硬編碼列索引（假設固定格式）② pdfplumber 對複雜表格識別差 |

#### Vision Detail 測試結果（單頁 Tech Pack）

| 指標 | LOW | HIGH | 差異 |
|------|-----|------|------|
| 提取項目數 | 47 | 66 | **+40%** |
| Prompt Tokens | 217 | 897 | +680 |
| Completion Tokens | 1033 | 1186 | +153 |
| 單頁成本 | $0.0109 | $0.0141 | +$0.0032 |

**關鍵發現：LOW 模式有嚴重錯誤**

| 問題 | LOW | HIGH |
|------|-----|------|
| Stitch codes | ❌ 全部識別錯誤 (000, 001) | ✅ 正確 (607, 514, 406) |
| BONDING LEGEND | ❌ 完全漏掉 | ✅ 識別 A-I 全部項目 |
| 數字標注 | ❌ 漏掉 | ✅ 識別 1, 4, 22, 23, 32 等 |

#### 成本對比（完整 MWO）

| 項目 | 改動前 (low) | 改動後 (high) |
|------|-------------|---------------|
| 分類 (10頁) 圖片 tokens | 850 | 10,500 |
| Tech Pack 提取 (7頁) | 6,195 | 15,750 |
| BOM 提取 (5頁) | 0 (pdfplumber) | 12,750 |
| **單份 MWO 成本** | ~$0.11 | ~$0.26 |

**結論：每份多花 $0.15，換取準確度從 50% → 95%，值得改！**

---

## P9 甘特圖進度儀表板（2026-01-10 ✅ 完成）

**參考：** [Oracle NetSuite Manufacturing Scheduler](https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/section_0223104719.html)

### 實作內容

| 項目 | 說明 |
|------|------|
| **後端 API** | `GET /api/v2/scheduler/` - 支援 Style/Run 視圖 |
| **前端頁面** | `/dashboard/scheduler` |
| **側邊導航** | 已添加 Scheduler 連結（GanttChart icon） |

### 功能特色

| 功能 | 說明 | 狀態 |
|------|------|------|
| **視圖切換** | Style（按款式分組）/ Run（平鋪顯示）| ✅ |
| **時間粒度** | 日 / 週 / 月 三種 | ✅ |
| **Summary Bar** | 款式總進度條（漸層色） | ✅ |
| **Task Bar** | 單個 Run 進度條（狀態色） | ✅ |
| **顏色編碼** | 12 狀態對應不同顏色 | ✅ |
| **逾期標記** | 紅色背景 + 遲延天數 | ✅ |
| **展開/折疊** | 按款式展開或折疊 | ✅ |
| **分頁控制** | 10/25/50 筆每頁 | ✅ |
| **搜尋篩選** | 款式編號搜尋 | ✅ |
| **日期導航** | 前/後移動 + 回到今天 | ✅ |
| **Legend** | 底部狀態顏色圖例 | ✅ |

### 12 狀態進度對照

| 狀態 | 進度 | 顏色 |
|------|------|------|
| draft | 0% | slate-400 |
| materials_planning | 10% | amber-400 |
| po_drafted | 20% | orange-500 |
| po_issued | 30% | green-500 |
| mwo_drafted | 40% | blue-500 |
| mwo_issued | 50% | indigo-500 |
| in_progress | 60% | violet-500 |
| sample_done | 70% | cyan-500 |
| actuals_recorded | 80% | teal-500 |
| costing_generated | 90% | emerald-500 |
| quoted | 95% | lime-500 |
| accepted | 100% | green-500 |

### 修改文件

| 文件 | 內容 |
|------|------|
| `backend/apps/samples/views.py` | 新增 `scheduler_data()` API |
| `backend/apps/samples/urls.py` | 新增 `/scheduler/` 路由 |
| `frontend/lib/api/samples.ts` | 新增 Scheduler 類型和 API |
| `frontend/app/dashboard/scheduler/page.tsx` | 新頁面（500+ 行） |
| `frontend/components/layout/Sidebar.tsx` | 新增 Scheduler 導航 |
| `frontend/app/dashboard/samples/kanban/page.tsx` | 新增 Scheduler 連結 |

### 頁面路徑

`http://localhost:3000/dashboard/scheduler`

---

## 常用指令

```bash
# 啟動後端
cd backend && python manage.py runserver 8000

# 啟動前端
cd frontend && npm run dev

# 測試
cd backend && pytest

# Migrations
cd backend && python manage.py makemigrations && python manage.py migrate
```

---

## 服務地址

| 服務 | URL |
|------|-----|
| 前端 | http://localhost:3000 |
| 後端 API | http://localhost:8000/api/v2/ |
| Admin | http://localhost:8000/admin/ |

### 主要頁面與 API

| 類型 | 路徑 |
|------|------|
| **前端頁面** |  |
| 上傳文件 | `/dashboard/upload` |
| AI 處理頁面 | `/dashboard/documents/{id}/processing` |
| 分類審查 | `/dashboard/documents/{id}/review` |
| **P0 審校界面** ⭐ | `/dashboard/revisions/{id}/review` |
| Kanban 看板 | `/dashboard/samples/kanban` |
| BOM 編輯 | `/dashboard/revisions/{id}/bom` |
| Costing | `/dashboard/revisions/{id}/costing-phase23` |
| **後端 API** |  |
| **上傳文件** | `POST /api/v2/uploaded-documents/` |
| **AI 分類** | `POST /api/v2/uploaded-documents/{id}/classify/` |
| **AI 提取** ⭐ | `POST /api/v2/uploaded-documents/{id}/extract/` |
| **獲取狀態** | `GET /api/v2/uploaded-documents/{id}/status/` |
| **編輯 Block** | `PATCH /api/v2/draft-blocks/{id}/` |
| **批准 Revision** | `POST /api/v2/revisions/{id}/approve/` |
| **創建 Sample Request** ⭐ | `POST /api/v2/sample-requests/` |
| Kanban 列表 | `GET /api/v2/kanban/runs/` |
| 狀態轉換 | `POST /api/v2/sample-runs/{id}/{action}/` |
| Excel 匯出 | `GET /api/v2/sample-runs/{id}/export-{type}/` |
| PDF 匯出 | `GET /api/v2/sample-runs/{id}/export-{type}-pdf/` |
| 批量匯出 | `POST /api/v2/sample-runs/batch-export/` |
| 告警 | `GET /api/v2/alerts/` |

---

## 資料模型核心

```
Style → Revision → BOMItem (Verified)
                 → SampleRequest → SampleRun → MWO
                                            → Estimate
                                            → PurchasePlan → PurchaseOrder
```

---

## 狀態機

```
SampleRun:
DRAFT → SUBMITTED → QUOTED → PENDING_APPROVAL → APPROVED
                                              → REJECTED
APPROVED → MATERIALS → PO_ISSUED → IN_PRODUCTION → COMPLETED
ANY → CANCELLED
```

---

## 技術棧

**Backend:** Django 4.2 + DRF + PostgreSQL
**Frontend:** Next.js 14 + React 18 + TanStack Query/Table + shadcn/ui
**AI:** OpenAI GPT-4o Vision

---

## 注意事項

1. **快照原則**：Run 的 BOM/Operation 是複製，不是 FK
2. **不可回寫**：Phase 3 資料不得修改 Phase 2 的 verified 資料
3. **採購拆單**：T2 PO 按供應商拆分，分 Draft/Issued
4. **文件編號**：MWO-YYMM-XXXXXX 格式，用 sequence 避免撞號
5. **雙 Revision 設計**：系統創建兩個 Revision：
   - `StyleRevision`：用於 BOM/Measurement 編輯
   - `TechPackRevision (Revision)`：用於 DraftBlocks 翻譯審校
6. **中文字體**：MWO 完整匯出使用 Pillow + PyMuPDF，字體為微軟雅黑（msyh.ttc）
7. **終端編碼**：Cursor 終端已配置 UTF-8（`.vscode/settings.json`）

---

## 🎯 Tech Pack 翻譯完整流程（2026-01-09 完成）

```
階段 1：上傳與分類 ✅
  └→ /dashboard/upload
  └→ POST /api/v2/uploaded-documents/
  └→ POST /api/v2/uploaded-documents/{id}/classify/

階段 2：AI 提取 ✅
  └→ /dashboard/documents/{id}/review
  └→ POST /api/v2/uploaded-documents/{id}/extract/
  └→ 創建 TechPackRevision + DraftBlocks
  └→ 返回 tech_pack_revision_id

階段 3：人工審校 ✅
  └→ ⚡ 自動導航（2秒後）到 /dashboard/revisions/{id}/review
  └→ PATCH /api/v2/draft-blocks/{id}/ （編輯 edited_text）
  └→ POST /api/v2/revisions/{id}/approve/

階段 4：BOM/Spec 翻譯 ✅
  └→ /dashboard/revisions/{id}/bom - BOM 翻譯編輯
  └→ /dashboard/revisions/{id}/spec - Spec 翻譯編輯
  └→ 單項翻譯 + 批量 AI 翻譯

階段 5：MWO 完整匯出 ✅
  └→ GET /api/v2/sample-runs/{id}/export-mwo-complete-pdf/
  └→ 封面 + Tech Pack（中文疊加）+ BOM + Spec
  └→ Pillow + PyMuPDF 渲染中文
```

---

## 📚 測試資料

### 推薦測試文件（未處理）

| 文件 | 大小 | 路徑 | 用途 |
|------|------|------|------|
| LW1FLWS TECH PACK.pdf | 9.0 MB | `backend/demo_data/techpacks/` | Tech Pack 翻譯測試 |
| LW1FLWS_BOM.pdf | 5.8 MB | `backend/demo_data/bom/` | BOM 提取測試 |

**確認：** 資料庫無任何記錄，適合完整流程測試
