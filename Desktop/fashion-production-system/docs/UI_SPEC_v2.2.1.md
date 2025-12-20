# UI SPEC（可開發）— AI-Augmented PLM + ERP Lite v2.2.1
**適用對象**：前端工程師 / 後端工程師 / PM（可直接開工）  
**前端建議技術**：Next.js 14（App Router）+ TypeScript + Tailwind + shadcn/ui + TanStack Table + TanStack Query + react-pdf  
**通知/任務**：SSE（優先）或輪詢  
**日期**：2025-12-17

---

## 0. 核心設計原則（務必遵守）
1. **AI 只能產生 Draft / Change Plan，不能直接覆蓋 Verified。**  
2. **所有「產生文件」「批次操作」「AI 解析」都必須 Async。**（避免卡住 UI）
3. **所有列表頁都要支援：搜尋、篩選、排序、分頁/虛擬滾動。**
4. **任何會影響下單/製造的操作都要有 Gating（阻擋原因要清楚可跳轉）。**
5. **一人作業流**：多選 → 批次 → 任務中心 → 失敗重跑 → Review → Approve。

---

## 1. 資訊架構（IA）與路由
### Sidebar 導覽（MVP 7 頁）
- `/styles`：Styles 工作台（300 款總表）
- `/intake`：Intake 上傳中心（檔案/資料夾）
- `/jobs`：Parse Jobs（AI 背景任務中心）
- `/review`：Review Queue（待你核可隊列）
- `/orders`：Sales Orders（大貨訂單）
- `/consumption`：Consumption（OrderItemBOM / 用量成熟度）
- `/documents`：Documents（MWO/PO 產出與下載）

> 進階（可先隱藏）：`/settings`（供應商/工廠/字典/術語庫）

---

## 2. 全域 UI/UX 規格
### 2.1 Layout
- **Top Bar**：Logo/系統名、全站搜尋、通知鈴鐺、使用者選單
- **Sidebar**：可收合（icon-only）
- **Main**：每頁上方固定 Toolbar（搜尋/篩選/主要按鈕）

### 2.2 全域狀態提示
- Toast：成功/失敗/警告（短）
- Inline Banner：阻擋型錯誤（需要你處理）
- Skeleton：列表與表格載入時
- Empty State：引導下一步（上傳/建立訂單）

### 2.3 權限（MVP 可簡化）
- Role：`admin`（你）/ `viewer`（只讀）
- 所有「Approve、Generate、Edit」只允許 `admin`

### 2.4 即時通知（SSE）
- Endpoint：`GET /api/events`（SSE）
- 事件類型（最低限度）：
  - `job.completed` / `job.failed`
  - `batch.completed` / `batch.failed`
  - `document.ready`
  - `review.pending`（可選）

> 若不用 SSE：前端每 5–10 秒輪詢 `/api/jobs?status=running`。

---

## 3. 共用元件（Component Inventory）
### 3.1 DataTable（核心）
- TanStack Table + 虛擬滾動（row virtualization）
- 功能：
  - row selection（多選）
  - column pin（固定左列：checkbox + 主鍵）
  - inline edit（cell editor）
  - bulk edit（選取多列一次改 supplier/status）
  - CSV/Excel 匯出（可先做 CSV）
- 驗收：
  - 300 款列表滑動不卡（<16ms frame drop 盡量）
  - 1000+ BOM 行可用

### 3.2 PDFViewer
- `react-pdf`（左側 viewer）
- 功能：頁碼、縮放、跳頁、縮圖列（可選）
- 需求：支援高解析（避免字太糊）
- 下載：由 Document presigned URL

### 3.3 BatchRunModal
- 顯示批次進度（success/failed/running）
- 提供：`Retry Failed`、`Export Result CSV`、`Open Failed Items`

### 3.4 AIChangePlanModal
- 顯示 AI 建議修改（diff）
- Buttons：`Apply` / `Reject` / `Ask Again`
- Apply 後：刷新 Draft/Verified 資料

