# Fashion Production System - Claude Project Memory

**Last Updated:** 2026-01-03
**Version:** 3.4.1
**Status:** P0-2 + SaaS + P1 完成 → P2 待做

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

### 📋 待做

| 優先級 | 功能 |
|--------|------|
| P2 | 匯出 Excel/PDF |
| Phase B | 多人協作 + RBAC |

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
