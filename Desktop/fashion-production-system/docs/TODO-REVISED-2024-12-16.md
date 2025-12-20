# TODO Development Checklist - REVISED

**Last Updated:** 2024-12-16
**Project:** Fashion Production System (Django + Next.js)
**Version:** 3.0 (Complete Flow with Translation + Purchase Order)

---

## Overview

This is the **REVISED** development roadmap based on finalized requirements:

### Complete Automation Flow
```
Upload Tech Pack (EN)
→ Translate to Chinese
→ Extract BOM/Spec
→ Generate Manufacturing Sheet
→ Generate Purchase Orders
```

---

## Phase 1: MVP Core Features (4 Weeks)

### 🎯 P0 Features (Must Have for MVP)

| Feature | Status | Dev Time |
|---------|--------|----------|
| 1. Tech Pack Translation | 🔴 Not started | 5-7 days |
| 2. BOM/Spec Extraction | 🟡 50% done | 3-5 days |
| 3. Manufacturing Sheet Gen | 🔴 Not started | 3-5 days |
| 4. Purchase Order Gen | 🔴 Not started | 3-5 days |

---

### Week 1: Infrastructure + Translation (7 days)

#### Day 1-2: Project Setup
- [x] **Django Project** (ALREADY DONE)
  - [x] Basic structure created
  - [x] Django REST Framework configured
  - [x] Auth system setup
  - [x] Tech Pack models created

- [x] **Next.js Project** (ALREADY DONE)
  - [x] Next.js 14 initialized
  - [x] shadcn/ui installed
  - [x] Basic layout created
  - [x] API client setup

- [x] **Docker Environment** (ALREADY DONE)
  - [x] docker-compose.yml created
  - [x] PostgreSQL running
  - [x] Redis running

#### Day 3-5: Tech Pack Translation Feature ⭐ NEW

- [ ] **Backend: Translation Service**
  - [ ] Install dependencies
    ```bash
    pip install PyMuPDF reportlab googletrans==4.0.0-rc1
    ```
  - [ ] Create `backend/services/ai/translator.py`
    - [ ] `TechPackTranslator` class
    - [ ] `extract_text_with_positions()` - Extract text from PDF
    - [ ] `translate_text_blocks()` - GPT-4 translation
    - [ ] `generate_chinese_pdf()` - PDF generation

  - [ ] Build Fashion Terminology Database
    - [ ] Create `backend/data/fashion_terms.json`
    - [ ] Add common terms:
      ```json
      {
        "Cami Tank": "吊帶背心",
        "Shelf Bra": "架式胸罩",
        "Power Mesh": "強力網布",
        "Coverstitch": "雙面車",
        "Bartack": "打棗"
      }
      ```

  - [ ] Create API endpoint
    - [ ] Add `POST /api/techpacks/{id}/translate/` to `techpack/views.py`
    - [ ] Celery task: `translate_techpack_async.delay()`
    - [ ] Return translated PDF URL

- [ ] **Frontend: Translation UI**
  - [ ] Add "Translate to Chinese" button in Tech Pack detail page
  - [ ] Show translation progress (Loading state)
  - [ ] Display translated PDF preview
  - [ ] Add download button for Chinese PDF

- [ ] **Testing**
  - [ ] Test with LW1FLPS_TechPack.pdf
  - [ ] Verify layout preservation
  - [ ] Verify terminology accuracy
  - [ ] Test PDF download

**Deliverable:** Chinese Tech Pack PDF generation working end-to-end

---

### Week 2: BOM/Spec Extraction Enhancement (7 days)

#### Day 1-3: BOM Extraction (ENHANCE EXISTING)

- [ ] **Backend: BOM Extractor**
  - [ ] Update `backend/services/ai/extractor.py`
  - [ ] Improve table detection (handle multiple formats)
  - [ ] Add column mapping AI:
    ```python
    def map_bom_columns(headers: List[str]) -> Dict:
        # AI detects: "Item" → item_name, "Qty" → quantity
    ```
  - [ ] Add supplier name normalization
  - [ ] Add unit standardization (yard/meter/kg)

