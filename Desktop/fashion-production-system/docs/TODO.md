# TODO Development Checklist

**Last Updated:** 2024-12-14
**Project:** Fashion Production System (Django + Next.js)
**Version:** 2.0 (Revised)

---

## Overview

This is a prioritized task list based on the revised architecture analysis. Tasks are organized by phases with realistic time estimates.

---

## Phase 1: MVP Foundation (3 Weeks)

### Week 1: Project Setup

#### Day 1-2: Infrastructure Setup
- [ ] **Django Project**
  - [ ] Create Django project with `django-admin startproject config .`
  - [ ] Configure settings split (base/dev/prod)
  - [ ] Install Django REST Framework
  - [ ] Configure CORS for Next.js
  - [ ] Setup JWT authentication (`djangorestframework-simplejwt`)
  - [ ] Create `.env` file with environment variables

- [ ] **Next.js Project**
  - [ ] Initialize Next.js 14 with TypeScript
  - [ ] Install and configure shadcn/ui
  - [ ] Setup Tailwind CSS
  - [ ] Configure TanStack Query
  - [ ] Setup Zustand store
  - [ ] Create basic layout components

- [ ] **Docker Environment**
  - [ ] Create `docker-compose.yml`
  - [ ] Configure PostgreSQL container
  - [ ] Configure Redis container
  - [ ] Configure MinIO container (S3 compatible)
  - [ ] Test docker-compose up

#### Day 3-4: Core Models + API
- [ ] **Django Models**
  - [ ] Create `core` app
    - [ ] `Organization` model
    - [ ] Custom `User` model with roles
  - [ ] Create `techpack` app
    - [ ] `TechPack` model
    - [ ] `TechPackVersion` model
    - [ ] `BOMItem` model
    - [ ] `Measurement` model
    - [ ] `AIExtractionLog` model
  - [ ] Run migrations
  - [ ] Create admin registrations

- [ ] **DRF API**
  - [ ] Configure DRF settings
  - [ ] Create serializers for all models
  - [ ] Create TechPackViewSet (CRUD)
  - [ ] Setup URL routing
  - [ ] Add pagination
  - [ ] Add filtering (django-filter)
  - [ ] Test with Postman/curl

#### Day 5: Basic AI Integration
- [ ] **AI Service (within Django)**
  - [ ] Create `services/ai/` directory
  - [ ] Setup OpenAI client wrapper
  - [ ] Create basic prompt for BOM extraction
  - [ ] Create Celery task for async parsing
  - [ ] Add `/api/techpacks/{id}/parse/` endpoint
  - [ ] Test with sample Tech Pack PDF

---

### Week 2: Draft Review Dashboard

#### Day 1-2: PDF Viewer Component
- [ ] **Frontend Setup**
  - [ ] Install react-pdf
  - [ ] Create `PDFViewer` component
  - [ ] Implement page navigation
  - [ ] Implement zoom controls
  - [ ] Add loading states
  - [ ] Handle errors gracefully

#### Day 3-4: AI Results Display
- [ ] **Results Panel**
  - [ ] Create `AIResultsPanel` component
  - [ ] Implement tab navigation
  - [ ] Create `BOMTable` component (read-only first)
  - [ ] Create `MeasurementTable` component
  - [ ] Create `IssuesPanel` component
  - [ ] Connect to backend API

#### Day 5: Edit + Save Functionality
- [ ] **Edit Mode**
  - [ ] Add inline editing to BOMTable
  - [ ] Add inline editing to MeasurementTable
  - [ ] Implement auto-save (30 second interval)
  - [ ] Add "unsaved changes" warning
  - [ ] Implement `/approve/` endpoint call
  - [ ] Add success/error notifications

---

### Week 3: Polish + Deploy

#### Day 1-2: Error Handling & UX
- [ ] **Frontend Polish**
  - [ ] Add loading spinners for all async operations
  - [ ] Add empty states for lists
  - [ ] Add error boundary components
  - [ ] Implement toast notifications
  - [ ] Add form validation
  - [ ] Mobile-responsive tweaks

- [ ] **Backend Polish**
  - [ ] Add proper error responses
  - [ ] Add request logging
  - [ ] Add rate limiting
  - [ ] Add API documentation (drf-spectacular)

#### Day 3-4: Testing
- [ ] **Backend Tests**
  - [ ] Install pytest-django
  - [ ] Create test fixtures
  - [ ] Test TechPack CRUD
  - [ ] Test file upload
  - [ ] Test approve flow
  - [ ] Target: 70%+ coverage for critical paths

- [ ] **Frontend Tests**
  - [ ] Setup Vitest
  - [ ] Test key components
  - [ ] Test API hooks
  - [ ] Manual QA checklist

#### Day 5: Initial Deployment
- [ ] **Deployment**
  - [ ] Configure production settings
  - [ ] Setup environment variables
  - [ ] Deploy Django (Gunicorn + Nginx)
  - [ ] Deploy Next.js (standalone or Vercel)
  - [ ] Configure domain + SSL
  - [ ] Smoke test all features

---

## Phase 2: Enhanced AI (2 Weeks)

### Week 4-5: AI Refinement

- [ ] **Prompt Engineering**
  - [ ] Create versioned prompt templates
  - [ ] Add few-shot examples
  - [ ] Implement prompt testing framework
  - [ ] A/B test different approaches

- [ ] **BOM Extraction Improvements**
  - [ ] Handle multiple table formats
  - [ ] Improve supplier detection
  - [ ] Add material code recognition
  - [ ] Validate against known materials

