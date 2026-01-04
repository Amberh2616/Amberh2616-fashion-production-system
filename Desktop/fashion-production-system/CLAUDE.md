# Fashion Production System - Claude Project Memory

**Last Updated:** 2026-01-04
**Version:** 3.7.0
**Status:** P0-2 + SaaS + P1 + P2 + P3 + 翻譯整合 完成 → Phase B 待做

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
| `docs/TECH-PACK-TRANSLATION-DESIGN.md` | Tech Pack 雙語疊層設計 |
| `docs/AI-AGENT-DESIGN.md` | AI 解析設計 |

---

## 開發進度

### ✅ 已完成

| Phase | 功能 | 狀態 |
|-------|------|------|
| 1 | Tech Pack 上傳 + AI 解析 | ✅ |
| 2 | BOM 編輯器 + Costing 報價 | ✅ |
| 3-1 | SampleRequest 基礎 CRUD | ✅ |
| 3-1 | SampleRun 後端 + 狀態機 | ✅ |
| **P0-1** | **Create Request 自動生成** | ✅ **2026-01-01** |
| **P0-2** | **Kanban 看板 + 狀態機整合** | ✅ **2026-01-02** |
| **SaaS** | **多租戶底層（TenantManager + Views）** | ✅ **2026-01-02** |
| **P1** | **批量操作（Kanban 多選 + 批量轉換）** | ✅ **2026-01-02** |
| **P1** | **告警機制（Overdue/Due Soon/Stale）** | ✅ **2026-01-02** |
| **P2** | **Excel 匯出（MWO/Estimate/PO）** | ✅ **2026-01-04** |
| **P3** | **PDF 匯出 + 批量 ZIP 打包** | ✅ **2026-01-04** |

### ✅ P0-1 完成（2026-01-01）

```
POST /api/v2/sample-requests/ → 自動生成：
├── SampleRun #1（含 source_hash）
├── RunBOMLine（快照 verified BOM）
├── RunOperation（快照 verified Construction）
├── MWO draft（MWO-2601-000001）
└── Estimate draft（EST-2601-000001-v1）
```

**測試結果：**
```json
{
  "initial_run": {
    "run_no": 1,
    "status": "draft",
    "source_revision_label": "Rev A",
    "source_hash": "c17c9170569d..."
  },
  "documents": {
    "mwo_no": "MWO-2601-000001",
    "estimate_no": "EST-2601-000001-v1"
  }
}
```

### ✅ P0-2 完成（2026-01-02）

**Kanban 看板視圖**（http://localhost:3000/dashboard/samples/kanban）

```
12 個欄位 × 無限卡片：
Draft → Materials Planning → PO Drafted → PO Issued →
MWO Drafted → MWO Issued → In Progress → Sample Done →
Actuals Recorded → Costing Generated → Quoted → Accepted
```

**功能：**
- ✅ 12 欄 Kanban 看板（可收合/展開）
- ✅ 每張卡片顯示：Style、Run Type、Priority、Due Date
- ✅ 篩選器：All / Urgent / Overdue / This Week
- ✅ Run Type 篩選：Proto / Fit / Sales / Photo
- ✅ 搜尋功能（by style number）
- ✅ 狀態轉換按鈕（Start Planning、Gen T2PO、Issue PO...）
- ✅ 自動生成資源（Guidance Usage、T2PO、MWO、Costing）
- ✅ 錯誤訊息顯示
- ✅ 30 秒自動刷新

**狀態機 11 個 Transition：**
```
start_materials_planning → generate_t2po → issue_t2po →
generate_mwo → issue_mwo → start_production → mark_sample_done →
record_actuals → generate_sample_costing → mark_quoted → mark_accepted
```

**API Endpoints：**
- `GET /api/v2/kanban/counts/` - 各欄位統計
- `GET /api/v2/kanban/runs/` - 卡片列表（含篩選）
- `POST /api/v2/sample-runs/{id}/{action}/` - 狀態轉換

### ✅ SaaS 底層完成（2026-01-02）

```
多租戶隔離基礎建設：
├── TenantManager / TenantQuerySet - 查詢自動過濾
├── TenantViewMixin - Views 自動 tenant 過濾
├── AuditLog Model - 審計日誌
├── 17 個 Model 加上 organization FK
└── 所有主要 Views 更新使用 for_tenant()
```

**關鍵文件：**
- `apps/core/managers.py` - TenantManager
- `apps/core/mixins.py` - TenantViewMixin

### ✅ P1 批量操作完成（2026-01-02）

```
批量操作功能：
├── 後端 batch_transition_sample_runs() 服務
├── POST /api/v2/sample-runs/batch-transition/ API
├── 前端 Kanban 多選 Checkbox
├── 批量操作按鈕（選中同狀態時顯示）
└── 部分成功支援（返回詳細結果）
```

**使用方式：**
1. 在 Kanban 頁面勾選多個卡片
2. Header 會顯示「X selected」
3. 如果所有選中的 Run 狀態相同，會顯示批量操作按鈕
4. 點擊按鈕執行批量轉換

### ✅ P1 告警機制完成（2026-01-02）