- [ ] **Data Validation**
  - [ ] Check for missing required fields
  - [ ] Validate numeric values
  - [ ] Flag low confidence items (<70%)

#### Day 4-6: Spec Extraction (ENHANCE EXISTING)

- [ ] **Backend: Spec Extractor**
  - [ ] Update measurement extraction prompts
  - [ ] Add size progression validation:
    ```python
    def validate_size_progression(measurements):
        # XS < S < M < L < XL
        # Adjacent sizes differ by 2-4cm
    ```
  - [ ] Add reasonable value checks:
    ```python
    CHEST_WIDTH_RANGE = (35, 60)  # cm
    LENGTH_RANGE = (50, 90)       # cm
    ```

- [ ] **Confidence Scoring**
  - [ ] Assign confidence to each measurement
  - [ ] Flag anomalies for review

#### Day 7: Construction Extraction

- [ ] **Backend: Construction Extractor**
  - [ ] Extract stitch types (301, 406, 514...)
  - [ ] Extract sewing instructions
  - [ ] Map to Chinese terminology

**Deliverable:** Accurate BOM/Spec/Construction extraction with 85%+ confidence

---

### Week 3: Manufacturing Sheet Generation (7 days)

#### Day 1-3: Manufacturing Sheet Template

- [ ] **Backend: Document Generator**
  - [ ] Install dependencies
    ```bash
    pip install WeasyPrint Jinja2
    ```
  - [ ] Create `backend/services/documents/manufacturing_sheet.py`
  - [ ] Create HTML template: `templates/manufacturing_sheet.html`
    ```html
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* Chinese-friendly fonts */
        body { font-family: "Microsoft YaHei", sans-serif; }
      </style>
    </head>
    <body>
      <h1>製造工作單</h1>
      <section>
        <h2>款式資訊</h2>
        <p>款號: {{ style_number }}</p>
        <p>訂單數量: {{ order_quantity }} 件</p>
      </section>
      <section>
        <h2>物料清單 (BOM)</h2>
        <table>
          {% for item in bom_items %}
          <tr>
            <td>{{ item.name }}</td>
            <td>{{ item.quantity }}</td>
          </tr>
          {% endfor %}
        </table>
      </section>
      <!-- Spec, Construction sections -->
    </body>
    </html>
    ```

- [ ] **Data Collection**
  - [ ] Pull approved BOM data
  - [ ] Pull approved Spec data
  - [ ] Pull Construction steps
  - [ ] Pull Order details

#### Day 4-5: PDF Generation

- [ ] **Backend: PDF Engine**
  - [ ] Implement `generate_manufacturing_sheet()`
    ```python
    def generate_manufacturing_sheet(techpack_id, order_id):
        # Render HTML template
        # Convert to PDF
        # Save to S3/MinIO
        # Return PDF URL
    ```
  - [ ] Add API endpoint: `POST /api/orders/{id}/generate_mwo/`

- [ ] **Frontend: Generation UI**
  - [ ] Add "Generate Manufacturing Sheet" button
  - [ ] Show generation progress
  - [ ] Display PDF preview
  - [ ] Add download button

#### Day 6-7: Testing & Refinement

- [ ] Test with real Tech Pack data
- [ ] Verify Chinese formatting
- [ ] Test PDF print quality
- [ ] Handle edge cases (missing data)

**Deliverable:** Auto-generated Chinese Manufacturing Sheet PDF

---

### Week 4: Purchase Order Generation (7 days)

#### Day 1-3: PO Data Processing

