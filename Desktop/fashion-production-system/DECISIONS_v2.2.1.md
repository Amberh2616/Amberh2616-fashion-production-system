# DECISIONS_v2.2.1
**Last Updated:** 2025-12-17  
**Purpose:** 把 v2.2.1 重要「設計決策」固定下來（避免之後版本越改越亂）。  
**Scope:** AI-Augmented PLM + ERP Lite（單人可管 300+ 款）

---

## D-001  BatchRun（批次作業）範圍（Phase 1）
**Decision**
- Phase 1 只做 3 個批次能力：
  1) Batch Parse（多款 Tech Pack 解析）  
  2) Batch Generate MWO（多個 SalesOrderItem 生成製造單）  
  3) Batch Generate PO Drafts（多個 SalesOrderItem 生成 PO 草稿）  

**Default params**
- `concurrency_limit = 5`
- `retry_limit = 2`

**Rationale**
- 這 3 個就能支撐「一季 300 款」最核心工作量，且不引入過多狀態/權限風險。

**Deferred**
- Batch Approve / Batch Email / Batch Issue PO 放 Phase 2（需要更完整審核與權限）。

---

## D-002  Parsing 任務容器（ExtractionRun）與問題（Issue）模型
**Decision**
- `ExtractionRun` = 一次完整解析任務的容器（可包含多策略、多次 AI call）
- 不獨立做 `ExtractionIssue`：**所有問題統一用 `DraftReviewItem`**

**Rationale**
- 避免 Issue 系統重複（ExtractionIssue vs DraftReviewItem）造成維護成本暴增。
- DraftReview 是你每天會用的「單一入口」：找缺欄位、低信心、衝突、建議修正。

---

## D-003  Sample（打樣流程）優先級
**Decision**
- Phase 1 不做完整 Sample 模型（Proto/Fit1/Fit2/PP）
- Phase 1 先用 `Document.doc_type` 暫存：`sample_photo`, `fit_comment`

**Rationale**
- MVP 優先把「解析 → 審核 → 生成 MWO/PO」打穿；Sample flow 是 Phase 2 的大工程。

---

## D-004  PO Line 指向 Order 層（OrderItemBOM），不是 Revision 層（BOMItem）
**Decision**
- `PurchaseOrderLine`（或 Draft line）必須指向 `OrderItemBOM`
- `OrderItemBOM` 再指回模板 `BOMItem` 做追溯

**Rationale**
- 同款不同訂單用量/證據/供應商可能不同，必須有「訂單級」的可變動與可追溯資料層。
- 支援 Marker 回填、樣衣實測回填、用量鎖定後再生成 Production PO。

---

## D-005  用量成熟度生命周期（Consumption Maturity Lifecycle）
**Decision**
- `unknown → pre_estimate → confirmed → locked`
- 用量在 `OrderItemBOM` 上以三段值儲存：
  - `pre_estimate_value`
  - `confirmed_value`
  - `locked_value`
- `locked` 由使用者**手動觸發**（PP 前鎖定）

**Rationale**
- 服裝用量無法一次到位：主料要等 marker，副料要等樣衣實測（或規則庫估算）。
- 三段值避免覆寫歷史，並利於追溯、比對與回滾。

---

## D-006  PO Draft 重算：Phase 1 採「手動觸發」
**Decision**
- Phase 1 不做自動 signals 重算。
- UI 提供按鈕：`Recalculate PO Drafts` → 後端 Celery 重新計算**draft** 狀態 PO。  
- `approved/issued` PO 不自動動（需手動 Regenerate + 記錄原因）。

**Rationale**
- 自動重算在資料未成熟、欄位缺漏時會造成混亂。
- 先求穩：你決定何時重算，避免誤下單。

---

## D-007  Storage：MinIO（開發）+ S3（正式）
**Decision**
- Development：MinIO（S3-compatible）
- Production：AWS S3（或等價的雲端 object storage）
- 檔案 key 建議：
  - `{org}/techpacks/{yyyy}/{mm}/{uuid}.pdf`
  - `{org}/markers/{yyyy}/{mm}/{uuid}.xlsx`
  - `{org}/mwo/{yyyy}/{mm}/{uuid}.pdf`
  - `{org}/po/{yyyy}/{mm}/{uuid}.pdf`