### 3.5 IssuePanel
- Issue filter：error/warn/info
- Issue action：Fix（跳到對應 tab + row）、Ignore（需原因）

---

## 4. 7 頁 UI SPEC（逐頁可開發）

# PAGE 1 — Styles 工作台（300 款總表）
**Route**：`/styles`  
**目的**：全季總控、多選批次入口。

### UI 結構
- Toolbar：
  - Search（StyleNo/Name）
  - Filters：Season、Customer、Status、Risk
  - Buttons：`Upload`、`Batch Actions`、`Export`
- Table Columns（固定建議）
  1. `select`（checkbox）
  2. `style_no`（string, pinned）
  3. `style_name`（string）
  4. `season`（string）
  5. `customer`（string）
  6. `latest_revision`（Rev A/B…）
  7. `status`（uploaded/parsing/draft/approved/in_production/completed）
  8. `risk`（badge：missing/low_conflict/gating_block）
  9. `updated_at`（datetime）
  10. `actions`（Open / Quick Parse / Review）

### 主要操作
- 多選 → Batch Actions：
  - Batch Parse（對最新 revision）
  - Batch Generate MWO（需要有 order items）
  - Batch Generate PO Draft（RFQ/Production）

### API（前端需串）
- GET `/api/styles?season=&status=&q=&page=`
- POST `/api/batch-runs`
  - body：
    ```json
    {"action":"parse","targets":[{"revision_id":"..."}]}
    ```
- GET `/api/batch-runs/{id}`（顯示進度）

### AC（驗收條件）
- 多選 50 款可送出 batch，並跳出 BatchRunModal
- filters + search 正常工作
- status/risk badge 正確顯示

---

# PAGE 2 — Intake 上傳中心（資料夾/多檔）
**Route**：`/intake`  
**目的**：一次匯入 tech pack/bom/spec/artwork，建立 revision。

### UI 結構
- Dropzone：支援多檔
- File Table：
  - filename
  - guessed_type（TechPack/BOM/Spec/Artwork/Other，可改）
  - guessed_style_no（可改）
  - season（可改）
  - revision_label（可改）
- Buttons：
  - `Create Style+Revision`
  - `Start Parse Now`（可勾選）

### API
- POST `/api/revisions`（建立 revision）
  ```json
  {"style_no":"LW1FLPS","season":"SP25","revision_label":"Rev A"}
  ```
- POST `/api/documents/upload-init`（取得上傳 URL / key）
- PUT `presigned_url`（直傳 S3/MinIO）
- POST `/api/documents/attach`
  ```json
  {"revision_id":"...","doc_type":"techpack","storage_key":"...","filename":"..."}
  ```
- POST `/api/revisions/{id}/parse`（建立 ExtractionRun）

### AC
- 上傳 10+ 檔可成功 attach 到 revision
- 解析任務可在 Jobs 頁看到

---

# PAGE 3 — Parse Jobs（任務中心）
**Route**：`/jobs`  
**目的**：看 AI 解析/文件生成任務狀態、重試。

### UI 結構
- Filters：status（running/failed/completed）
- Table Columns：
  - run_id
  - kind（parse/mwo/po/marker_parse）
  - target（revision/order_item）
  - status
  - progress
  - cost
  - started_at / finished_at
  - actions（Open / Retry）
- Drawer（點開一列）：
  - error log
  - extracted_types
  - links：Open Review / Open Documents

### API
- GET `/api/jobs?status=`
- POST `/api/jobs/{id}/retry`

### AC
- failed 任務可 retry
- completed 任務可一鍵進 Review 或 Documents

---

# PAGE 4 — Draft Review（左 PDF 右資料）
**Route**：`/review/{revision_id}`（或 `/styles/{style_id}/revisions/{rev_id}/review`）  
**目的**：將 AI Draft 修正後核可為 Verified。

