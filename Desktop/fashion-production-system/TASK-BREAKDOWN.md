# TASK-BREAKDOWN — v2.2 MVP (2-week Sprints)
**Assumption:** 1–2 developers, 6 weeks (3 sprints) to reach usable MVP for 300 styles batch + MWO/PO drafts.

---

## Sprint 1 (Weeks 1–2): Foundation + Data Model + Upload/Intake
### T1. Repo & Infra
- Setup Django + DRF, PostgreSQL, Redis, Celery, MinIO/S3 config
- AC:
  - docker-compose up brings up API+DB+Redis+MinIO
  - health endpoint `/api/v2/health` returns OK
- Est: 1.5d
- Depends: none

### T2. Core Models + Migrations (v2.2)
- Implement models: Organization, Style, StyleRevision, Document, Supplier, Material, Factory
- Implement BOMItem, Measurement, ConstructionStep
- AC:
  - migrations apply cleanly
  - admin can CRUD core entities
- Est: 2.5d
- Depends: T1

### T3. Upload API (single + multi)
- Endpoint: POST `/revisions/{revId}/documents` (multipart)
- Basic file validation + store to MinIO/S3
- AC:
  - upload returns Document id
  - download via presigned URL works
- Est: 2d
- Depends: T1, T2

### T4. Intake: folder grouping to Style/Revision
- Backend service: group files by heuristics (filename keywords + style no regex)
- Endpoint: POST `/uploads/folder` (multipart multiple)
- AC:
  - uploading 10 files creates correct style + revision associations
  - duplicate file_hash detected and skipped
- Est: 2.5d
- Depends: T2, T3

### T5. Minimal frontend shell
- Next.js layout: sidebar + topbar
- Pages: `/styles` list placeholder, `/styles/[id]` placeholder
- AC:
  - can view style list from API (mock)
- Est: 1.5d
- Depends: none (parallel)

---

## Sprint 2 (Weeks 3–4): Parsing Pipeline + Draft Review + Approve
### T6. Parse job framework (Celery)
- Job model + `/jobs/{id}` polling + optional SSE stub
- AC:
  - start parse returns job_id
  - progress updates in DB
- Est: 2d
- Depends: T1

### T7. Extraction (Strategy 1): PyMuPDF text/tables
- Extract BOM/spec/construction candidates into normalized tables
- Log to AIExtractionLog even if using deterministic extractor
- AC:
  - for known digital PDFs, BOM items appear in DB
  - evidence stored (page/bbox/text)
- Est: 3d
- Depends: T2, T3, T6

### T8. Draft Review Items generation
- Generate DraftReviewItem for missing supplier, low confidence, conflicts
- AC:
  - open issues appear in `/review-items`
- Est: 1.5d
- Depends: T7

### T9. Revision data editor (UI)
- Style Workspace tabs: BOM / Measurement / Construction editable tables
- Endpoint: GET/PATCH `/revisions/{id}/data`
- AC:
  - edits persist; audit log entry created
- Est: 3d
- Depends: T7

### T10. Approve Revision flow
- Endpoint: POST `/revisions/{id}/approve` with state checks
- AC:
  - cannot approve with severity=error issues open
  - approve flips status to approved
- Est: 1d
- Depends: T8, T9

---

## Sprint 3 (Weeks 5–6): Orders + MWO/PO Drafts + Batch Ops
### T11. Sales Orders + Items
- CRUD for SalesOrder + SalesOrderItem
- AC:
  - order item requires approved_revision
- Est: 2d
- Depends: T2, T10

### T12. Generate MWO (snapshot + PDF)
- Endpoint: POST `/sales-order-items/{id}/generate-mwo`
- PDF template v1 (reportlab or docx->pdf)
- AC:
  - generates PDF and saves Document
  - snapshot stored; later revision changes do not affect existing MWO
- Est: 3d
- Depends: T11

### T13. Generate PO Drafts (group by supplier)
- Endpoint: POST `/sales-order-items/{id}/generate-po-drafts`
- Creates UNASSIGNED PO if supplier missing
- AC:
  - PO drafts created correctly; recompute works
- Est: 3d
- Depends: T11, T12 (optional)

### T14. Batch APIs + UI
- Endpoints: `/batch/parse`, `/batch/generate-mwo`, `/batch/generate-po-drafts`, `/batch/{id}`
- UI multi-select in `/styles`
- AC:
  - selecting 20 styles runs batch parse; shows per-item results
- Est: 3d
- Depends: T6, T7, T12, T13

### T15. Review Queue UI
- Page `/review-queue` with filters; open item → jump to relevant table row
- AC:
  - can resolve issues; counts update
- Est: 2d
- Depends: T8, T9

---

## Notes on Estimates
- Add 20% buffer for real-world PDF variability.
- OCR + annotated translation is Phase 1.5 / Phase 2 (after MVP usable).
