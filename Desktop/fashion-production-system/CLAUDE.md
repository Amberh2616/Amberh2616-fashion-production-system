# Fashion Production System - Claude Project Memory

**Last Updated:** 2026-01-19
**Version:** 4.31.0
**Status:** P0-P26 完成 ✅ | P26 UI/UX 優化（跳轉加速）

---

## 快速導覽

| 文檔 | 說明 |
|------|------|
| **本文件** | 核心參考（指令、服務、架構）|
| **[docs/PROGRESS-CHANGELOG.md](docs/PROGRESS-CHANGELOG.md)** | 開發進度詳細記錄（P0-P20-A）|
| **[docs/SYSTEM-ACCEPTANCE-REPORT.md](docs/SYSTEM-ACCEPTANCE-REPORT.md)** | 系統驗收報告 + 待修復清單 + SaaS 規劃 |
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
| P19 | BOM 用量四階段管理 + 100款性能測試 | 2026-01-13 → 01-17 |
| P20-A | Sample Request 兩步確認流程 | 2026-01-14 |
| P21 | Tech Pack 翻譯框（拖曳+縮放+編輯+隱藏）| 2026-01-17 |
| P24 | PO 寄送供應商（Email + PDF 附件）| 2026-01-17 |
| P25 | 多輪 Fit Sample 支援 | 2026-01-18 |
| P26 | UI/UX 優化（導航、編輯介面、提取流程）| 2026-01-18 |

**詳細進度記錄請參見：** [docs/PROGRESS-CHANGELOG.md](docs/PROGRESS-CHANGELOG.md)

---

## 待做清單

| 編號 | 功能 | 狀態 |
|------|------|------|
| **P19** | BOM 用量四階段管理 | ✅ 完成 (2026-01-13 → 01-17) |
| **P20-A** | Sample Request 兩步確認流程 | ✅ 完成 (2026-01-14) |
| **QA-1** | 系統驗收報告 + 觸發點交叉比對 | ✅ 完成 (2026-01-16) |
| **FIX-P0** | 阻塞性問題 (7項) | ✅ 完成 (2026-01-16) |
| **FIX-P1** | 重要問題 (4項) | ✅ 完成 (2026-01-16) |
| **P21** | Tech Pack 翻譯框（拖曳+編輯+隱藏+收合面板）| ✅ 完成 (2026-01-17) |
| **P24** | PO 寄送供應商（Email 功能）| ✅ 完成 (2026-01-17) |
| **P25** | 多輪 Fit Sample 支援 | ✅ 完成 (2026-01-18) |
| **P26** | UI/UX 優化 | ✅ 完成 (2026-01-18) |
| **P22** | 庫存管理 (Inventory) | 規劃中 |
| **P23** | 採購優化 (Procurement Enhancement) | 規劃中 |
| DA-2 | Celery 異步處理 | 規劃中 |
| P12 | 自訂 Excel/PDF 模板 | 計劃中 |
| **SaaS-MVP** | 認證 + 數據隔離 + 前端登入 (11-16h) | 計劃中 |
| SaaS-RBAC | 權限控制 + 用戶管理 (10-14h) | 計劃中 |
| Phase B | Supplier Portal | 計劃中 |

### 已修復問題快覽（詳見 docs/SYSTEM-ACCEPTANCE-REPORT.md）

**P0（阻塞性）✅ 全部完成：**
1. ✅ BOM 新增按鈕
2. ✅ BOM 刪除按鈕
3. ✅ Spec 新增按鈕
4. ✅ Spec 刪除按鈕
5. ✅ confirm_sample 冪等性
6. ✅ null unit_price 檢查
7. ✅ UsageLine 讀取 current_consumption

**P1（重要）✅ 全部完成：**
8. ✅ Tech Pack 批量翻譯
9. ✅ MWO Tech Pack 中文疊加
10. ✅ BOM 驗證門檻 80%
11. ✅ CostSheet Refresh Snapshot API

### P24 PO 寄送供應商 ✅ 完成 (2026-01-17)

**已實現功能：**
- ✅ Email 發送服務 - `backend/apps/procurement/services/email_service.py`
- ✅ PO PDF 附件 - 自動附加 PO PDF
- ✅ 發送按鈕組件 - `frontend/components/procurement/SendPOButton.tsx`
- ✅ 狀態追蹤 - sent_at, sent_to_email, sent_count
- ✅ 重發支援 - sent 狀態可重發
- ✅ 自訂收件人 - 可覆蓋 supplier.email
- ✅ Email HTML 模板 - `backend/templates/emails/po_to_supplier.html`

**API：**
- `POST /api/v2/purchase-orders/{id}/send/`
- Body: `{ "email": "custom@email.com" }` (可選)