- [ ] **Backend: PO Calculator**
  - [ ] Create `backend/services/documents/purchase_order.py`
  - [ ] Implement quantity calculation:
    ```python
    def calculate_po_quantities(bom_items, order_qty, wastage_rate=0.05):
        results = []
        for item in bom_items:
            total = order_qty * item.consumption
            with_wastage = total * (1 + wastage_rate)
            results.append({
                'item': item.name,
                'total_qty': with_wastage,
                'unit': item.unit
            })
        return results
    ```

  - [ ] Group BOM by supplier:
    ```python
    def group_by_supplier(bom_items):
        suppliers = {}
        for item in bom_items:
            supplier = item.supplier
            if supplier not in suppliers:
                suppliers[supplier] = []
            suppliers[supplier].append(item)
        return suppliers
    ```

- [ ] **Database Models**
  - [ ] Create `procurement` app
  - [ ] `Supplier` model
    ```python
    class Supplier(models.Model):
        name = CharField(max_length=200)
        contact_person = CharField(max_length=100)
        email = EmailField()
        lead_time_days = IntegerField(default=30)
    ```
  - [ ] `PurchaseOrder` model
    ```python
    class PurchaseOrder(models.Model):
        po_number = CharField(max_length=50, unique=True)
        supplier = ForeignKey(Supplier)
        tech_pack = ForeignKey(TechPack)
        order = ForeignKey(Order)
        total_amount = DecimalField()
        delivery_date = DateField()
        status = CharField(choices=PO_STATUS)
    ```
  - [ ] `POItem` model

#### Day 4-5: PO PDF Template

- [ ] **Backend: PO Template**
  - [ ] Create HTML template: `templates/purchase_order.html`
    ```html
    <h1>採購訂單 {{ po_number }}</h1>
    <section>
      <h2>供應商資訊</h2>
      <p>名稱: {{ supplier.name }}</p>
      <p>聯絡人: {{ supplier.contact }}</p>
    </section>
    <section>
      <h2>採購明細</h2>
      <table>
        <tr>
          <th>品名</th>
          <th>數量</th>
          <th>單價</th>
          <th>金額</th>
        </tr>
        {% for item in po_items %}
        <tr>
          <td>{{ item.name }}</td>
          <td>{{ item.quantity }}</td>
          <td>${{ item.unit_price }}</td>
          <td>${{ item.total }}</td>
        </tr>
        {% endfor %}
      </table>
      <p>總計: ${{ total_amount }}</p>
    </section>
    ```

  - [ ] Implement `generate_purchase_order()`

- [ ] **API Endpoints**
  - [ ] `POST /api/orders/{id}/generate_pos/` - Generate all POs
  - [ ] `GET /api/purchase-orders/` - List POs
  - [ ] `GET /api/purchase-orders/{id}/pdf/` - Download PDF

#### Day 6-7: Frontend Integration

- [ ] **Frontend: PO Management UI**
  - [ ] Add "Generate Purchase Orders" button
  - [ ] Show PO list grouped by supplier
  - [ ] Display PO preview
  - [ ] Add batch download (zip all POs)

- [ ] **Testing**
  - [ ] Test quantity calculation
  - [ ] Test multi-supplier scenario
  - [ ] Test PDF generation
  - [ ] Verify Chinese formatting

**Deliverable:** Auto-generated Purchase Orders (multiple PDFs per order)

---

## Phase 1 Summary

### What We'll Have After 4 Weeks

✅ **Complete End-to-End Flow:**
```
1. Upload English Tech Pack PDF
2. Click "Translate" → Get Chinese PDF (2-3 min)
3. AI extracts BOM/Spec/Construction (3-5 min)
4. Review & Approve AI results (5-10 min)
5. Click "Generate Manufacturing Sheet" → Get PDF (1 min)
6. Click "Generate Purchase Orders" → Get 2-3 PDFs (2 min)

TOTAL TIME: 15-20 minutes
Traditional time: 4-6 hours
TIME SAVED: 85-90% ⭐⭐⭐⭐⭐
```

### Testing Checklist

- [ ] End-to-end test with LW1FLPS Tech Pack
- [ ] Verify all PDFs are generated correctly
- [ ] Verify Chinese translation quality
- [ ] Verify BOM extraction accuracy (85%+)
- [ ] Verify Spec extraction accuracy (90%+)
- [ ] Verify quantity calculations
- [ ] Test error handling (missing data, network errors)

