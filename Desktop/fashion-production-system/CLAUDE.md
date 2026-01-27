# Fashion Production System - Claude Project Memory

**Last Updated:** 2026-01-28
**Version:** 4.41.0
**Status:** P0-P29 + DA-2 + P23 + GLO-1 + FIX-0128 完成 ✅ | Mixed 文件提取修復

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

# 啟動 Redis（異步處理需要）
redis-server

# 啟動 Celery Worker（異步處理需要，Windows 用 --pool=solo）
cd backend && celery -A config worker -l info --pool=solo

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
├── Documents             # 文件管理（含款式 Tab）
│   ├── Tech Pack Tab     # Tech Pack 文件
│   ├── BOM Tab           # BOM 文件
│   ├── Mixed Tab         # 混合文件
│   ├── 未分類 Tab        # 未分類文件
│   └── 款式 Tab          # 款式列表（原 Styles 頁面）
├── BOM                   # 物料表
├── Spec                  # 尺寸規格
├── Costing               # 報價
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
| 文件管理（AI 分類）| `/dashboard/tech-packs?tab=tech_pack` |
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
| P27 | Kanban 四大改善（MWO預檢/批量轉換/狀態回退/甘特拖曳）| 2026-01-20 |
| P28 | 小助理 Assistant（指令式對話）| 2026-01-20 |
| P29 | Documents 款式整合（Styles Tab）| 2026-01-20 |
| DA-2 | Celery 異步處理（分類+提取 async mode）| 2026-01-21 |

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
| **P27** | Kanban 四大改善（MWO預檢/批量轉換/回退/甘特拖曳）| ✅ 完成 (2026-01-20) |
| **P28** | 小助理 Assistant（指令式對話）| ✅ 完成 (2026-01-20) |
| **P29** | Documents 款式整合（Styles Tab）| ✅ 完成 (2026-01-20) |
| **DA-2** | Celery 異步處理（分類+提取 async mode）| ✅ 完成 (2026-01-21) |
| **P23** | 採購優化（交期追蹤 + 狀態改善）| ✅ 完成 (2026-01-21) |
| **GLO-1** | 成衣詞彙庫整合翻譯（1252 條術語）| ✅ 完成 (2026-01-22) |
| **FIX-0124** | 詞彙庫修正 + Tech Pack 提取修復 | ✅ 完成 (2026-01-24) |
| **FIX-0126** | API URL 統一 + 健康檢查 | ✅ 完成 (2026-01-26) |
| **FIX-0128** | Mixed 文件提取修復（BOM 頁也提取 Tech Pack）| ✅ 完成 (2026-01-28) |
| **TODO-EXT** | 提取預覽/檢查功能 | 待做 |
| **P22** | 庫存管理 (Inventory) | 規劃中 |
| P12 | 自訂 Excel/PDF 模板 | 計劃中 |
| **SaaS-MVP** | 數據隔離 ✅ 已完成 / 前端登入 ❌ 待做 (4-6h) | 部分完成 |
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

**7. Documents 文件管理頁面（2026-01-19 新增）：**
- ✅ 新增 Documents 頁面 - `/dashboard/tech-packs`
- ✅ AI 分類 Tab 切換 - Tech Pack / BOM / Mixed / 未分類
- ✅ 使用 `classification_result.file_type` 自動分類（非檔名）
- ✅ 刪除按鈕 - 每行可刪除重複上傳的文件
- ✅ 現代化 UI - 灰色系 + 藍色重點設計
- ✅ Tab 狀態保持 - 使用 URL 參數（`?tab=bom`）
- ✅ Sidebar 導航 - "Documents" 連結
- ✅ 分類確認頁導航 - 「所有文件」按鈕
- ✅ 翻譯審校頁導航 - Header 「Documents」連結
- 文件：
  - `frontend/app/dashboard/tech-packs/page.tsx`
  - `frontend/components/layout/Sidebar.tsx`
  - `frontend/app/dashboard/documents/[id]/review/page.tsx`
  - `frontend/app/dashboard/revisions/[id]/review/page.tsx`

**導航佈局：**
```
┌────────────────────────────────────────────────────────────┐
│ [← 返回列表] | [📦 BOM 物料] | [📏 Spec 尺寸] | [$ 報價]   │
└────────────────────────────────────────────────────────────┘
```

