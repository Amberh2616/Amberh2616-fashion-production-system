# Fashion Production System - Technical Reference

**Last Updated:** 2025-12-27
**Version:** 2.2.1

> 📘 **Project Overview:** See `CLAUDE.md` for design principles, workflow, and current status.

---

## Technology Stack

### Confirmed Stack

```
Frontend:     Next.js 14 (TypeScript + App Router)
Backend:      Django 4.2 + Django REST Framework
Database:     PostgreSQL 15 (UUID PKs)
Cache:        Redis 7
File Storage: MinIO (dev) / AWS S3 (prod)
Task Queue:   Celery (Redis broker)
PDF Gen:      WeasyPrint (HTML template → PDF)
AI:           OpenAI GPT-4 Vision + GPT-4o Mini
```

### Why These Choices?

**Django:**
- 成熟的 ORM（複雜 BOM 關聯很適合）
- DRF 快速建 API
- Celery 整合完善（異步任務）
- Admin 後台（快速測試資料）

**Next.js:**
- App Router（模組化路由）
- SSR/ISR 支援（SEO 友好）
- 表格/PDF/批次操作 UI 庫豐富

**WeasyPrint:**
- HTML/CSS 模板 → PDF
- 可維護性最高（不用寫 ReportLab 程式碼）
- 支援中文字型、表格、分頁

**Celery:**
- Parse/PDF 生成不能阻塞 UI（5-30 秒）
- 批次操作需要進度追蹤
- 重試機制（API 失敗自動重試）

### Architecture

```
+-------------------------------------------+
|     Next.js Frontend (Port 3000)          |
|  - Draft Review Dashboard (CORE)          |
|  - Styles List + Upload                   |
|  - Orders + MWO/PO Center                 |
+-------------------+-----------------------+
                    | REST API (JSON)
+-------------------+-----------------------+
|     Django Backend (Port 8000)            |
|  +-- apps/core/       (User, Org)         |
|  +-- apps/styles/     (Style, Revision)   |
|  +-- apps/documents/  (Upload, Storage)   |
|  +-- apps/parsing/    (ExtractionRun)     |
|  +-- apps/orders/     (SalesOrder, Item)  |
|  +-- apps/consumption/(OrderItemBOM)      |
|  +-- apps/procurement/(PO, Supplier)      |
|  +-- apps/manufacturing/(MWO)             |
|  |                                        |
|  +-- services/ai/     (GPT-4 client)      |
|  +-- services/storage/(S3/MinIO)          |
+-------------------+-----------------------+
                    | Celery Tasks
+-------------------+-----------------------+
|     Background Workers                    |
|  - PDF Parsing (PyMuPDF)                  |
|  - AI Extraction (async, 3-5 min)         |
|  - PDF Generation (WeasyPrint)            |
|  - Marker Parsing                         |
+-------------------------------------------+
          |                   |
    PostgreSQL 15         Redis 7
```

---

## Project Structure

```
fashion-production-system/
├── backend/                     # Django Backend
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── celery.py
│   ├── apps/
│   │   ├── core/               # Organization, User, Auth
│   │   ├── styles/             # Style, StyleRevision
│   │   ├── documents/          # Document, upload/download
│   │   ├── parsing/            # ExtractionRun, DraftReviewItem
│   │   ├── orders/             # SalesOrder, SalesOrderItem
│   │   ├── consumption/        # OrderItemBOM, MarkerReport, TrimMeasurement
│   │   ├── procurement/        # PO, POLine, Supplier
│   │   └── manufacturing/      # MWO
│   ├── services/
│   │   ├── ai/                 # AI client, prompts, extractors
│   │   │   ├── client.py
│   │   │   ├── prompts/
│   │   │   └── extractors/
│   │   └── storage/            # S3/MinIO, presigned URLs
│   └── requirements/
│       ├── base.txt
│       ├── development.txt
│       └── production.txt
│
├── frontend/                    # Next.js Frontend
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── styles/
│   │   │   │   ├── page.tsx              # List
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx          # Detail
│   │   │   │       └── review/
│   │   │   │           └── page.tsx      # Draft Review ⭐
│   │   │   ├── orders/
│   │   │   ├── procurement/
│   │   │   └── manufacturing/
│   │   └── api/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui
│   │   ├── styles/
│   │   │   ├── PDFViewer.tsx
│   │   │   ├── BOMTable.tsx
│   │   │   ├── MeasurementTable.tsx
│   │   │   └── IssuesPanel.tsx
│   │   └── layout/
│   ├── lib/
│   │   ├── api/                # API client + React Query
│   │   ├── hooks/
│   │   └── utils/
│   └── store/                  # Zustand stores
│
├── docs/
│   ├── DATABASE-SCHEMA_v2.2.1_COMPLETE2.md     # ⭐ Main schema
│   ├── DATABASE-SCHEMA_v2.2.1_DJANGO_MODELS.md # Dev reference
│   ├── API-SPEC_v2.2.1_COMPLETE.md             # All endpoints
│   ├── AI-JSON-SCHEMA_v2.2.1_COMPLETE.md       # AI I/O formats
│   ├── TRIM-RULES-LIBRARY_v1.0.md              # 20 trim rules
│   ├── DECISIONS_v2.2.1.md                     # ADR
│   └── TASK-BREAKDOWN.md                       # 3 sprints
│
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
├── .archive/                   # Old versions
├── CLAUDE.md                   # Project overview
├── CLAUDE-TECHNICAL.md         # This file
└── README.md
```