**Email 設定（待配置）：**
```python
# 開發環境（目前）- 輸出到 console
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# 生產環境 - Gmail SMTP
EMAIL_HOST = "smtp.gmail.com"
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = "your-email@gmail.com"
EMAIL_HOST_PASSWORD = "app-password"
```

### P25 多輪 Fit Sample 支援 ✅ 完成 (2026-01-18)

**已實現功能：**
- ✅ 後端服務函數 - `create_next_run_for_request()`
- ✅ API 端點 - `POST /api/v2/sample-requests/{id}/create-next-run/`
- ✅ API 端點 - `GET /api/v2/sample-requests/{id}/runs-summary/`
- ✅ 自動計算 run_no - max(run_no) + 1
- ✅ 繼承上一輪配置 - run_type, quantity
- ✅ 自動快照 - BOM/Operations/TechPack
- ✅ 自動生成 - MWO + CostSheet

**前端功能：**
- ✅ SampleRequest 詳情頁 - 「創建下一輪」按鈕
- ✅ Kanban 卡片 - 顯示 Run 輪次編號
- ✅ Fit Sample 多輪視覺標記

**使用方式：**
```
Fit Sample 多輪流程：
  1️⃣ Run #1 (Fit/Draft)
       ↓ 製作完成、客戶反饋
  2️⃣ 點擊「創建下一輪 (Run #2)」
       ↓ 自動生成 Run #2 + MWO + 報價單
  3️⃣ Run #2 (Fit/Draft)
       ↓ 根據反饋調整、再次製作
  ...
  ✅ Final Acceptance
```

**API 使用範例：**
```bash
# 創建下一輪
POST /api/v2/sample-requests/{id}/create-next-run/
{
  "run_type": "fit",      # 可選，預設繼承上一輪
  "quantity": 3,          # 可選，預設繼承上一輪
  "notes": "Round 2 adjustments"
}

# 獲取 Run 摘要
GET /api/v2/sample-requests/{id}/runs-summary/
```

### P26 UI/UX 優化 ✅ 完成 (2026-01-18)

**1. Spec 編輯介面簡化：**
- ✅ 移除 3 個 Tab（基本資訊/尺碼數值/翻譯）
- ✅ 合併為單一頁面，減少點擊次數
- ✅ AI 翻譯按鈕整合在中文名稱欄位旁邊
- 文件：`frontend/components/measurement/MeasurementEditDrawer.tsx`

**2. BOM/Spec/Costing 頁面導航：**
- ✅ 三個頁面新增統一導航按鈕
- ✅ 可在 BOM ↔ Spec ↔ 報價 之間快速切換
- 文件：
  - `frontend/app/dashboard/revisions/[id]/bom/page.tsx`
  - `frontend/app/dashboard/revisions/[id]/spec/page.tsx`
  - `frontend/app/dashboard/revisions/[id]/costing-phase23/page.tsx`

**3. 文件提取流程修復：**
- ✅ 後端 API 返回 `style_revision_id` + `tech_pack_revision_id`
- ✅ BOM 文件提取後正確跳轉到 BOM 頁面
- ✅ Spec 文件提取後正確跳轉到 Spec 頁面
- ✅ Tech Pack 提取後跳轉到翻譯審校頁面
- ✅ 提取超時增加到 10 分鐘（大型 PDF）
- 文件：
  - `backend/apps/parsing/views.py`
  - `frontend/app/dashboard/documents/[id]/review/page.tsx`

**4. 上傳頁面優化（2026-01-18 新增）：**
- ✅ 真實上傳進度條 - 使用 XHR 追蹤上傳百分比
- ✅ 改進錯誤處理 - 網路錯誤、回應解析錯誤
- 文件：`frontend/app/dashboard/upload/page.tsx`

**5. AI 處理頁面優化（2026-01-18 新增）：**
- ✅ 處理計時器 - 顯示已用時間（分秒）
- ✅ 取消按鈕 - 可中止處理返回上傳頁
- ✅ Toast 提示 - 分類完成/失敗通知
- ✅ AbortController - 頁面離開時清理請求
- 文件：`frontend/app/dashboard/documents/[id]/processing/page.tsx`

**6. 跳轉延遲移除（2026-01-19 新增）：**
- ✅ 移除 processing → review 的 1.5 秒延遲
- ✅ 移除 review → BOM/Spec/翻譯 的 2 秒延遲
- ✅ 移除 alert() 彈窗阻塞
- 文件：
  - `frontend/app/dashboard/documents/[id]/processing/page.tsx`
  - `frontend/app/dashboard/documents/[id]/review/page.tsx`

**導航佈局：**
```
┌────────────────────────────────────────────────────────────┐
│ [← 返回列表] | [📦 BOM 物料] | [📏 Spec 尺寸] | [$ 報價]   │
└────────────────────────────────────────────────────────────┘
```