### P27 Kanban 四大改善 ✅ 完成 (2026-01-20)

**1. MWO 預檢 (Pre-check)：**
- ✅ 轉換前驗證 BOM/Operations 是否完整
- ✅ 預檢 API - `POST /api/v2/sample-runs/{id}/precheck-transition/`
- ✅ 前端預檢對話框 - 顯示缺失項目清單
- 文件：
  - `backend/apps/samples/services/run_transitions.py`
  - `frontend/components/samples/TransitionPrecheckDialog.tsx`

**2. 智能批量轉換 (Smart Batch Transition)：**
- ✅ 多選 Run 批量轉換狀態
- ✅ 自動跳過不符合條件的 Run
- ✅ 顯示成功/失敗/跳過統計
- ✅ API - `POST /api/v2/sample-runs/batch-transition/`
- 文件：
  - `backend/apps/samples/views.py`
  - `frontend/app/dashboard/samples/kanban/page.tsx`

**3. 狀態回退 (Rollback)：**
- ✅ 支援回退到前一狀態
- ✅ 回退原因記錄
- ✅ 回退目標 API - `GET /api/v2/sample-runs/{id}/rollback-targets/`
- ✅ 執行回退 API - `POST /api/v2/sample-runs/{id}/rollback/`
- ✅ 前端回退對話框 - `RollbackDialog.tsx`
- 文件：
  - `backend/apps/samples/services/run_transitions.py`
  - `frontend/components/samples/RollbackDialog.tsx`

**4. 甘特圖日期拖曳編輯：**
- ✅ 點擊甘特條可編輯開始/結束日期
- ✅ 日期選擇對話框
- ✅ API - `POST /api/v2/sample-runs/{id}/update-dates/`
- 文件：
  - `backend/apps/samples/views.py`
  - `frontend/app/dashboard/scheduler/page.tsx`

### P28 小助理 Assistant ✅ 完成 (2026-01-20)

**功能概述：**
- ✅ 指令式對話（Method A - 無 ChatGPT）
- ✅ 英文介面
- ✅ 浮動按鈕 ✨ 於右下角
- ✅ 對話框介面

**支援指令：**
| 指令 | 功能 |
|------|------|
| `help` | 查看所有指令 |
| `overdue` | 顯示逾期樣衣 |
| `this week` | 顯示本週待辦 |
| `tasks` | 顯示任務清單 |
| `summary` | 顯示生產總覽 |
| `recent` | 顯示最近更新 |
| `pending po` | 顯示待處理採購單 |
| `check [款號]` | 查詢款式狀態 |
| `add task [內容]` | 新增任務 |
| `add note [內容]` | 新增筆記 |
| `draft email [款號]` | 生成 PO 郵件草稿 |

**後端文件：**
- `backend/apps/assistant/models.py` - 資料模型
- `backend/apps/assistant/services/command_parser.py` - 指令解析器
- `backend/apps/assistant/views.py` - API 視圖
- `backend/apps/assistant/urls.py` - 路由

**前端文件：**
- `frontend/components/assistant/AssistantButton.tsx` - 浮動按鈕
- `frontend/components/assistant/AssistantDialog.tsx` - 對話框
- `frontend/lib/api/assistant.ts` - API 函數

**API 端點：**
- `POST /api/v2/assistant/chat/` - 發送訊息
- `GET /api/v2/assistant/chat/history/` - 取得對話記錄
- `DELETE /api/v2/assistant/chat/history/` - 清除記錄
- `GET/POST/PATCH/DELETE /api/v2/assistant/tasks/` - 任務 CRUD
- `GET/POST /api/v2/assistant/notes/` - 筆記 CRUD
- `GET /api/v2/assistant/notifications/` - 通知列表

### FIX-MWO 中文 PDF 修復 ✅ 完成 (2026-01-20)

**問題描述：**
- MWO PDF 匯出時中文顯示為亂碼或空白
- 藍色 PDF 按鈕使用 ReportLab（不支援中文）

**修復內容：**