---

## Development Roadmap (v2.2.1)

### Sprint 1 (Weeks 1-2): Foundation + Upload/Intake

**T1. Repo & Infra (1.5d)**
- Django + DRF, PostgreSQL, Redis, Celery, MinIO
- `docker-compose up` 跑起整套環境
- Health endpoint

**T2. Core Models + Migrations (2.5d)**
- Organization, Style, StyleRevision, Document
- Supplier, Material, Factory
- BOMItem, Measurement, ConstructionStep

**T3. Upload API (2d)**
- Presigned URL upload (S3/MinIO)
- File validation + hash dedup

**T4. Intake: Folder Grouping (2.5d)**
- 上傳多檔自動分組成 style/revision
- Filename heuristics（style number regex）

**T5. Minimal Frontend Shell (1.5d)**
- Next.js + shadcn/ui
- Layout: sidebar + topbar
- Pages: `/styles` list, `/styles/[id]` detail

---

### Sprint 2 (Weeks 3-4): Parsing + Draft Review + Approve

**T6. Parse Job Framework (2d)**
- Celery job + polling/SSE
- Progress tracking in DB

**T7. Extraction Strategy 1: PyMuPDF (3d)**
- BOM/spec/construction 表格抽取
- Evidence 儲存（page/bbox/text）

**T8. Draft Review Items Generation (1.5d)**
- 缺欄位、衝突、低信心 → DraftReviewItem

**T9. Revision Data Editor UI (3d)**
- BOM/Measurement/Construction 可編輯表格
- Inline editing + auto-save

**T10. Approve Revision Flow (1d)**
- State checks（severity=error 不能 approve）
- Status flip: draft → approved

---

### Sprint 3 (Weeks 5-6): Orders + MWO/PO + Batch

**T11. Sales Orders + Items (2d)**
- CRUD SalesOrder + SalesOrderItem
- 建立 item → 自動生成 OrderItemBOM

**T12. Generate MWO (3d)**
- Snapshot + PDF template
- WeasyPrint HTML → PDF
- Celery async

**T13. Generate PO Drafts (3d)**
- Group by supplier
- Gating rules（RFQ vs Production）
- UNASSIGNED bucket

**T14. Batch APIs + UI (3d)**
- `/batch/parse`, `/batch/generate-mwo`, `/batch/generate-po-drafts`
- UI 多選 + progress tracking

**T15. Review Queue UI (2d)**
- Issues 列表 + filters
- Open item → jump to table row

---

## Key Design Decisions (ADRs)

完整決策記錄在 `DECISIONS_v2.2.1.md`，這裡列重點：

### D-001: BatchRun 範圍（Phase 1）
- 只做 3 個批次：Parse, Generate MWO, Generate PO
- concurrency_limit = 5, retry_limit = 2

### D-004: PO Line 指向 Order 層
- `PurchaseOrderLine` 必須指向 `OrderItemBOM`（不是 BOMItem）
- 支援訂單級用量變動與追溯

### D-005: 用量成熟度生命週期
- `unknown → pre_estimate → confirmed → locked`
- 三段值儲存：pre_estimate_value / confirmed_value / locked_value
- `locked` 由使用者手動觸發

### D-006: PO Draft 重算
- Phase 1 採「手動觸發」（UI 按鈕）
- `approved/issued` PO 不自動動

### D-007: Storage
- MinIO (dev) + S3 (prod)
- Presigned URL（避免公開 bucket）

### D-009: PDF 渲染庫
- WeasyPrint 為主（HTML/CSS → PDF）
- 維護成本低、支援中文

### D-011: draft vs verified（人機協作）
- AI 永遠是草稿（draft）
- 使用者修正後才寫入 verified（source of truth）