---

## Phase 2: Enhancement & Optimization (2 Weeks)

### Week 5: AI Improvement

- [ ] Prompt engineering refinement
- [ ] Add few-shot examples
- [ ] Build correction learning system
- [ ] Improve confidence scoring

### Week 6: UI/UX Polish

- [ ] Table inline editing
- [ ] Drag-and-drop file upload
- [ ] Real-time collaboration (optional)
- [ ] Mobile responsiveness

---

## Phase 3: Advanced Features (Phase 2)

### Sample Management
- [ ] Sample tracking Kanban
- [ ] Fit comment AI summary
- [ ] Photo upload & comparison

### Email Integration
- [ ] Auto-read emails
- [ ] Extract Tech Pack attachments
- [ ] Email notification system

### Supplier Portal (Optional)
- [ ] Supplier login
- [ ] PO acknowledgement
- [ ] Shipment tracking

---

## Development Environment Setup

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements/development.txt

# Install new dependencies
pip install PyMuPDF reportlab WeasyPrint Jinja2

python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Celery Worker
```bash
cd backend
celery -A config worker -l info
```

---

## Testing Strategy

### Unit Tests
- [ ] Test BOM extraction with 10 sample Tech Packs
- [ ] Test Spec extraction with different formats
- [ ] Test quantity calculation edge cases
- [ ] Test PDF generation

### Integration Tests
- [ ] Test full workflow end-to-end
- [ ] Test error handling
- [ ] Test concurrent processing

### User Acceptance Testing
- [ ] Test with real merchandiser
- [ ] Collect feedback
- [ ] Iterate based on feedback

---

## Cost Estimates (MVP)

### AI Costs (Per Tech Pack)
| Operation | Cost |
|-----------|------|
| Translation | $0.50 |
| BOM/Spec Extraction | $1.00 |
| Document Generation | $0.30 |
| **Total per Tech Pack** | **$1.80** |

### Monthly Costs (300 Tech Packs/month)
| Item | Cost |
|------|------|
| AI Processing | $540 |
| Infrastructure (VPS, DB, Storage) | $100 |
| **Total** | **$640/month** |

### ROI
```
Cost: $640/month
Time saved: 100+ hours/month
Value of time: $2000-3000/month
Net savings: $1360-2360/month
ROI: 200-300%
```

---

## Success Metrics

### KPIs to Track
- [ ] Time to process one Tech Pack (target: <20 min)
- [ ] AI extraction accuracy (target: >85%)
- [ ] User approval rate (target: >90%)
- [ ] Error rate (target: <5%)
- [ ] Cost per Tech Pack (target: <$2)

### Monitoring
- [ ] Setup Sentry for error tracking
- [ ] Setup Mixpanel for user analytics
- [ ] Track AI API costs daily

---

## Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| AI extraction accuracy low | High | Multi-strategy parser, human review |
| PDF generation fails | Medium | Error handling, retry logic |
| Translation quality poor | Medium | Terminology database, post-editing |
| Cost overrun | Medium | Budget limits, usage monitoring |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| User adoption low | High | User training, clear documentation |
| Data security breach | High | Encryption, access control |
| Vendor lock-in (OpenAI) | Medium | Design for multi-provider support |

---

## Next Steps

### Immediate Actions (This Week)
1. ✅ Update CLAUDE.md with complete flow
2. ✅ Update this TODO with revised plan
3. 🔴 Start Week 1 Day 3: Translation feature
4. 🔴 Test translation with LW1FLPS sample

### Decision Points
- [ ] Decide on PDF library: WeasyPrint vs ReportLab
- [ ] Decide on translation strategy: GPT-4 vs GPT-4o Mini
- [ ] Decide on file storage: AWS S3 vs MinIO

---

**Last Updated:** 2024-12-16
**Next Review:** After Week 1 completion
**Status:** Ready to start development 🚀