### UI 結構
- Header：StyleNo + Rev + Status + 按鈕群
  - `Ask AI Fix`（打開 AIChangePlanModal）
  - `Save`
  - `Approve Revision`
- Left：PDFViewer（來源 doc_type=techpack/spec/bom）
- Right：Tabs
  - BOM（editable table）
  - Measurement（editable table）
  - Construction（editable list/table）
  - Issues（IssuePanel）

### 表格欄位（最小版）
**BOM**
- item_no, category, material_name, supplier, color, uom, notes, confidence, evidence_page
**Measurement**
- point_name, size_values(可展開), tol+/-, unit, confidence, evidence_page
**Construction**
- step_no, description, machine/stitch(optional), qc_point(optional), confidence, evidence_page

### 主要互動
- 點 Issue → 自動切到 tab + highlight row
- Ask AI Fix：
  - input：issue_ids + selected_rows + user_instruction（你可輸入一句話）
  - output：change_plan（diff）
  - 你按 Apply 才寫入 Draft / Verified（依狀態）

### Gating（Approve 前）
- error 等級 issues 不能存在（除非 ignore 並填原因）
- 必填欄位缺失（style_no、至少一份 techpack、BOM 至少 1 行）阻擋 approve

### API
- GET `/api/revisions/{id}`（含 doc list）
- GET `/api/revisions/{id}/draft`（AI 草稿）
- PATCH `/api/revisions/{id}/draft`（儲存你改的草稿）
- POST `/api/ai/fix-plan`
  ```json
  {"revision_id":"...","issue_ids":["..."],"selected_rows":{"bom":[1,3]},"instruction":"補上 supplier，並統一單位為 cm"}
  ```
- POST `/api/revisions/{id}/approve`
  ```json
  {"verified_payload":{...},"ignore_issues":[...]}
  ```

### AC
- 左右對照可用、issue 可定位
- AIChangePlan 可 Apply，並立刻反映到表格
- Approve 後 revision status=approved，Draft 鎖定（只讀）

---

# PAGE 5 — Orders（大貨訂單）
**Route**：`/orders` 與 `/orders/{order_id}`  
**目的**：建立 SalesOrder + SalesOrderItems（顏色/尺碼量）並綁定 approved revision。

### UI 結構
- Orders list（表格）
- Order detail：
  - Header form（PO#、客戶、交期…）
  - Items table（可新增/匯入）
  - Button：`Generate Order BOM`

### Items Table 欄位
- style_no（lookup）
- approved_revision（必填）
- colorway
- size_breakdown（JSON/小表格）
- total_qty
- factory

### API
- GET `/api/sales-orders`
- POST `/api/sales-orders`
- POST `/api/sales-orders/{id}/items`
- POST `/api/sales-order-items/{id}/generate-order-bom`

### AC
- order item 建立時必選 approved revision
- generate-order-bom 後，可在 Consumption 頁看到 orderitembom rows

---

# PAGE 6 — Consumption（訂單級 BOM 用量成熟度）
**Route**：`/consumption?order_item_id=...`  
**目的**：管理用量 unknown→pre_estimate→confirmed→locked，並管理證據。

### UI 結構
- Header：order item 資訊 + Buttons
  - `Upload Marker Report`
  - `Enter Trim Measurement`
  - `Lock Selected`
  - `Recalculate PO Drafts`
- Table（OrderItemBOM）欄位（MVP）
  - category（fabric/trim/label/packaging）
  - material_name
  - supplier
  - uom
  - pre_estimate_value
  - confirmed_value
  - locked_value
  - status（unknown/pre_estimate/confirmed/locked）
  - evidence（marker doc / sample photo link）
  - actions（edit）

### Gating 提示（重要）
- Production PO 產出時，若 fabric status 不是 confirmed/locked：
  - 顯示阻擋原因 + 一鍵跳回此頁 + 提示「請上傳 Marker」