- [ ] **Measurement Parsing**
  - [ ] Implement size progression validation
  - [ ] Add tolerance handling
  - [ ] Flag unreasonable values
  - [ ] Cross-reference with historical data

- [ ] **Construction Notes**
  - [ ] Extract process steps
  - [ ] Identify special instructions
  - [ ] Link to BOM items

- [ ] **AI Learning System**
  - [ ] Track corrections in AIExtractionLog
  - [ ] Build correction analysis dashboard
  - [ ] Identify common error patterns
  - [ ] Update prompts based on learnings

---

## Phase 3: Manufacturing Sheet (2 Weeks)

### Week 6-7: Document Generation

- [ ] **Manufacturing Sheet Template**
  - [ ] Design PDF template (WeasyPrint/ReportLab)
  - [ ] Define required sections
  - [ ] Create data mapping from TechPack
  - [ ] Implement PDF generation API

- [ ] **Email Draft System**
  - [ ] Create email templates
  - [ ] Implement draft generation
  - [ ] Add approval workflow for emails
  - [ ] (Hold: Actual email sending for Phase 4)

- [ ] **UI for Manufacturing**
  - [ ] Preview manufacturing sheet
  - [ ] Edit before finalize
  - [ ] Download PDF button
  - [ ] History of generated sheets

---

## Phase 4: Procurement (2 Weeks)

### Week 8-9: PO Management

- [ ] **Models**
  - [ ] Create `procurement` app
  - [ ] `Supplier` model
  - [ ] `PurchaseOrder` model
  - [ ] `POItem` model

- [ ] **PO Generation**
  - [ ] Calculate quantities from BOM
  - [ ] Apply wastage rates
  - [ ] Group by supplier
  - [ ] Generate PO drafts

- [ ] **Supplier Management**
  - [ ] CRUD for suppliers
  - [ ] Contact info
  - [ ] Historical pricing
  - [ ] Lead time tracking

- [ ] **Email Automation**
  - [ ] Connect email sending
  - [ ] Track email status
  - [ ] Handle replies (basic)

---

## Phase 5: Sample Management (2 Weeks)

### Week 10-11: PLM Flow

- [ ] **Models**
  - [ ] Create `sampling` app
  - [ ] `Sample` model (Proto/Fit/PP)
  - [ ] `FitComment` model
  - [ ] `SamplePhoto` model

- [ ] **Sample Tracking UI**
  - [ ] Kanban board view
  - [ ] Status transitions
  - [ ] Photo upload
  - [ ] Comment entry

- [ ] **AI Features**
  - [ ] Fit comment summarization
  - [ ] Measurement comparison
  - [ ] Revision diff analysis

---

## Future Enhancements (Backlog)

### Not For MVP
- [ ] Multi-tenant with RLS
- [ ] Advanced user permissions
- [ ] Real-time collaboration
- [ ] Mobile app
- [ ] Integration with external ERP
- [ ] 3D garment preview
- [ ] Barcode/QR tracking
- [ ] Automated testing schedules

---

## Technical Debt Tracking

### Must Fix Before Production
- [ ] Add proper database indexes
- [ ] Implement request logging
- [ ] Setup error monitoring (Sentry)
- [ ] Add API rate limiting
- [ ] Configure proper backup strategy

### Nice To Have
- [ ] Optimize database queries (select_related/prefetch)
- [ ] Add caching layer
- [ ] Implement file cleanup for orphans
- [ ] Add comprehensive API documentation

---

## Documentation Tasks

- [x] CLAUDE.md - Project memory (v2.0)
- [x] README.md - Project overview
- [x] AI-AGENT-DESIGN.md - AI design
- [x] SYSTEM-UI-DESIGN.md - UI design
- [x] TODO.md - This file (v2.0)
- [ ] DATABASE-SCHEMA.md - ER diagram
- [ ] API-SPEC.md - OpenAPI spec
- [ ] DEPLOYMENT.md - Deploy guide
- [ ] PROMPTS.md - AI prompt documentation

---

## Known Risks & Issues

### High Priority
1. **Tech Pack Format Variability**
   - Status: Not started
   - Mitigation: Multi-strategy parser

2. **AI API Cost Control**
   - Status: Not started
   - Mitigation: Rate limiter + budget tracker

### Medium Priority
3. **PDF Processing Performance**
   - Status: Not started
   - Mitigation: Async with Celery

4. **Data Loss During Edit**
   - Status: Not started
   - Mitigation: Auto-save + local storage

---

## Progress Tracking

### Phase 1: MVP Foundation
```
[                    ] 0% complete
Week 1: Setup        [          ] 0%
Week 2: Dashboard    [          ] 0%
Week 3: Polish       [          ] 0%
```

### Phase 2: Enhanced AI
```
[                    ] 0% complete
```

### Phase 3: Manufacturing
```
[                    ] 0% complete
```

### Phase 4: Procurement
```
[                    ] 0% complete
```

### Phase 5: Sampling
```
[                    ] 0% complete
```

---

## Notes

### Decisions Made
1. **Keep AI in Django for MVP** - No separate FastAPI service initially
2. **Use cloud OCR** - Google Vision or Azure instead of PaddleOCR
3. **Skip pgVector for MVP** - Simple full-text search is sufficient
4. **RESTful API over GraphQL** - Simpler, better tooling with DRF

### Questions to Resolve
1. Exact prompt structure for BOM extraction
2. Manufacturing sheet template layout
3. Email signature and branding

---

**Last Updated:** 2024-12-14
**Next Review:** After completing Phase 1 Week 1
