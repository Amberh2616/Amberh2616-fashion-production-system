# Fashion Production System - Claude Project Memory

**Last Updated:** 2026-01-13
**Version:** 4.25.0
**Status:** P0-P11 + P14-P19 完成 ✅ | BOM 用量三階段管理 | P20 庫存管理 規劃中

---

## 快速導覽

| 文檔 | 說明 |
|------|------|
| **本文件** | 核心參考（指令、服務、架構）|
| **[docs/PROGRESS-CHANGELOG.md](docs/PROGRESS-CHANGELOG.md)** | 開發進度詳細記錄（P0-P18）|
| **[docs/BUSINESS-FLOW.md](docs/BUSINESS-FLOW.md)** | 業務流程與數據模型 |
| `docs/SYSTEM-ARCHITECTURE-v3.md` | 完整系統架構 |

---

## 核心定位

**AI-Augmented PLM + ERP Lite for Garment Factories**

```
主要用戶 = 成衣廠（操作者、付費者）
次要受益者 = 品牌（獲得可視性，減少派人監督成本）

目標：1 人管理 300-500+ 款/季，70-80% 自動化
```

> **核心原則：SampleRun 是唯一的「執行真相來源」**
> MWO / Estimate / T2 PO 都是 Run 的輸出文件。

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

# Type Check
cd frontend && npm run type-check

# Lint
cd frontend && npm run lint
```

---

## 服務地址

| 服務 | URL |
|------|-----|
| 前端 | http://localhost:3000 |
| 後端 API | http://localhost:8000/api/v2/ |
| Admin | http://localhost:8000/admin/ |

---

## 技術棧

| 層級 | 技術 |
|------|------|
| **Backend** | Django 4.2 + DRF + PostgreSQL |
| **Frontend** | Next.js 14 + React 18 + TanStack Query/Table + shadcn/ui |
| **AI** | OpenAI GPT-4o Vision |
| **狀態管理** | TanStack Query (前端) |
| **PDF 處理** | PyMuPDF + Pillow |

---

## 導航結構

```
Dashboard
├── Progress              # 進度追蹤儀表板
├── Upload                # 單筆 + 批量上傳（Tab 切換）
├── Styles                # 款式列表
├── BOM                   # 物料表
├── Samples               # 樣衣列表
├── Kanban                # 看板視圖
├── Scheduler             # 甘特圖
├── Production            # 大貨訂單
├── Purchase Orders       # 採購單
├── Suppliers             # 供應商
└── Materials             # 物料主檔
```

---

## 主要頁面與 API

### 前端頁面

| 頁面 | 路徑 |
|------|------|
| 進度儀表板 | `/dashboard/progress` |
| 上傳文件（單筆+批量）| `/dashboard/upload` |
| AI 處理頁面 | `/dashboard/documents/{id}/processing` |
| 分類審查 | `/dashboard/documents/{id}/review` |
| 翻譯審校 | `/dashboard/revisions/{id}/review` |
| BOM 編輯 | `/dashboard/revisions/{id}/bom` |
| Spec 編輯 | `/dashboard/revisions/{id}/spec` |
| Costing | `/dashboard/revisions/{id}/costing-phase23` |
| Kanban 看板 | `/dashboard/samples/kanban` |
| 甘特圖 | `/dashboard/scheduler` |
| 大貨訂單 | `/dashboard/production-orders` |
| 採購單 | `/dashboard/purchase-orders` |
| 供應商 | `/dashboard/suppliers` |
| 物料主檔 | `/dashboard/materials` |

### 核心 API 端點

| 功能 | API |
|------|-----|
| **上傳文件** | `POST /api/v2/uploaded-documents/` |
| **批量上傳 ZIP** | `POST /api/v2/uploaded-documents/batch-upload/` |
| **AI 分類** | `POST /api/v2/uploaded-documents/{id}/classify/` |
| **AI 提取** | `POST /api/v2/uploaded-documents/{id}/extract/` |
| **批准 Revision** | `POST /api/v2/revisions/{id}/approve/` |
| **創建 Sample Request** | `POST /api/v2/sample-requests/` |
| **進度儀表板** | `GET /api/v2/progress-dashboard/` |
| **Kanban 列表** | `GET /api/v2/kanban/runs/` |
| **狀態轉換** | `POST /api/v2/sample-runs/{id}/{action}/` |
| **MWO 完整匯出** | `GET /api/v2/sample-runs/{id}/export-mwo-complete-pdf/` |
| **大貨訂單** | `GET/POST /api/v2/production-orders/` |
| **MRP 計算** | `POST /api/v2/production-orders/{id}/calculate_mrp/` |
| **採購單生成** | `POST /api/v2/production-orders/{id}/generate_po/` |

---

## 資料模型核心

```
Style → Revision → BOMItem (Verified)
                 → SampleRequest → SampleRun → MWO
                                            → CostSheetVersion
                                            → PurchaseOrder
                 → ProductionOrder → MaterialRequirement → PurchaseOrder