1. **MWO 匯出中文欄位 Fallback 邏輯**
   - 如果 `material_name_zh` 是空白或無中文，自動使用 `material_name`
   - 過濾 AI 垃圾回應（如 "This appears to be..."）
   - 文件：`backend/apps/samples/services/mwo_complete_export.py`

2. **藍色 PDF 按鈕改用完整匯出**
   - 從 `exportMWOPDF`（ReportLab）改為 `exportMWOCompletePDF`（Pillow + PyMuPDF）
   - 支援中文字體渲染
   - 文件：`frontend/app/dashboard/samples/kanban/page.tsx`

3. **BOM translation_status 修復**
   - 修復 LM7B24S、LW1DKES-WI24 等款式的 BOM 項目
   - 將 `translation_status` 從 `pending` 更新為 `confirmed`

**技術說明：**
- 完整 MWO PDF 使用 Pillow 在圖片上繪製中文，再用 PyMuPDF 合併成 PDF
- 字體：微軟雅黑（msyh.ttc）
- 簡易 PDF 使用 ReportLab，不支援中文（已棄用）

### P29 Documents 款式整合 ✅ 完成 (2026-01-20)

**功能概述：**
- ✅ 將獨立的「Styles」頁面整合進 Documents 頁面
- ✅ 新增「款式」Tab 於 Documents 頁面
- ✅ 支援款號、品牌、季節搜尋
- ✅ 簡化 Sidebar 導航

**變更內容：**

1. **Documents 頁面新增 Styles Tab**
   - Tab 結構：`[ Tech Pack | BOM | Mixed | 未分類 | 款式 ]`
   - 款式表格欄位：款號、品牌、季節、建立時間、操作
   - 搜尋支援：款號、品牌、季節
   - 款式 Tab 隱藏狀態篩選器（僅文件需要）
   - 文件：`frontend/app/dashboard/tech-packs/page.tsx`

2. **Sidebar 導航簡化**
   - 移除獨立的「Styles」連結
   - 用戶透過 Documents → 款式 Tab 查看款式
   - 文件：`frontend/components/layout/Sidebar.tsx`

**API 使用：**
- `GET /api/v2/styles/` - 獲取款式列表
- 使用 TanStack Query 條件查詢（`enabled: activeTab === 'styles'`）

### DA-2 Celery 異步處理 ✅ 完成 (2026-01-21)

**功能概述：**
- ✅ 將耗時的 AI 分類和提取操作從同步改為異步
- ✅ 提升多人使用體驗（API 立即返回，後台處理）
- ✅ 支持任務狀態查詢和前端輪詢
- ✅ 向後兼容（默認同步，加 `?async=true` 才是異步）

**架構設計：**
```
用戶點擊「AI 提取」
      ↓
Django API 返回 task_id（立即）
      ↓
Celery Worker 在後台處理（60-150秒）
      ↓
前端輪詢任務狀態（每 2.5 秒）
      ↓
完成後自動跳轉
```

**後端文件：**
- `backend/apps/parsing/models.py` - 添加 task_id 字段
- `backend/apps/parsing/tasks/_main.py` - 異步任務定義
- `backend/apps/parsing/services/extraction_service.py` - 提取邏輯服務
- `backend/apps/parsing/views.py` - TaskStatusViewSet + async 參數支持
- `backend/apps/parsing/urls.py` - tasks 路由

**前端文件：**
- `frontend/app/dashboard/documents/[id]/processing/page.tsx` - 分類輪詢
- `frontend/app/dashboard/documents/[id]/review/page.tsx` - 提取輪詢

**API 端點：**
| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/v2/uploaded-documents/{id}/classify/?async=true` | POST | 異步分類，返回 task_id |
| `/api/v2/uploaded-documents/{id}/extract/?async=true` | POST | 異步提取，返回 task_id |
| `/api/v2/tasks/{task_id}/` | GET | 查詢 Celery 任務狀態 |

**任務狀態：**
- `PENDING`: 任務等待中
- `STARTED`: 任務已開始執行
- `SUCCESS`: 任務成功完成
- `FAILURE`: 任務失敗

**使用方式：**
```bash
# 1. 啟動 Redis
redis-server

# 2. 啟動 Celery Worker（Windows 需要 --pool=solo）
cd backend && celery -A config worker -l info --pool=solo

