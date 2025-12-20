# API-SPEC v2.2.1 (Complete)
**Last Updated:** 2025-12-17  
**Base URL:** `/api/v2`  
**Format:** JSON (UTF-8)  
**Auth:** JWT (HttpOnly cookie) *or* Bearer token (choose one; examples below assume Bearer)  
**Id type:** UUID v4  
**Notes:** 本文件涵蓋 MVP（Phase 1）所需的完整端點：Style/Revision、Upload/Intake、Parse/Review、Order/用量、Marker/Trim、MWO/PO、Batch、通知。

---

## 0) Conventions

### 0.1 Standard response envelope
除非特別說明，所有 response 都使用同一 envelope：
```json
{
  "data": {},
  "meta": {
    "request_id": "req_...",
    "pagination": null
  },
  "errors": []
}
```

### 0.2 Pagination
```http
GET /resource?limit=50&cursor=xxxxx
```
```json
{
  "data": [{}, {}],
  "meta": {
    "pagination": {
      "limit": 50,
      "next_cursor": "xxxxx"
    }
  },
  "errors": []
}
```

### 0.3 Error format
```json
{
  "data": null,
  "meta": { "request_id": "req_..." },
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Fabric consumption not confirmed. Upload Marker Report first.",
      "fields": ["order_item_bom.consumption_status"]
    }
  ]
}
```

### 0.4 Common enums (Phase 1)
- `revision_status`: `uploaded | parsing | draft | approved | failed | superseded`
- `batch_status`: `queued | running | completed | failed | cancelled`
- `draft_review_status`: `open | resolved | ignored`
- `po_status`: `draft | generating | approved | issued | cancelled | failed`
- `mwo_status`: `draft | generating | completed | failed`
- `consumption_status`: `unknown | pre_estimate | confirmed | locked`

---

## 1) Auth & User (MVP minimal)

### 1.1 Login
`POST /auth/login`
```json
{"email":"amber@example.com","password":"***"}
```
Response 200:
```json
{"data":{"token":"jwt_or_access_token","user":{"id":"...","email":"...","role":"admin"}},"meta":{},"errors":[]}
```

### 1.2 Me
`GET /auth/me`  
Response 200:
```json
{"data":{"id":"...","email":"...","role":"admin","organization_id":"..."},"meta":{},"errors":[]}
```

---

## 2) Style & Revision (Core entities)

### 2.1 Create style
`POST /styles`
```json
{
  "style_number": "LW1FLPS",
  "style_name": "Nulu Cami Tank",
  "season": "SP25",
  "customer": "Lululemon",
  "notes": ""
}
```
Response 201: returns Style.

### 2.2 List styles
`GET /styles?season=SP25&status=active&search=LW1`

### 2.3 Get style detail
`GET /styles/{style_id}`
Returns style + latest revision summary + counts.

### 2.4 Update style
`PATCH /styles/{style_id}`

### 2.5 Create revision (metadata only)
`POST /styles/{style_id}/revisions`
```json
{"version_label":"Rev A","source":"customer","received_date":"2025-12-17"}
```

### 2.6 List revisions
`GET /styles/{style_id}/revisions`

### 2.7 Get revision detail (includes parse + review summary)
`GET /revisions/{revision_id}`

### 2.8 Approve revision (promote verified data → approved)
`POST /revisions/{revision_id}/approve`
```json
{"comment":"Reviewed and approved","lock_fields":false}
```
Rules:
- Only `revision_status=draft` can be approved.
- Approve requires all `DraftReviewItem.severity=error` resolved/ignored.

Response 200:
```json
{"data":{"revision_id":"...","status":"approved","approved_at":"..."}, "meta":{}, "errors":[]}
```

---

## 3) Document / File Intake (Upload, presigned URL, linking)

### 3.1 Create upload (presigned)
`POST /documents/upload-init`
```json
{
  "doc_type": "techpack_pdf",
  "filename": "SP25 Nulu Cami Tank.pdf",
  "content_type": "application/pdf",
  "size_bytes": 1234567,
  "style_id": "uuid-optional",
  "revision_id": "uuid-optional"
}
```
Response 200:
```json
{
  "data": {
    "document_id": "uuid",
    "upload": {
      "method": "PUT",
      "url": "https://presigned-url...",
      "headers": {"Content-Type":"application/pdf"},
      "expires_in": 900
    }
  },
  "meta": {}, "errors": []
}
```