```

---

## 狀態機

### SampleRun

```
DRAFT → SUBMITTED → QUOTED → PENDING_APPROVAL → APPROVED
                                              → REJECTED
APPROVED → MATERIALS → PO_ISSUED → IN_PRODUCTION → COMPLETED
ANY → CANCELLED
```

### PurchaseOrder

```
draft → sent → confirmed → partial_received/received
any → cancelled
```

### ProductionOrder

```
draft → confirmed → materials_ordered → in_production → completed
```

---

## 注意事項

1. **快照原則**：Run 的 BOM/Operation 是複製，不是 FK
2. **不可回寫**：Phase 3 資料不得修改 Phase 2 的 verified 資料
3. **採購拆單**：T2 PO 按供應商拆分，分 Draft/Issued
4. **文件編號**：MWO-YYMM-XXXXXX 格式，用 sequence 避免撞號
5. **雙 Revision 設計**：
   - `StyleRevision`：用於 BOM/Measurement 編輯
   - `TechPackRevision (Revision)`：用於 DraftBlocks 翻譯審校
6. **中文字體**：MWO 完整匯出使用 Pillow + PyMuPDF，字體為微軟雅黑（msyh.ttc）
7. **終端編碼**：Cursor 終端已配置 UTF-8

---

## 測試資料

### 推薦測試文件

| 文件 | 大小 | 路徑 |
|------|------|------|
| LW1FLWS TECH PACK.pdf | 9.0 MB | `backend/demo_data/techpacks/` |
| LW1FLWS_BOM.pdf | 5.8 MB | `backend/demo_data/bom/` |

---

## 完成功能摘要

| Phase | 功能 | 完成日期 |
|-------|------|----------|
| P0-P3 | 基礎功能（Upload/Parse/Kanban/Export）| 2026-01-04 |
| P4-P8 | 翻譯流程（Tech Pack/BOM/Spec/MWO）| 2026-01-09 |
| P9-P11 | 甘特圖 + 流程測試 + AI 準確度提升 | 2026-01-10 |
| P14-P17 | 主檔管理 + 採購 + 大貨訂單 + MRP | 2026-01-10 |
| P18 | 流程連結 + 進度追蹤儀表板 | 2026-01-11 |
| DA-1 | 批量上傳 Tech Pack（ZIP）| 2026-01-11 |

**詳細進度記錄請參見：** [docs/PROGRESS-CHANGELOG.md](docs/PROGRESS-CHANGELOG.md)

---

## 待做清單

| 編號 | 功能 | 狀態 |
|------|------|------|
| **P19** | 庫存管理 (Inventory) | 規劃中 |
| **P20** | 採購優化 (Procurement Enhancement) | 規劃中 |
| DA-2 | Celery 異步處理 | 規劃中 |
| P12 | 自訂 Excel/PDF 模板 | 計劃中 |
| Phase B | 多人協作 + RBAC | 計劃中 |
| Phase B | Supplier Portal | 計劃中 |