### D-013: Multi-tenant
- 所有資料表都帶 `organization_id`（即使 MVP 單人也保留）

---

## API Quick Reference

完整 API 規格在 `API-SPEC_v2.2.1_COMPLETE.md`（617 行），這裡列常用：

### Auth
```
POST /api/v2/auth/login
GET  /api/v2/auth/me
```

### Styles & Revisions
```
POST   /api/v2/styles
GET    /api/v2/styles
GET    /api/v2/styles/{id}
POST   /api/v2/styles/{id}/revisions
POST   /api/v2/revisions/{id}/approve
```

### Upload
```
POST /api/v2/documents/upload-init        # Get presigned URL
POST /api/v2/documents/{id}/upload-complete
GET  /api/v2/documents/{id}/download      # Get presigned download
```

### Parsing
```
POST /api/v2/revisions/{id}/parse         # Trigger (async)
GET  /api/v2/extraction-runs/{id}         # Check status
GET  /api/v2/revisions/{id}/draft         # Get AI results
PATCH /api/v2/revisions/{id}/verified     # Write corrections
```

### Orders & Consumption
```
POST  /api/v2/sales-orders
POST  /api/v2/sales-orders/{id}/items
GET   /api/v2/sales-order-items/{id}/bom
PATCH /api/v2/order-item-bom/{id}
POST  /api/v2/order-item-bom/{id}/lock    # Lock consumption
```

### Marker & Trim
```
POST /api/v2/sales-order-items/{id}/marker-reports
POST /api/v2/marker-reports/{id}/parse
POST /api/v2/sales-order-items/{id}/trim-measurements
```

### PO & MWO
```
POST /api/v2/sales-order-items/{id}/po-drafts/generate
POST /api/v2/po-drafts/{id}/approve
POST /api/v2/po-drafts/{id}/export-pdf
POST /api/v2/sales-order-items/{id}/mwo/generate
```

### Batch
```
POST /api/v2/batch-runs
GET  /api/v2/batch-runs/{id}
POST /api/v2/batch-runs/{id}/cancel
```

---

## AI Task Schemas

完整 AI I/O 格式在 `AI-JSON-SCHEMA_v2.2.1_COMPLETE.md`（430 行），這裡列架構：

### Tech Pack Parsing
```json
{
  "task": "techpack_parse",
  "revision_id": "uuid",
  "targets": ["bom","measurement","construction"],
  "language": {"source":"en","target":"zh-TW"}
}
```

Output includes:
- `bom.items[]` (with evidence + field_confidence)
- `measurement.points[]`
- `construction.steps[]`
- `issues[]` (missing_field, conflict, low_confidence)

### Marker Report Parsing
```json
{
  "task": "marker_parse",
  "marker_report_id": "uuid",
  "parsed_data": {
    "consumption_per_size": {"XS":2.2,"S":2.3,"M":2.5},
    "weighted_avg": 2.38
  },
  "backfill": {
    "new_confirmed_value": 2.38,
    "consumption_status": "confirmed"
  }
}
```

### Trim Estimation (Rule-based)
```json
{
  "task": "trim_estimate",
  "rule": {
    "formula": "waist_opening + overlap",
    "params": {"overlap": 2.5}
  },
  "measurements": {"waist_opening": 66.0},
  "result": {"pre_estimate_value": 68.5}
}
```

---

## Trim Rules Library

在 `TRIM-RULES-LIBRARY_v1.0.md` 定義了 20 條常用規則：

### Categories
- **Elastic（鬆緊帶）**: 7 rules (waist, leg, armhole, strap, cuff, neckline, underbust)
- **Binding/Tape（包邊）**: 5 rules (neckline, armhole, hem, sleeve, pocket)
- **Drawcord（拉繩）**: 2 rules (waist, hood)
- **Strap（肩帶）**: 3 rules (bra strap, crossback, waist tie)
- **Zipper（拉鍊）**: 1 rule (center front)
- **Fixed Count（固定數量）**: 2 rules (care label, hang tag)

### Example Rule
```json
{
  "rule_id": "TRIM-001",
  "rule_name": "Waist Elastic (Standard Overlap)",
  "formula": "waist_opening + overlap",
  "formula_params": {"overlap": 2.5},
  "required_measurement_points": ["waist_opening"],
  "output_uom": "cm/pc",
  "confidence_level": 0.75
}
```

---

## Cost Estimates

### AI Costs (Monthly - 300 Styles)

| Item | Quantity | Unit Cost | Monthly |
|------|----------|-----------|---------|
| Tech Pack Parse | 300 | $1.00 | $300 |
| Marker Parse | 200 | $0.40 | $80 |
| Trim Estimate | 500 | $0.05 | $25 |
| MWO Generation | 150 | $0.10 | $15 |
| PO Generation | 200 | $0.20 | $40 |
| Retries/Errors | - | - | $40 |
| **AI Subtotal** | | | **$500** |