### API
- GET `/api/order-item-boms?order_item_id=`
- PATCH `/api/order-item-boms/{id}`
- POST `/api/marker-reports`（上傳後建立解析 job）
- POST `/api/trim-measurements`
- POST `/api/po-drafts/recalculate?order_item_id=...`

### AC
- marker 上傳後，fabric 行自動回填 confirmed（由 job 完成事件觸發刷新）
- lock 後不可改（除非 admin unlock—MVP 可不做）

---

# PAGE 7 — Documents（MWO/PO 產出與下載）
**Route**：`/documents`  
**目的**：批次生成 MWO/PO PDF，下載與版本管理。

### UI 結構
- Toolbar：
  - Order selector
  - Type filter（MWO/PO RFQ/PO Production）
  - Batch buttons：`Batch Generate MWO`、`Generate PO Drafts`
- Documents table：
  - type
  - reference（style/order_item/supplier）
  - status（generating/ready/failed/blocked）
  - version
  - generated_at
  - download

### API
- POST `/api/mwo/generate`（async）
- POST `/api/po-drafts/generate`
  ```json
  {"order_item_ids":["...","..."],"po_type":"RFQ"}
  ```
- GET `/api/documents?order_id=&type=`
- GET `/api/documents/{id}/download`（presigned）

### AC
- 一次選 20–50 items 可批次生成（走 BatchRun）
- blocked 要顯示原因與跳轉（去 Consumption）

---

## 5. BatchRun（統一批次體驗）
### 5.1 UI 規格
- 任何批次都回傳 `batch_run_id`，前端一律開 BatchRunModal
- Modal 顯示：
  - summary：submitted/success/failed/running
  - row list：每個 target 的狀態 + Open
  - actions：Retry Failed / Export CSV

### 5.2 API
- POST `/api/batch-runs`
- GET `/api/batch-runs/{id}`

---

## 6. 最小資料契約（前端要用到的 DTO）
### 6.1 StyleRow
```json
{
  "id":"uuid",
  "style_no":"LW1FLPS",
  "style_name":"Nulu Cami Tank",
  "season":"SP25",
  "customer":"Lululemon",
  "latest_revision":{"id":"uuid","label":"Rev A","status":"draft"},
  "risk":["missing_supplier","low_confidence"],
  "updated_at":"2025-12-17T10:00:00Z"
}
```

### 6.2 JobRow
```json
{
  "id":"uuid",
  "kind":"parse",
  "target":{"revision_id":"uuid"},
  "status":"running",
  "progress":0.6,
  "cost_usd":1.02,
  "error":null
}
```

### 6.3 ChangePlan（AI Fix）
```json
{
  "plan_id":"uuid",
  "edits":[
    {"path":"bom[2].supplier","before":null,"after":"ABC TRIM","reason":"Found in page 3"}
  ],
  "confidence":0.83,
  "evidence":[{"page":3,"quote":"Supplier: ABC TRIM"}]
}
```

---

## 7. 非功能需求（必寫進工程任務）
- **Performance**
  - styles list：300 rows 無感
  - BOM 表：1000+ rows 可用（virtualization）
- **Reliability**
  - 斷線/刷新後，Job/Batch 狀態可恢復
- **Audit**
  - Approve/Lock/Generate 都要記錄 `who/when`
- **Download**
  - 所有 PDF 下載走 presigned URL（避免後端流量爆）

---

## 8. 開發順序（照這個做最快落地）
1) Styles List（含 batch UI 框架）
2) Intake Upload（文件 attach）
3) Jobs（能看到 parse 任務）
4) Draft Review（先做 BOM tab + Issues）
5) Approve flow（draft→verified）
6) Orders + Generate Order BOM
7) Consumption（marker/trim 後補，先手動輸入）
8) Documents（MWO/PO 先做一種 PDF）

---

## 9. MVP「可上線」定義
- 你可以：上傳 tech pack → parse → review 修正 → approve → 建 order → 產 MWO PDF → 下載發給工廠
- PO Draft 可先只做到 RFQ（Production gating 後補也行）