### 3.2 Confirm upload (server verifies hash, stores metadata)
`POST /documents/{document_id}/upload-complete`
```json
{"file_hash":"sha256:..."}
```
Response 200: document status → `ready`.

### 3.3 Download document (presigned)
`GET /documents/{document_id}/download`
Response 200:
```json
{"data":{"url":"https://presigned-download...","expires_in":900},"meta":{},"errors":[]}
```

### 3.4 Attach document to revision
`POST /revisions/{revision_id}/documents`
```json
{"document_id":"uuid","role":"primary"}
```
Roles: `primary | bom | spec | artwork | marker_report | sample_photo | fit_comment | mwo_pdf | po_pdf`

---

## 4) Parsing / Extraction (AI pipeline trigger + results)

### 4.1 Trigger parse (async)
`POST /revisions/{revision_id}/parse`
```json
{
  "strategies": ["known_format","table_detect","vision_llm"],
  "targets": ["bom","measurement","construction"],
  "language": {"source":"en","target":"zh-TW"},
  "create_review_items": true
}
```
Rules:
- Allowed when revision_status in `uploaded | failed | draft`.
- If `approved`, must create a new revision instead.

Response 202:
```json
{
  "data": {
    "extraction_run_id": "uuid",
    "status": "queued"
  },
  "meta": {}, "errors": []
}
```

### 4.2 Get extraction run status
`GET /extraction-runs/{run_id}`
Response 200:
```json
{
  "data": {
    "id":"uuid",
    "revision_id":"uuid",
    "status":"running",
    "progress": {"pct": 65, "stage":"extract_measurements"},
    "started_at":"...",
    "completed_at":null,
    "cost": {"usd": 1.23, "model_calls": 4}
  },
  "meta": {}, "errors": []
}
```

### 4.3 Get parsed draft data (AI draft)
`GET /revisions/{revision_id}/draft`
Returns normalized draft tables + raw AI snapshot references.

### 4.4 Write verified corrections (user edits)
`PATCH /revisions/{revision_id}/verified`
Supports partial updates for normalized entities.
Example (BOM line edit):
```json
{
  "bom_items": [
    {
      "id":"uuid",
      "material_name":"Nulu Fabric",
      "supplier_id":"uuid-or-null",
      "color":"Black",
      "consumption_method":"marker_report"
    }
  ]
}
```
Response 200: updated verified snapshot + audit log id.

---

## 5) Draft Review (Issues queue, resolve, ignore)

### 5.1 List draft review items
`GET /revisions/{revision_id}/review-items?status=open&severity=error`
Response 200: list.

### 5.2 Resolve a review item
`POST /review-items/{item_id}/resolve`
```json
{"resolution":"fixed_by_user_edit","note":"Supplier assigned"}
```

### 5.3 Ignore a review item
`POST /review-items/{item_id}/ignore`
```json
{"reason":"acceptable_variation","note":"Customer did not provide code"}
```

---

## 6) Orders (Sales Order) & Order Items (bulk quantities)

### 6.1 Create sales order
`POST /sales-orders`
```json
{
  "customer":"Lululemon",
  "po_number":"PO-2025-0001",
  "season":"SP25",
  "currency":"USD",
  "requested_ship_date":"2026-02-15"
}
```

### 6.2 Add order items (link to approved revision)
`POST /sales-orders/{order_id}/items`
```json
{
  "items":[
    {
      "style_id":"uuid",
      "approved_revision_id":"uuid",
      "color":"Black",
      "size_breakdown": {"XS":200,"S":400,"M":600,"L":500,"XL":300},
      "total_qty": 2000,
      "factory_id":"uuid-optional"
    }
  ]
}
```
Rules:
- `approved_revision_id` 必須是 `approved`。
- 建立 item 後，系統會自動生成 `OrderItemBOM`（由 revision BOM 模板複製）。

Response 201: created items + created `order_item_bom_count`.

### 6.3 List order items
`GET /sales-orders/{order_id}/items?status=active`