# 3. 啟動 Django
cd backend && python manage.py runserver 8000

# 4. 啟動前端
cd frontend && npm run dev

# 5. 測試 API
curl -X POST "http://localhost:8000/api/v2/uploaded-documents/{id}/classify/?async=true"
# 返回: {"task_id": "abc123...", "status": "pending"}

curl "http://localhost:8000/api/v2/tasks/abc123.../"
# 返回: {"task_id": "...", "status": "SUCCESS", "result": {...}}
```

**測試結果（2026-01-21）：**
| 測試項目 | 結果 |
|---------|------|
| Redis 服務器 | ✅ 運行中 (端口 6379) |
| Celery Worker | ✅ 2 個進程運行中 |
| 異步分類 | ✅ 成功測試 (LM7BPSS_BOM.pdf → bom_only) |
| 任務狀態 API | ✅ 正常返回 JSON |
| 同步提取 | ✅ 成功 (22 BOM items) |

**開關配置：**
- 前端 `USE_ASYNC_MODE = true`（默認啟用）
- 後端通過 `?async=true` 參數控制

### P23 採購優化（交期追蹤 + 狀態改善）✅ 完成 (2026-01-21)

**功能概述：**
- ✅ PO/POLine 級別逾期檢測
- ✅ 前端顯示逾期標記和天數
- ✅ Assistant 新增「overdue po」查詢指令
- ✅ 新增兩個中間狀態：`in_production`（生產中）、`shipped`（已出貨）

**狀態流程圖：**
```
         ┌─────────────────────────────────────────────────────────┐
         │                                                         │
         ▼                                                         │
      draft ──► sent ──► confirmed ──► in_production ──► shipped ──┼──► received
                             │              │              │       │
                             │              │              │       │
                             └──────────────┴──────────────┴───────┘
                                      (可跳過中間狀態)

         任何狀態 ──► cancelled（除了 received）
```

**後端文件：**
- `backend/apps/procurement/models.py` - 新增狀態 + 逾期 properties
- `backend/apps/procurement/serializers.py` - 添加逾期字段
- `backend/apps/procurement/views.py` - 新增 API actions
- `backend/apps/procurement/migrations/0009_add_po_production_shipped_status.py` - 資料庫遷移
- `backend/apps/assistant/services/command_parser.py` - overdue po 指令

**前端文件：**
- `frontend/lib/types/purchase-order.ts` - 類型定義更新
- `frontend/lib/api/purchase-orders.ts` - API 函數
- `frontend/lib/hooks/usePurchaseOrders.ts` - React Query hooks
- `frontend/app/dashboard/purchase-orders/page.tsx` - 列表頁
- `frontend/app/dashboard/purchase-orders/[id]/page.tsx` - 詳情頁

**API 端點：**
| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/v2/purchase-orders/overdue/` | GET | 列出所有逾期 PO |
| `/api/v2/purchase-orders/{id}/start_production/` | POST | confirmed → in_production |
| `/api/v2/purchase-orders/{id}/ship/` | POST | in_production/confirmed → shipped |

**逾期判斷邏輯：**
- PO 級別：`expected_delivery < today` AND `status not in ['received', 'cancelled']`
- POLine 級別：`(expected_delivery or required_date) < today` AND `delivery_status != 'received'`

**前端功能：**
- ✅ 列表頁：Expected Delivery 欄位顯示逾期標籤 `Overdue Xd`
- ✅ 列表頁：統計卡片新增 In Production、Shipped 計數
- ✅ 列表頁：下拉選單新增 Start Production、Mark Shipped 按鈕
- ✅ 詳情頁：逾期警告橫幅
- ✅ 詳情頁：Expected Delivery 卡片紅色高亮
- ✅ 詳情頁：新增狀態轉換按鈕

**Assistant 指令：**
- `overdue po` / `late po` / `delayed po` - 返回逾期 PO 清單（最多 15 筆）
- 顯示：PO 編號、供應商、逾期天數、金額

### GLO-1 成衣詞彙庫整合翻譯 ✅ 完成 (2026-01-22)