```
告警機制功能：
├── 三種告警類型：
│   ├── 🔴 Overdue - 已逾期（target_due_date < today）
│   ├── 🟠 Due Soon - 即將到期（3天內）
│   └── 🟡 Stale - 停滯太久（draft 狀態超過 7 天）
├── GET /api/v2/alerts/ API 端點
├── AlertsPanel 前端組件（可嵌入任何頁面）
├── AlertsBadge 組件（用於導航欄）
└── Kanban 頁面整合（可折疊面板）
```

**使用方式：**
1. 打開 http://localhost:3000/dashboard/samples/kanban
2. 頂部會顯示 Alerts Panel（可點擊 Hide/Show 切換）
3. 點擊告警可跳轉到對應的 Run 詳情頁

**API 範例：**
```bash
GET /api/v2/alerts/?limit=10&due_soon_days=3&stale_days=7

# Response
{
  "alerts": [...],
  "summary": { "overdue": 3, "due_soon": 5, "stale": 2, "total": 10 }
}
```

### 🔧 Bug 修復（2026-01-03）

**資料庫遷移缺失修復：**
```
問題：sample_cost_estimates.organization_id 欄位缺失
原因：0005 遷移只加了 SampleRequest 和 SampleRun 的 organization
解決：創建 0008_samplecostestimate_organization_and_more.py
      添加 organization FK 到：
      ├── SampleCostEstimate
      ├── SampleMWO
      └── T2POForSample
```

### ✅ P2 Excel 匯出完成（2026-01-04）

**功能概述：**
從 Kanban 卡片分開下載 3 種 Excel 文件（MWO、Estimate、PO）

```
實現內容：
├── 後端：openpyxl 3.1.2 Excel 生成
├── 3 個匯出服務類：
│   ├── MWOExcelExporter（4 sheets: Overview, BOM, Operations, QC）
│   ├── EstimateExcelExporter（成本分解）
│   └── T2POExcelExporter（2 sheets: Header, Line Items）
├── 3 個 API endpoints：
│   ├── GET /api/v2/sample-runs/{id}/export-mwo/
│   ├── GET /api/v2/sample-runs/{id}/export-estimate/
│   └── GET /api/v2/sample-runs/{id}/export-po/
├── 前端下載按鈕（Kanban 卡片底部）：
│   ├── 🔵 MWO 按鈕（藍色）
│   ├── 🟢 Quote 按鈕（綠色）
│   └── 🟣 PO 按鈕（紫色）
└── 智能數據回退機制（bom_snapshot_json 為空時從 guidance_usage 讀取）
```

**關鍵技術決策：**
- 使用 `openpyxl` 生成多 sheet Excel 文件
- 防禦性編程：`getattr()` 處理可選欄位，避免 AttributeError
- **數據回退邏輯**：優先讀取快照，快照為空時從 `guidance_usage.usage_lines` 即時查詢
- Blob 下載方式：前端 `URL.createObjectURL()` 觸發下載

**已知問題：**
- 部分舊資料的 `bom_snapshot_json` 為空（已用 fallback 機制解決）
- 測試資料不完整（但核心功能已驗證可用）

**測試驗證：**
```bash
# LW1FLWS 款號測試成功
Run ID: 8fac266c-22bd-479f-8e3a-b7751c74fcda
✅ MWO 匯出：15 筆 BOM（從 guidance_usage 讀取）
✅ Estimate 匯出：成本分解資料
✅ PO 匯出：採購單資料
```

**修改文件：**
- `backend/requirements/base.txt` - 添加 openpyxl
- `backend/apps/samples/services/excel_export.py` - **NEW** (431+ 行)
- `backend/apps/samples/views.py` - 添加 3 個 export actions
- `frontend/lib/api/samples.ts` - 添加匯出函數
- `frontend/app/dashboard/samples/kanban/page.tsx` - 添加下載按鈕

### ✅ P3 PDF 匯出 + 批量 ZIP 打包完成（2026-01-04）

**功能概述：**
從 Kanban 卡片下載 PDF 格式文件，並支援批量匯出多個 Run 到 ZIP 壓縮包

```
Phase 1: PDF 單個匯出 (P3.1)
├── xhtml2pdf 依賴（Windows 兼容，無需 GTK+）
├── HTML 模板系統：
│   ├── base.html（基礎樣式模板）
│   ├── mwo.html（MWO PDF 模板）
│   ├── estimate.html（報價單 PDF 模板）
│   └── t2po.html（採購單 PDF 模板）
├── PDF 匯出服務（pdf_export.py）：
│   ├── 雙引擎策略：WeasyPrint（Linux/Docker）或 xhtml2pdf（Windows）
│   ├── PDFExporter 基類
│   └── MWOPDFExporter、EstimatePDFExporter、T2POPDFExporter
├── 3 個 PDF API 端點：
│   ├── GET /api/v2/sample-runs/{id}/export-mwo-pdf/
│   ├── GET /api/v2/sample-runs/{id}/export-estimate-pdf/
│   └── GET /api/v2/sample-runs/{id}/export-po-pdf/
└── Kanban 頁面添加 PDF 下載按鈕（第二排按鈕，藍/綠/紫色）

Phase 2: ZIP 批量匯出 (P3.2)
├── 批量匯出服務（batch_export.py）
├── 批量匯出 API：
│   └── POST /api/v2/sample-runs/batch-export/
│       ├── 支援 PDF 和 Excel 雙格式
│       └── 支援自訂匯出類型（mwo/estimate/po）
├── 前端批量匯出 UI：
│   ├── Kanban 頁面選擇多個 Run 時顯示批量匯出按鈕
│   ├── 🔴 Export PDF 按鈕（紅色）
│   └── 🟢 Export Excel 按鈕（綠色）
└── ZIP 檔案結構：
    export_2_runs_pdf_20260104_160625.zip
    ├── Run-001_LW1FLWS/
    │   ├── MWO_MWO-2601-000001.pdf
    │   ├── EST_xxx.pdf
    │   └── T2PO_xxx.pdf
    └── Run-002_LW1DKES/
        └── ...
```

