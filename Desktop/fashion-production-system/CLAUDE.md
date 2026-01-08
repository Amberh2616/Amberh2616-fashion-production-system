# Fashion Production System - Claude Project Memory

**Last Updated:** 2026-01-08
**Version:** 4.2.0
**Status:** P0-P5 完成 → BOM/Spec AI 翻譯 + MWO Spec Sheet ✅

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

### 📋 待做

| 優先級 | 功能 | 估計工時 | 文檔 | 狀態 |
|--------|------|----------|------|------|
| **P0** | **測試 Tech Pack 完整流程** | **0.5 天** | `docs/PROGRESS-UPDATE-2026-01-07-FINAL.md` | ✅ 已完成 |
| **P1** | **BOM 中文翻譯編輯界面** ⭐ | **1 天** | - | ⏳ 明天執行 |
| **P1** | **Measurement 中文翻譯編輯界面** | **1 天** | - | ⏳ 待實現 |
| P2 | MWO 完整匯出（Tech Pack + BOM + Spec）| 2 天 | `docs/TECH-PACK-MWO-INTEGRATION.md` | ⏳ 待實現 |
| P3 | 自訂 Excel/PDF 模板 | - | - | 📋 計劃中 |
| P4 | Celery 異步批量匯出 | - | - | 📋 計劃中 |
| Phase B | 多人協作 + RBAC | - | - | 📋 計劃中 |
| Phase B | Supplier Portal（品牌端查看）| - | - | 📋 計劃中 |

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
6. **中文字體**：PDF 文字渲染使用 PyMuPDF（`fontname="china-ss"`），不使用 Pillow
7. **終端編碼**：Cursor 終端已配置 UTF-8（`.vscode/settings.json`）

---

## 🎯 Tech Pack 翻譯完整流程（2026-01-07 修復）

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

階段 4：MWO 導出 ⏳ 待實現
  └→ 讀取 DraftBlock.edited_text
  └→ 讀取 BOMItem.material_name_zh（⚠️ 無編輯界面）
  └→ 讀取 Measurement.point_name_zh（⚠️ 無編輯界面）
  └→ 生成 MWO.pdf（PyMuPDF，方案 B）
```

---

## 📚 測試資料

### 推薦測試文件（未處理）

| 文件 | 大小 | 路徑 | 用途 |
|------|------|------|------|
| LW1FLWS TECH PACK.pdf | 9.0 MB | `backend/demo_data/techpacks/` | Tech Pack 翻譯測試 |
| LW1FLWS_BOM.pdf | 5.8 MB | `backend/demo_data/bom/` | BOM 提取測試 |

**確認：** 資料庫無任何記錄，適合完整流程測試