**功能概述：**
- ✅ 從 Excel 專業術語表提取 1252 條成衣英中對照詞彙
- ✅ 建立 JSON 格式詞彙庫，涵蓋 34 個分類
- ✅ 翻譯服務整合詞彙庫查詢（精確匹配優先）
- ✅ LLM 翻譯時附帶相關詞彙參考，提升專業術語準確度

**詞彙庫分類（部分）：**
| 分類 | 條目數 | 範例 |
|------|--------|------|
| 縮寫 | 180 | ARMHOLE 夾圈、AQL 驗收合格標準 |
| 顏色 | 144 | Amber 琥珀色、Navy 海軍藍 |
| 車縫裁床 | 85 | BARTACK 打結車、BINDING 包邊 |
| 服裝部位 | 38 | COLLAR 領子、SLEEVE 袖子 |
| 副料 | 57+ | VELCRO 魔術貼、SNAP 撳鈕 |
| 常用單詞 | 28 | THREAD 線、ZIPPER 拉鏈 |

**翻譯策略：**
```
1. 詞彙庫精確匹配 → 直接使用（0 API 調用）
2. 無精確匹配 → LLM 翻譯 + 相關詞彙參考（提升準確度）
```

**文件：**
- `backend/apps/parsing/data/garment_glossary.json` - 詞彙庫 JSON (1252 條)
- `backend/apps/parsing/utils/translate.py` - 翻譯工具（含詞彙庫整合）
- `docs/成衣業專業英文 全部彙整(保護檔案).xls` - 原始 Excel 詞彙表

**函數 API：**
```python
from apps.parsing.utils.translate import (
    load_glossary,           # 載入詞彙庫
    lookup_glossary,         # 精確查詢
    get_relevant_glossary_terms,  # 取得相關詞彙
    machine_translate,       # 單筆翻譯（整合詞彙庫）
    batch_translate,         # 批量翻譯（整合詞彙庫）
)

# 範例
lookup_glossary('LINING')  # → '裏布'
lookup_glossary('ZIPPER')  # → '拉鏈'
```

**效能提升：**
- BOM 項目翻譯：約 60% 可直接從詞彙庫匹配（0 API 調用）
- LLM 翻譯：附帶相關詞彙參考，專業術語更準確

### FIX-0124 詞彙庫修正 + Tech Pack 提取修復 ✅ 完成 (2026-01-24)

**1. 詞彙庫翻譯修正：**
- ✅ `BARTACK`: 打棗 → **打結車**
- 文件：`backend/apps/parsing/data/garment_glossary.json`

**2. Tech Pack 提取修復：**
- ✅ 修復被分類為 "other" 的頁面被跳過的問題
- ✅ 重新提取 LM5ARES.pdf（6 頁全部提取，共 158 個區塊）
- 原因：第 2 頁被 AI 分類為 "other"（fit reference images），導致提取時跳過
- 解法：手動將分類結果改為 "tech_pack" 後重新提取

**提取結果（LM5ARES.pdf）：**
| 頁面 | 區塊數 | 狀態 |
|------|--------|------|
| 第 1 頁 | 34 | ✅ 新增 |
| 第 2 頁 | 7 | ✅ 新增 |
| 第 3 頁 | 47 | ✓ |
| 第 4 頁 | 58 | ✓ |
| 第 5 頁 | 27 | ✓ |
| 第 6 頁 | 8 | ✓ |
| **總計** | **158** | |

**技術說明：**
- 提取技術：pdfplumber（文字層）+ GPT-4o Vision（圖形標註）
- 翻譯技術：GPT-4o-mini + 成衣詞彙庫參考
- 新 TechPackRevision ID：`ca07cbb4-8292-48a3-9e1a-a9fbba97389f`

### FIX-0126 API URL 統一 + 健康檢查 ✅ 完成 (2026-01-26)

**問題來源：** 專案分析報告 `Desktop/0126.txt`

**1. P0 修復 - API 版本混用：**
- ✅ `lib/api/techpack.ts:124` - `/api` → `/api/v2`
- ✅ `app/dashboard/upload/page.tsx` - 硬編 URL → 使用 `API_BASE_URL`