**Rationale**
- MinIO 開發成本低，S3 正式穩定、易擴充。
- key 有規律才能做稽核、清理、權限控管與追溯。

**Security**
- 對外下載採 **presigned URL**（避免公開 bucket）。
- 檔案去重：以 `file_hash`（techpack/marker 建議做）。

---

## D-008  PDF 生成：非同步 + Celery
**Decision**
- 生成 MWO/PO PDF 一律走 Celery 非同步：
  - API 立即回 `{"status": "generating"}`
  - 完成後寫入 `Document(doc_type=mwo_pdf/po_pdf)` 並通知前端（SSE/輪詢皆可）

**Rationale**
- PDF 生成可能 5–30 秒（含圖片、表格、字型），同步會拖慢 UX，且容易 timeout。

---

## D-009  PDF 渲染庫選擇
**Decision (MVP)**
- **WeasyPrint** 為主（HTML/CSS 模板 → PDF）

**Fallback**
- 若遇到極端精密排版需求：再用 ReportLab 針對少數模板補強。

**Not chosen for MVP**
- wkhtmltopdf：因為需要外部 binary、Docker/部署依賴多，長期維護成本較高。

---

## D-010  正規化 vs JSONField（哪些用表、哪些用 JSON）
**Decision**
- **正規化表（必查、必編輯、要索引）**
  - BOMItem, Measurement, ConstructionStep, OrderItemBOM, Orders, PO/MWO
- **JSONField（不穩定格式、版本化、審核快照、AI 證據）**
  - ai_extraction_raw / detected_changes / snapshot / parsed_data / change_plan

**Rationale**
- 正規化表：支援高效查詢、批次編輯、索引、權限。
- JSON：容納不同客戶 Tech Pack 格式差異與 AI pipeline metadata。

---

## D-011  draft vs verified（人機協作）
**Decision**
- 「AI 永遠是草稿」：revision 解析結果先進 draft（AI output），
- 使用者在 Review UI 修正後，才寫入 verified（source of truth）。

**Implementation**
- revision.status：`uploaded → parsing → draft → approved`
- 各資料表都有 `ai_confidence` + `is_verified`（模板層）
- 訂單層以 `OrderItemBOM.is_verified` + evidence docs 來控 Production gating。

---

## D-012  Multi-revision（Rev A/Rev B）
**Decision**
- `StyleRevision` 用鏈結 `previous_revision_id` 追版本
- 上線後只有 `approved_revision_id` 可以被 SalesOrderItem 使用
- 新 revision 解析後產生 diff（JSON），但不直接覆蓋舊資料

**Rationale**
- Tech Pack 改版很頻繁，必須可追溯「哪一版導致哪次下單/製造單」。

---

## D-013  Multi-tenant（可先單人，但從 schema 先鋪）
**Decision**
- 所有資料表都帶 `organization_id`（即使 MVP 單人也保留）

**Rationale**
- 成本低、未來要賣 SaaS 才不會整包重構。
- 索引一開始就以 `(organization_id, ...)` 作為前綴。

---

## D-014  通知機制（SSE vs polling）
**Decision**
- Phase 1：可先用輪詢（polling）查 task 狀態（最快落地）
- Phase 1.5/2：再上 SSE（更即時）

**Rationale**
- SSE 很好用，但不是 MVP blocking；先讓流程跑通。

---

## Appendix A：狀態機摘要
### Revision
- uploaded → parsing → draft → approved → superseded/failed

### OrderItemBOM consumption
- unknown → pre_estimate → confirmed → locked

### PO / MWO
- draft → generating → approved → issued → failed/cancelled

---

## Appendix B：環境配置摘要
- Dev：Docker compose（Postgres + Redis + MinIO）
- Prod：Postgres（managed）+ Redis（managed）+ S3 + Celery worker

---