**關鍵技術決策：**
- **雙引擎策略**：優先使用 WeasyPrint（功能完整），回退到 xhtml2pdf（Windows 兼容）
- **CSS 兼容性**：移除 `@page` 嵌套規則、`nth-child` 偽選擇器，確保 xhtml2pdf 正常工作
- **Excel 整合**：批量匯出時使用 `response.content` 提取 Excel 數據
- **ZIP 打包**：使用 Python `zipfile` 模組在記憶體中生成 ZIP

**測試驗證：**
```bash
# 單個 PDF 匯出測試
✅ MWO PDF: 6.6KB, 2 頁
✅ Estimate PDF: 2.7KB, 2 頁
✅ PO PDF: 6.1KB, 2 頁

# 批量 ZIP 匯出測試
✅ PDF 格式：21KB ZIP，包含 2 個 Run 的 6 個 PDF 檔案
✅ Excel 格式：8.1KB ZIP，包含 1 個 XLSX 檔案

# ZIP 結構驗證
Run-001_LW1FLWS/
├── MWO_MWO-2601-000001.pdf
├── EST_b6e7cebc-2734-4e06-8aad-57800219df4a.pdf
└── T2PO_.pdf
```

**新增文件：**
- `backend/apps/samples/services/pdf_export.py` - **NEW** (184 行)
- `backend/apps/samples/services/batch_export.py` - **NEW** (185 行)
- `backend/apps/samples/templates/pdf/base.html` - **NEW** (92 行)
- `backend/apps/samples/templates/pdf/mwo.html` - **NEW** (111 行)
- `backend/apps/samples/templates/pdf/estimate.html` - **NEW** (97 行)
- `backend/apps/samples/templates/pdf/t2po.html` - **NEW** (65 行)

**修改文件：**
- `backend/requirements/base.txt` - 添加 xhtml2pdf==0.2.11
- `backend/apps/samples/views.py` - 添加 PDF 和批量匯出端點
- `backend/apps/samples/urls.py` - 添加 URL 路由
- `frontend/lib/api/samples.ts` - 添加 PDF 和批量匯出函數
- `frontend/app/dashboard/samples/kanban/page.tsx` - 添加 PDF 和批量匯出按鈕

**已知限制：**
- xhtml2pdf CSS 支援有限（不支援 flexbox、grid、複雜偽選擇器）
- 大批量匯出（20+ Run）可能超過 30 秒（P4 可考慮 Celery 異步）
- ZIP 打包在記憶體中進行（適合中小規模匯出）

### 📋 待做

| 優先級 | 功能 |
|--------|------|
| P4 | 自訂 Excel/PDF 模板 |
| P4 | Celery 異步批量匯出 |
| P4 | 郵件發送功能 |
| Phase B | 多人協作 + RBAC |
| Phase B | Supplier Portal（品牌端查看）|

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

### 主要頁面

| 頁面 | URL |
|------|-----|
| Dashboard | /dashboard |
| 樣衣請求 | /dashboard/samples |
| **Kanban 看板** | **/dashboard/samples/kanban** |
| BOM 編輯 | /dashboard/revisions/{id}/bom |
| Costing | /dashboard/revisions/{id}/costing-phase23 |

### P2 Excel 匯出 API

| 功能 | HTTP Method | URL |
|------|-------------|-----|
| 匯出 MWO | GET | `/api/v2/sample-runs/{run_id}/export-mwo/` |
| 匯出 Estimate | GET | `/api/v2/sample-runs/{run_id}/export-estimate/` |
| 匯出 T2 PO | GET | `/api/v2/sample-runs/{run_id}/export-po/` |

**測試範例（LW1FLWS）：**
```bash
# Run ID: 8fac266c-22bd-479f-8e3a-b7751c74fcda
curl -O "http://localhost:8000/api/v2/sample-runs/8fac266c-22bd-479f-8e3a-b7751c74fcda/export-mwo/"
curl -O "http://localhost:8000/api/v2/sample-runs/8fac266c-22bd-479f-8e3a-b7751c74fcda/export-estimate/"
curl -O "http://localhost:8000/api/v2/sample-runs/8fac266c-22bd-479f-8e3a-b7751c74fcda/export-po/"
```

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