### Infrastructure (Monthly)

| Item | Cost |
|------|------|
| VPS (4CPU/8GB) | $40-60 |
| PostgreSQL (managed) | $25-35 |
| Redis (managed) | $15-20 |
| S3 Storage (100GB) | $10-15 |
| Domain + SSL | $5 |
| **Infra Subtotal** | **$95-135** |

### Total Monthly Cost

```
Total: $600-650/month

ROI:
- Time saved: 200+ hours/month
- Equivalent labor: $4000+/month
- Net savings: $3400-3500/month
- ROI: 550-650%
```

---

## Environment Variables

```env
# Django
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com
DATABASE_URL=postgres://user:pass@localhost:5432/fashion_plm
REDIS_URL=redis://localhost:6379/0

# AWS S3 (Production)
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_STORAGE_BUCKET_NAME=fashion-plm-files
AWS_S3_REGION_NAME=us-west-2

# MinIO (Development)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=fashion-plm-dev

# AI
OPENAI_API_KEY=sk-xxx
OPENAI_ORG_ID=org-xxx

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v2
```

---

## Commands Reference

### Development

```bash
# Backend (Django)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements/development.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver

# Frontend (Next.js)
cd frontend
npm install
npm run dev

# Celery Worker
cd backend
celery -A config worker -l info

# Docker (Full Stack)
docker-compose up -d
```

### Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

### Production

```bash
# Build frontend
cd frontend
npm run build

# Collect static (Django)
cd backend
python manage.py collectstatic

# Run with Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

---

## Core Entities Reference

```
Style（款）
  └─ StyleRevision（Rev A/Rev B）
      ├─ BOMItem（模板 BOM）
      ├─ Measurement（尺寸表）
      └─ ConstructionStep（工序）

SalesOrder（訂單）
  └─ SalesOrderItem（款色尺量）
      └─ OrderItemBOM（訂單級 BOM）⭐
          ├─ pre_estimate_value
          ├─ confirmed_value
          ├─ locked_value
          ├─ consumption_status (unknown/pre_estimate/confirmed/locked)
          ├─ consumption_source (manual/rule_based/marker_report/sample_measurement)
          ├─ marker_document (FK to MarkerReport)
          └─ sample_measurement_record (FK to SampleTrimMeasurement)

PurchaseOrderDraft / PurchaseOrder
  └─ POLine
      └─ Points to OrderItemBOM (not BOMItem!)
```

---

## Quick Start Guide

### First Time Setup

1. **Clone & Install**
```bash
git clone <repo>
cd fashion-production-system
```

2. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements/development.txt
```

3. **Environment Configuration**
```bash
# Copy .env.example to .env
cp .env.example .env
# Edit .env with your settings
```

4. **Database Migration**
```bash
python manage.py migrate
python manage.py createsuperuser
```

5. **Frontend Setup**
```bash
cd ../frontend
npm install
cp .env.example .env.local
# Edit .env.local
```

6. **Run Development Servers**
```bash
# Terminal 1: Backend
cd backend
python manage.py runserver

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Celery Worker (if needed)
cd backend
celery -A config worker -l info
```

7. **Access**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api/v2
- Django Admin: http://localhost:8000/admin

---

## Troubleshooting

### Common Issues

1. **Port Already in Use**
```bash
# Kill process on port 3000 (Frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 8000 (Backend)
lsof -ti:8000 | xargs kill -9
```

2. **CORS Errors**
- Check `CORS_ALLOWED_ORIGINS` in `backend/config/settings/development.py`
- Should include `http://localhost:3000`

3. **Database Connection Failed**
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`

4. **Celery Not Running**
- Check Redis is running: `redis-cli ping`
- Verify `CELERY_BROKER_URL` in `.env`

5. **Frontend Build Errors**
- Clear cache: `rm -rf .next`
- Reinstall: `rm -rf node_modules && npm install`

---

## Related Documentation

- **Project Overview**: `CLAUDE.md`
- **Database Schema**: `docs/DATABASE-SCHEMA_v2.2.1_COMPLETE2.md`
- **API Specification**: `docs/API-SPEC_v2.2.1_COMPLETE.md`
- **AI Schemas**: `docs/AI-JSON-SCHEMA_v2.2.1_COMPLETE.md`
- **Design Decisions**: `docs/DECISIONS_v2.2.1.md`
- **Task Breakdown**: `docs/TASK-BREAKDOWN.md`