### 6.4 Get order item detail (includes consumption maturity & issues)
`GET /sales-order-items/{item_id}`

---

## 7) OrderItemBOM (Order-level BOM instances + consumption maturity)

### 7.1 List OrderItemBOM
`GET /sales-order-items/{item_id}/bom?category=fabric&consumption_status=pre_estimate`

### 7.2 Update OrderItemBOM (manual edits / supplier assignment / wastage)
`PATCH /order-item-bom/{order_item_bom_id}`
```json
{
  "supplier_id": "uuid",
  "wastage_rate": 5.0,
  "pre_estimate_value": 2.5,
  "consumption_status": "pre_estimate",
  "consumption_source": "manual"
}
```

### 7.3 Lock consumption (manual lock for Production gating)
`POST /order-item-bom/{order_item_bom_id}/lock`
```json
{"lock_value": 2.38, "note":"PP前鎖定"}
```
Effect:
- sets `locked_value` and `consumption_status=locked`

### 7.4 Bulk update (batch edit table)
`POST /order-item-bom/bulk-update`
```json
{
  "updates":[
    {"id":"uuid1","supplier_id":"uuidS1"},
    {"id":"uuid2","wastage_rate":7.0}
  ]
}
```

---

## 8) Marker Report (fabric consumption confirmation)

### 8.1 Upload marker report (init + attach)
(1) 用 `documents/upload-init` 上傳 `doc_type=marker_report`  
(2) Attach to SalesOrderItem:
`POST /sales-order-items/{item_id}/marker-reports`
```json
{"document_id":"uuid","file_type":"excel"}
```
Response 202: created marker_report record.

### 8.2 Trigger marker parse (async)
`POST /marker-reports/{marker_report_id}/parse`
```json
{"parse_method":"rule_based_or_ai","target":"fabric_consumption"}
```

### 8.3 Get marker report
`GET /marker-reports/{marker_report_id}`
Returns parsed_data + backfill log.

### 8.4 Backfill to fabric OrderItemBOM (optional explicit)
`POST /marker-reports/{marker_report_id}/backfill`
Response: updated fabric OrderItemBOM list.

---

## 9) Trim Measurement (sample measured confirmation for trims)

### 9.1 Submit trim measurements (simple form)
`POST /sales-order-items/{item_id}/trim-measurements`
```json
{
  "measurements":[
    {"order_item_bom_id":"uuid","measured_value":68.5,"uom":"cm/pc","notes":"含 overlap 2cm","photo_document_ids":["uuid"]}
  ]
}
```
Response 201: record created + backfill summary.

### 9.2 Get trim measurements record
`GET /trim-measurements/{record_id}`

---

## 10) Trim Rule Library (Phase 1 optional, API ready)

### 10.1 List rules
`GET /trim-rules?category=elastic&active=true`

### 10.2 Create rule
`POST /trim-rules`
```json
{
  "rule_name":"Elastic Waist Opening + overlap",
  "material_category":"elastic",
  "rule_type":"formula",
  "formula":"waist_opening + overlap",
  "formula_params": {"overlap":2.5},
  "required_measurement_points":["waist_opening"],
  "active": true
}
```

---

## 11) Purchase Orders (PO Drafts + gating)

### 11.1 Generate PO drafts (RFQ / Production)
`POST /sales-order-items/{item_id}/po-drafts/generate`
```json
{
  "po_type":"RFQ",
  "group_by":"supplier",
  "include_unassigned_bucket": true,
  "rounding": {"default":"ceil_to_pack","pack_size_by_uom": {"yard":1,"pcs":1}}
}
```
Rules (gating):
- `po_type=RFQ`: allow `unknown | pre_estimate | confirmed | locked`
- `po_type=Production`:
  - category=fabric: require `confirmed | locked` (marker evidence)
  - category=trim: require `confirmed | locked` (sample measurement or verified rule)

Response 202:
```json
{
  "data": {
    "task_id":"uuid",
    "status":"queued"
  },
  "meta": {}, "errors": []
}
```

### 11.2 List PO drafts for an order item
`GET /sales-order-items/{item_id}/po-drafts?status=draft`

