# API Design — Revised for Zero Rework (v2.2.1)
**Date:** 2025-12-18 (Asia/Taipei)  
**Based on:** API-SPEC v2.2.1 + UI_SPEC v2.2.1 + DECISIONS v2.2.1  
**Goal:** 最少變動、可落地、前後端不重工的 API 設計（以 Intake → Parse → Review → Orders → Docs 為主線）

---

## 0. 你這份草稿「已經很接近可用」，但需要修 10 個地方避免重工

### ✅ 必保留（做得對）
- `POST /intake/bulk-create`：一次建立 Style + Revision（上傳大量檔案的唯一正解）  
- Upload flow：`upload-init → PUT → complete → attach`（標準、可擴充）  
- Parse flow：`revision/parse → extraction_run_id`（Run 是 UI 的聚合查詢主鍵）  
- Risk badge：**後端計算**（不要永遠讓前端猜）  
- BatchRun：Modal polling `GET /batch-runs/{id}`（可重用）

### ⚠️ 必修（不修後面會痛）
1. **API Response Envelope 要全端一致**（你草稿有提，但要定義完整）  
2. **Document doc_type / file_kind 命名要固定**（避免再長出 `techpack_pdf`）  
3. **Intake bulk-create 要支援 idempotency / partial failure**（一次 300 款必遇到重複與錯誤）  
4. **upload-init/complete 要支援「快速預覽」與「去重」**（`download_url` + `file_hash`）  
5. **Style number detection 不要寫死 regex**（你已承認不追 100%，那就要定義「候選 + 人工修正」的資料結構）  
6. **Parse target 的 doc_type 映射要定義**（bom/measurement/construction 要吃哪些檔）  
7. **Draft vs Verified 的寫入端點要補**（D-011：AI = Draft，人 = Verified）  
8. **Jobs / BatchRuns / ExtractionRuns 的關係要說清楚**（前端才不會混用）  
9. **Risk 的 gating_block 需定義依據**（例如 Production PO gating）  
10. **HTTP Status / error schema 要寫明**（避免前端處理變成 if/else 地獄）

---

## 1. API Conventions（全端共用約定）

### 1.1 Base URL & Versioning
- Base: `/api/v2`
- 所有資源 path 用複數：`/styles`, `/revisions`, `/documents`

### 1.2 Response Envelope（必須）
成功：
```json
{
  "data": { },
  "meta": {
    "request_id": "req_...",
    "ts": "2025-12-18T10:00:00Z"
  },
  "errors": []
}
```

失敗（HTTP 4xx/5xx）：
```json
{
  "data": null,
  "meta": { "request_id": "req_...", "ts": "..." },
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "revision_id is required",
      "field": "revision_id",
      "hint": "Provide UUID",
      "details": { }
    }
  ]
}
```

### 1.3 Pagination Meta（列表必須）
```json
"meta": {
  "pagination": {
    "page": 1,
    "page_size": 50,
    "total": 300,
    "total_pages": 6
  }
}
```

### 1.4 Idempotency（強烈建議）
對於「可能被重送」的 POST（bulk-create、batch-runs、parse、generate-pdf），支援：
- Header: `Idempotency-Key: <uuid>`
- 回傳 meta: `idempotency_key`（可選）

> **理由**：一次 300 款上傳、網路抖動、使用者重按，沒有 idempotency 會出現重複 Revision / Job。

### 1.5 Auth（最小可用）
- Header: `Authorization: Bearer <token>`  
- meta 回：`organization_id`（多租戶時）

---

## 2. Data Model 必須對齊（Document 命名修正版）

### 2.1 Document 欄位：doc_type 與 file_kind 分離
`doc_type`（用途）：
- `techpack`, `bom`, `spec`, `artwork`, `marker`, `sample_photo`, `other`

`file_kind`（格式）：
- `pdf`, `xlsx`, `docx`, `img`, `csv`

> **建議補一個**：`source`：`customer | internal | vendor`（後面追責很有用）

---

## 3. Intake（多檔上傳的主流程）

### 3.1 Bulk Create Styles + Revisions
`POST /api/v2/intake/bulk-create`

#### Request
```json
{
  "items": [
    {
      "style_number": "LW1FLPS",
      "style_name": "Nulu Cami Tank",
      "season": "SP25",
      "customer": "Lululemon",
      "revision_label": "Rev A",
      "source": "customer"
    }
  ],
  "options": {
    "allow_update_style_fields": false
  }
}
```

#### Response（支援 partial success）
```json
{
  "data": [
    {
      "index": 0,
      "style_id": "uuid-1",
      "style_number": "LW1FLPS",
      "revision_id": "uuid-rev-1",
      "revision_label": "Rev A",
      "created": true,
      "status": "success",
      "errors": []
    }
  ],
  "meta": { "total": 1, "created": 1, "skipped": 0 },
  "errors": []
}
```

#### 必備行為（避免重工）
- 以 `(organization_id, style_number)` 做 upsert  
- 以 `(style_id, revision_label)` 做 upsert  
- 若 style 已存在但 season/customer 不同：
  - `allow_update_style_fields=false` → 回 warning，不覆蓋
  - `allow_update_style_fields=true` → 覆蓋（需權限）

---

## 4. Documents Upload Flow（修正版：加預覽 + 去重）

### 4.1 Init Upload
`POST /api/v2/documents/upload-init`