**2. P1 修復 - 統一 API URL：**
- ✅ 修復 19 個文件的硬編 URL
- ✅ 統一使用 `API_BASE_URL` 從 `lib/api/client.ts` 導入
- ✅ 移除 `127.0.0.1` vs `localhost` 不一致問題

**修改文件清單：**
| 類型 | 文件 |
|------|------|
| API | `techpack.ts`, `approve.ts`, `samples.ts`, `purchase-orders.ts` |
| Hooks | `useDraft.ts`, `useDraftBlockPosition.ts` |
| Pages | `upload`, `processing`, `review`, `tech-packs`, `bom`, `spec`, `costing`, `revisions/*`, `samples/*`, `techpack-translation/*` |

**3. P1 修復 - Celery/Redis 健康檢查：**

**後端新增：**
- ✅ `apps/core/views.py` - `services_health_check()` 函數
- ✅ `config/urls.py` - `/api/v2/health/` 路由
- ✅ 檢查項目：Database / Redis / Celery Worker

**API 端點：**
```
GET /api/v2/health/services/

Response:
{
  "status": "healthy|degraded|unhealthy",
  "database": {"status": "ok", "message": "Connected"},
  "redis": {"status": "ok", "message": "Connected to localhost:6379"},
  "celery": {"status": "ok", "message": "2 worker(s) online"},
  "async_ready": true,
  "sync_available": true
}
```

**前端新增：**
- ✅ `processing/page.tsx` - 服務狀態檢查 + 警告橫幅
- ✅ 當 Redis/Celery 不可用時顯示 amber 色提示
- ✅ 提示用戶同步模式仍可運作

**4. P2 修復 - README 更新：**
- ✅ 移除過時的 `ai_service` 目錄說明
- ✅ 更新技術架構圖
- ✅ 更新啟動指令
- ✅ 添加健康檢查端點說明

### FIX-0128 Mixed 文件提取修復 ✅ 完成 (2026-01-28)

**問題描述：**
- Mixed 文件中，bom_table 頁面的文字注釋（如 BULK COMMENTS）沒有被提取
- 原因：提取邏輯只對 `tech_pack` 分類的頁面提取 Tech Pack 區塊
- P1808 第 4 頁被分類為 `bom_table`，導致頁面上的英文評語完全漏翻

**修復內容：**
- ✅ Mixed 文件中，bom_table 頁面也加入 Tech Pack 提取列表
- ✅ 確保 BOM 頁面上的文字注釋也能被提取和翻譯

**修改文件：**
- `backend/apps/parsing/services/extraction_service.py`

**修復邏輯：**
```python
if is_mixed:
    # 原有：other 頁面加入提取
    if other_pages:
        tech_pack_pages = sorted(set(tech_pack_pages + other_pages))
        bom_pages = sorted(set(bom_pages + other_pages))

    # 新增：bom_table 頁面也提取 Tech Pack
    if bom_pages:
        tech_pack_pages = sorted(set(tech_pack_pages + bom_pages))
```

**測試結果（P1808）：**
| 項目 | 修復前 | 修復後 |
|------|--------|--------|
| 第 4 頁區塊數 | 0 | 39 |
| BULK COMMENTS | 未提取 | ✅ 已提取並翻譯 |
| 總區塊數 | - | 258 |

---

### TODO-EXT 提取預覽/檢查功能（待做）

**背景：**
展示新客戶資料時，若提取有問題會很尷尬。需要上傳後先確認分類結果再提取。

**待實現功能：**

| 編號 | 功能 | 說明 |
|------|------|------|
| **TODO-1** | 提取預覽 | 上傳後顯示每頁分類結果 + 預計提取內容摘要 |
| **TODO-2** | 潛在問題警告 | 檢測 bom_table 頁有大量文字時，提示「建議也提取 Tech Pack」 |
| **TODO-3** | 提取前確認對話框 | 展示前可先確認分類是否正確，必要時可手動調整 |

**預期流程：**
```
上傳 PDF
    ↓
AI 分類（自動）
    ↓
【新增】顯示分類預覽
    ├── 每頁類型：tech_pack / bom_table / other
    ├── 潛在問題警告
    └── 可手動調整分類
    ↓
用戶確認後提取
    ↓
正式提取 + 翻譯
```

**優先級：** P2（展示前建議完成）
