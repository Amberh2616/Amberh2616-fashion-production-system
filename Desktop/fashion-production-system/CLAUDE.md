# Fashion Production System - Claude Project Memory

**Last Updated:** 2026-01-02
**Version:** 3.1.0
**Status:** P0-2 完成（Kanban + 狀態機）

---

## 系統定位

**AI-Augmented PLM + ERP Lite**

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

### 📋 待做

| 優先級 | 功能 |
|--------|------|
| P1 | 批量操作（多選 + 批量轉換）|
| P1 | 告警機制（overdue 通知）|
| P2 | 匯出 Excel/PDF |
| Phase B | 多人協作 |
| Phase C | 多租戶 SaaS |

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