Request:
```json
{
  "doc_type": "techpack",
  "file_kind": "pdf",
  "filename": "LW1FLPS_TechPack.pdf",
  "content_type": "application/pdf",
  "file_size": 2048576,
  "file_hash": "sha256_optional_if_known"
}
```

Response:
```json
{
  "data": {
    "document_id": "uuid",
    "storage_key": "org-abc/techpacks/2025/12/uuid.pdf",
    "upload_url": "https://...",
    "expires_in": 900,
    "already_exists": false
  }
}
```

### 4.2 PUT to storage（S3/MinIO）
`PUT {upload_url}`（binary）

### 4.3 Complete Upload（回 presigned download_url 供立即預覽）
`POST /api/v2/documents/{document_id}/complete`

Request:
```json
{ "file_hash": "sha256...", "file_size": 2048576 }
```

Response:
```json
{
  "data": {
    "document_id": "uuid",
    "storage_key": "org-abc/techpacks/2025/12/uuid.pdf",
    "download_url": "https://...presigned...",
    "status": "uploaded"
  }
}
```

### 4.4 Attach to Revision
`POST /api/v2/documents/{document_id}/attach`

Request:
```json
{ "revision_id": "uuid" }
```

Response:
```json
{ "data": { "attached": true } }
```

### 4.5 List documents by revision（Review 左側 PDF 用）
`GET /api/v2/revisions/{revision_id}/documents`

---

## 5. Parse / Extraction（AI 任務中心的主線）

### 5.1 Trigger Parse
`POST /api/v2/revisions/{revision_id}/parse`

Request:
```json
{
  "targets": ["bom", "measurement", "construction"],
  "options": {
    "doc_types": ["techpack", "bom", "spec"],
    "force_rerun": false
  }
}
```

Response：
```json
{
  "data": {
    "extraction_run_id": "uuid-run",
    "job_id": "uuid-job",
    "status": "queued"
  }
}
```

### 5.2 Get ExtractionRun（聚合查詢）
`GET /api/v2/extraction-runs/{extraction_run_id}`

### 5.3 Jobs（執行單位）
- `GET /api/v2/jobs?status=running&kind=parse&page=1&page_size=50`
- `GET /api/v2/jobs/{job_id}`

關係定義：
- **Job**：一個可排程任務（Celery 任務對應）  
- **ExtractionRun**：一次解析工作的聚合（包含多個 AI calls / 子任務）  
- **BatchRun**：一批目標（多 revision / 多 order_item）聚合

---

## 6. Draft vs Verified（D-011 的落地端點）

### 6.1 Get Draft
`GET /api/v2/revisions/{revision_id}/draft`

### 6.2 Patch Draft（Review UI 編輯 draft）
`PATCH /api/v2/revisions/{revision_id}/draft`

### 6.3 Approve Draft → Write Verified
`POST /api/v2/revisions/{revision_id}/approve`

> gating：存在 `severity=error` 且 `status=open` issues → 409 阻擋 approve。

---

## 7. Styles List（補齊 risk，後端計算）
`GET /api/v2/styles?...` 回 `risk: ["missing","low_conflict","gating_block"]`

建議補：`next_action`（讓列表快速導流）。

---

## 8. Orders / Consumption（最小可用）
- `POST /api/v2/orders`
- `POST /api/v2/orders/{order_id}/items`
- `POST /api/v2/orders/{order_id}/generate-order-bom`
- `GET /api/v2/orders/{order_id}/consumption`
- `PATCH /api/v2/order-item-bom/{id}`
- `POST /api/v2/orders/{order_id}/marker-reports`
- `POST /api/v2/orders/{order_id}/trim-measurements`

---

## 9. PO / MWO / Documents（非同步 PDF：D-008）
- `POST /api/v2/orders/{order_id}/manufacturing-orders/generate` (async)
- `POST /api/v2/orders/{order_id}/purchase-orders/drafts/generate`
- `POST /api/v2/orders/{order_id}/purchase-orders/drafts/recalculate`（手動重算：D-006）
- `GET /api/v2/documents?scope=generated&order_id=...`

---

## 10. Batch Runs
- `POST /api/v2/batch-runs`
- `GET /api/v2/batch-runs/{id}`

---

## 11. Style Number Detection（前端資料結構建議）
```ts
interface UploadFileRow {
  file: File;
  doc_type: DocumentType;
  file_kind: FileKind;
  style_candidates: string[];   // 存多個候選（可點選）
  style_number: string;         // editable
  revision_label: string;       // editable
  season?: string;              // editable
  status: "pending" | "uploading" | "uploaded" | "error";
  error?: string;
}
```

---

## 12. Backend Checklist（Phase 1 必做）
- [ ] Document model 加 `file_kind`
- [ ] `POST /intake/bulk-create`（upsert + partial results）
- [ ] `POST /documents/upload-init` 回 `storage_key`
- [ ] `POST /documents/{id}/complete` 回 `download_url`
- [ ] `POST /revisions/{id}/parse` 回 `extraction_run_id`
- [ ] `GET /extraction-runs/{id}`
- [ ] `GET/PATCH /revisions/{id}/draft`
- [ ] `POST /revisions/{id}/approve`（含 gating）
- [ ] `GET /styles` 回 `risk`
- [ ] `POST/GET /batch-runs`

---

## Appendix — HTTP Status 建議
- 200 OK / 201 Created / 202 Accepted  
- 400 / 401 / 403 / 404 / 409 / 422 / 500