### 11.3 Approve PO draft (human approval)
`POST /po-drafts/{po_id}/approve`
```json
{"approved_by":"user","note":"OK to send RFQ"}
```

### 11.4 Export PO PDF (async generate + store Document)
`POST /po-drafts/{po_id}/export-pdf`
```json
{"template":"po_standard_v1","language":"zh-TW"}
```

### 11.5 Get PO detail (with lines + calc evidence)
`GET /po-drafts/{po_id}`

---

## 12) Manufacturing Work Order (MWO) generation

### 12.1 Generate MWO for order item (async)
`POST /sales-order-items/{item_id}/mwo/generate`
```json
{
  "template":"mwo_standard_v1",
  "language":"zh-TW",
  "include": {
    "bom": true,
    "measurements": true,
    "construction": true,
    "qc_points": true,
    "artworks": true
  }
}
```
Response 202: task created.

### 12.2 Get MWO status / detail
`GET /mwo/{mwo_id}`

### 12.3 Download MWO PDF
`GET /mwo/{mwo_id}/download` (returns presigned url via Document)

---

## 13) Batch API (Phase 1 MVP)

### 13.1 Create batch run
`POST /batch-runs`
```json
{
  "type":"batch_parse",
  "name":"SP25 Week1 Parse",
  "items":[
    {"revision_id":"uuid1"},
    {"revision_id":"uuid2"}
  ],
  "params": {
    "concurrency_limit": 5,
    "retry_limit": 2,
    "targets":["bom","measurement","construction"]
  }
}
```
Response 202: batch_run_id.

### 13.2 Batch generate MWO
`POST /batch-runs`
```json
{
  "type":"batch_generate_mwo",
  "items":[ {"sales_order_item_id":"uuid1"}, {"sales_order_item_id":"uuid2"} ],
  "params": {"template":"mwo_standard_v1","language":"zh-TW"}
}
```

### 13.3 Batch generate PO drafts
`POST /batch-runs`
```json
{
  "type":"batch_generate_po_drafts",
  "items":[ {"sales_order_item_id":"uuid1"}, {"sales_order_item_id":"uuid2"} ],
  "params": {"po_type":"RFQ","include_unassigned_bucket":true}
}
```

### 13.4 Get batch status
`GET /batch-runs/{batch_id}`
Returns per-item results + errors + retry counts.

### 13.5 Cancel batch
`POST /batch-runs/{batch_id}/cancel`

---

## 14) Notifications (SSE / Polling)

### 14.1 Polling task status (simple MVP)
`GET /tasks/{task_id}`
Response 200:
```json
{
  "data": {
    "id":"uuid",
    "type":"generate_mwo_pdf",
    "status":"running",
    "progress": {"pct": 80},
    "result": null
  },
  "meta": {}, "errors": []
}
```

### 14.2 SSE (Phase 1.5/2)
`GET /events/stream`
Events examples:
- `extraction.completed`
- `mwo.completed`
- `po.exported`
Payload:
```json
{
  "event":"mwo.completed",
  "data": {"mwo_id":"uuid","document_id":"uuid"}
}
```

---

## 15) State machine guardrails (What can call what)

### 15.1 Revision actions
| Revision status | parse | patch verified | approve | create order item |
|---|---|---|---|---|
| uploaded | ✅ | ⚠️ (rare) | ❌ | ❌ |
| parsing | ❌ | ❌ | ❌ | ❌ |
| draft | ✅ (re-run) | ✅ | ✅ (if errors resolved) | ❌ |
| approved | ❌ (must new revision) | ❌ | ❌ | ✅ |
| failed | ✅ | ✅ | ❌ | ❌ |

### 15.2 PO gating
| po_type | fabric consumption_status allowed | trim consumption_status allowed |
|---|---|---|
| RFQ | unknown, pre_estimate, confirmed, locked | unknown, pre_estimate, confirmed, locked |
| Production | confirmed, locked | confirmed, locked |

---

## 16) Minimal OpenAPI hints (non-binding)
- Use tags: `auth`, `styles`, `revisions`, `documents`, `parsing`, `review`, `orders`, `consumption`, `marker`, `trim`, `po`, `mwo`, `batch`, `events`.
- All list endpoints support: `limit`, `cursor`, `search`, module-specific filters.

---
