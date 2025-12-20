# Fashion Production System - Database Schema v2.2.1 COMPLETE

**Version:** 2.2.1 COMPLETE
**Last Updated:** 2024-12-17
**Status:** Ready for Implementation
**Target Stack:** Django 4.2 + DRF + PostgreSQL 15 (UUID PKs), Redis/Celery

---

## Document Overview

This document provides the complete, production-ready database schema for the Fashion Production System. It integrates:

- **v2.2 Core Models**: Style, Revision, BOM, Measurement, Construction
- **v2.2.1 PO Simplification**: Removed PR (Procurement Request), direct PO generation
- **Order-Level BOM**: OrderItemBOM for per-order consumption tracking
- **Consumption Maturity**: Three-stage consumption lifecycle (Pre-Estimate / Confirmed / Locked)
- **Automated Backfill**: MarkerReport + SampleTrimMeasurement for automatic consumption update
- **Trim Rules Library**: TrimConsumptionRule for 80% automated trim estimation
- **Batch Processing**: BatchRun for handling 300+ styles efficiently
- **Extraction Tracking**: ExtractionRun + ExtractionIssue for AI parsing management

---

## Table of Contents

1. [Change Summary](#1-change-summary)
2. [Core Design Principles](#2-core-design-principles)
3. [Entity Relationship Diagram](#3-entity-relationship-diagram)
4. [Core Entities](#4-core-entities)
5. [AI & Extraction Models](#5-ai--extraction-models)
6. [Order & Production Models](#6-order--production-models)
7. [Consumption Management Models](#7-consumption-management-models)
8. [Batch Processing Models](#8-batch-processing-models)
9. [Indexes & Query Patterns](#9-indexes--query-patterns)
10. [Business Rules & Constraints](#10-business-rules--constraints)
11. [Migration Path](#11-migration-path)

---

## 1. Change Summary

### New in v2.2.1 COMPLETE

#### Added Models
- `OrderItemBOM` - Order-level BOM instance (consumption per order)
- `MarkerReport` - Marker report upload & parsing
- `SampleTrimMeasurement` - Sample trim measurement records
- `TrimConsumptionRule` - Trim consumption calculation rules library
- `BatchRun` / `BatchRunItem` - Batch processing management
- `ExtractionRun` / `ExtractionIssue` - AI extraction tracking

#### Updated Models
- `BOMItem` - Added consumption_method, consumption_rule fields
- `POLineDraft` - Added order_item_bom FK (links to Order-level BOM)
- `PurchaseOrderDraft` - Removed procurement_request_id (simplified flow)

#### Removed Models
- `ProcurementRequest` / `ProcurementLine` (simplified to direct PO generation)

---

## 2. Core Design Principles

### 2.1 Consumption Lifecycle Management

```
Stage 0: Unknown
   ↓ (Apply trim rules or manual estimate)
Stage 1: Pre-Estimate (for RFQ/costing)
   ↓ (Upload Marker Report / Sample measurement)
Stage 2: Confirmed (marker/sample verified)
   ↓ (PP approved, ready for bulk production)
Stage 3: Locked (cannot change, used for Production PO)
```

### 2.2 Two-Level BOM Architecture

```
BOMItem (Revision Level - Template)
   ├─ Estimated consumption
   ├─ Consumption rules (for trims)
   └─ Supplier/Material references

OrderItemBOM (Order Level - Instance)
   ├─ Pre-estimate value
   ├─ Confirmed value (from marker/sample)
   ├─ Locked value (for production)
   ├─ Consumption status
   └─ Evidence documents
```

**Why Two Levels?**
- Same style, different orders → different consumption (size run, fabric width)
- Marker reports are order-specific, not revision-specific
- Price negotiation happens per order

### 2.3 Automated Backfill Workflow

```
1. Create SalesOrderItem
   → Copy BOMItem to OrderItemBOM
   → Apply trim rules → Pre-estimate

2. Upload Marker Report (CSV/Excel/PDF)
   → Parse automatically
   → Backfill fabric consumption → Confirmed
   → Trigger PO recalculation

3. Submit Sample Trim Measurements
   → Backfill trim consumption → Confirmed
   → Trigger PO recalculation

4. Lock Consumption (before bulk PO)
   → Status: Locked
   → Cannot change without unlock permission
```

### 2.4 Batch Processing Strategy

```
User selects 50 styles → Click "Auto Run"
   ↓
BatchRun created (total_count=50, status=running)
   ↓
50 BatchRunItem tasks queued (Celery)
   ↓
Parallel execution (max 5 concurrent)
   ↓
Results: Done / Needs Review / Failed
   ↓
Review Queue shows only items needing attention
```

---

## 3. Entity Relationship Diagram

```mermaid
erDiagram
  ORGANIZATION ||--o{ USER : has
  ORGANIZATION ||--o{ STYLE : owns
  ORGANIZATION ||--o{ SUPPLIER : manages
  ORGANIZATION ||--o{ FACTORY : manages
  ORGANIZATION ||--o{ MATERIAL : catalogs
  ORGANIZATION ||--o{ TRIM_CONSUMPTION_RULE : defines

  STYLE ||--o{ STYLE_REVISION : versions
  STYLE_REVISION ||--o{ DOCUMENT : files
  STYLE_REVISION ||--o{ BOM_ITEM : has
  STYLE_REVISION ||--o{ MEASUREMENT : has
  STYLE_REVISION ||--o{ CONSTRUCTION_STEP : has
  STYLE_REVISION ||--o{ EXTRACTION_RUN : parsing_runs

  EXTRACTION_RUN ||--o{ AI_EXTRACTION_LOG : ai_calls
  EXTRACTION_RUN ||--o{ EXTRACTION_ISSUE : issues

  SALES_ORDER ||--o{ SALES_ORDER_ITEM : contains
  SALES_ORDER_ITEM }o--|| STYLE : references
  SALES_ORDER_ITEM }o--|| STYLE_REVISION : uses_approved_revision
  SALES_ORDER_ITEM ||--o{ ORDER_ITEM_BOM : instantiated_bom

  ORDER_ITEM_BOM }o--|| BOM_ITEM : based_on_template
  ORDER_ITEM_BOM }o--|| SUPPLIER : supplier
  ORDER_ITEM_BOM }o--|| MATERIAL : material
  ORDER_ITEM_BOM }o--o| MARKER_REPORT : marker_evidence
  ORDER_ITEM_BOM }o--o| SAMPLE_TRIM_MEASUREMENT : trim_evidence

  SALES_ORDER_ITEM ||--o{ MARKER_REPORT : uploads
  SALES_ORDER_ITEM ||--o{ SAMPLE_TRIM_MEASUREMENT : measurements
  SALES_ORDER_ITEM ||--o{ MANUFACTURING_ORDER : generates
  SALES_ORDER_ITEM ||--o{ PURCHASE_ORDER_DRAFT : generates_drafts

  PURCHASE_ORDER_DRAFT ||--o{ PO_LINE_DRAFT : lines
  PO_LINE_DRAFT }o--|| ORDER_ITEM_BOM : calculates_from
  PURCHASE_ORDER_DRAFT ||--o| PURCHASE_ORDER : becomes_after_approval

  PURCHASE_ORDER ||--o{ PO_LINE : lines

  BATCH_RUN ||--o{ BATCH_RUN_ITEM : items
  BATCH_RUN_ITEM }o--|| STYLE : targets

  BOM_ITEM }o--|| MATERIAL : material
  BOM_ITEM }o--|| SUPPLIER : supplier
  BOM_ITEM }o--o| TRIM_CONSUMPTION_RULE : uses_rule

  MANUFACTURING_ORDER }o--|| FACTORY : factory
```

---

## 4. Core Entities

### 4.1 Organization / User

```python
import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class Organization(models.Model):
    """Multi-tenant support (optional for MVP single user)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    settings = models.JSONField(default=dict, blank=True)

    # File storage settings
    storage_backend = models.CharField(max_length=30, default='s3')  # s3 / minio / local
    storage_config = models.JSONField(default=dict)

    # AI budget
    ai_budget_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=200.00)
    ai_usage_current_month = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'organization'
        indexes = [
            models.Index(fields=['name']),
        ]

class User(AbstractUser):
    """Extended user with organization and role"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='users'
    )
    role = models.CharField(
        max_length=30,
        default="admin",
        choices=[
            ('admin', 'Admin'),
            ('merchandiser', 'Merchandiser'),
            ('factory', 'Factory User'),
            ('viewer', 'Viewer'),
        ]
    )

    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    notification_settings = models.JSONField(default=dict)

    class Meta:
        db_table = 'user'
```

### 4.2 Style / StyleRevision / Document

```python
class Style(models.Model):
    """款式主档 - Core style master data"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    style_number = models.CharField(max_length=64, db_index=True)
    style_name = models.CharField(max_length=200, blank=True)
    season = models.CharField(max_length=50, blank=True, db_index=True)
    customer = models.CharField(max_length=100, blank=True, db_index=True)

    status = models.CharField(
        max_length=30,
        default="active",
        choices=[
            ('active', 'Active'),
            ('archived', 'Archived'),
        ]
    )

    # Metadata
    category = models.CharField(max_length=50, blank=True)  # tops, bottoms, dress, etc.
    garment_type = models.CharField(max_length=50, blank=True)  # tank, tee, leggings, etc.

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'style'
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "style_number", "season", "customer"],
                name="uniq_style_org_style_season_customer",
            )
        ]
        indexes = [
            models.Index(fields=["organization", "style_number"]),
            models.Index(fields=["organization", "season"]),
            models.Index(fields=["organization", "customer"]),
            models.Index(fields=["organization", "status", "updated_at"]),
        ]

class StyleRevision(models.Model):
    """款式版本 - Style revision (Rev A, Rev B, etc.)"""
    STATUS_CHOICES = [
        ("uploaded", "Uploaded"),
        ("parsing", "Parsing"),
        ("draft", "Draft (Needs Review)"),
        ("approved", "Approved"),
        ("superseded", "Superseded"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    style = models.ForeignKey(Style, related_name="revisions", on_delete=models.CASCADE)

    revision_label = models.CharField(max_length=20, db_index=True)  # "Rev A", "Rev B"
    file_hash = models.CharField(max_length=64, db_index=True)  # For duplicate detection
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="uploaded")

    # AI raw extraction (kept for traceability; NOT the final truth)
    ai_extraction_raw = models.JSONField(null=True, blank=True)
    ai_confidence = models.FloatField(null=True, blank=True)
    ai_issues = models.JSONField(default=list, blank=True)

    # Verified snapshot pointer
    verified_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    verified_at = models.DateTimeField(null=True, blank=True)

    # Version chain
    previous_revision = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="next_revisions"
    )
    detected_changes = models.JSONField(null=True, blank=True)  # AI diff summary

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'style_revision'
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "style", "revision_label"],
                name="uniq_revision_per_style_label",
            )
        ]
        indexes = [
            models.Index(fields=["organization", "style", "status"]),
            models.Index(fields=["organization", "status", "created_at"]),
            models.Index(fields=["file_hash"]),
        ]

class Document(models.Model):
    """文档管理 - Documents associated with revision"""
    DOC_TYPES = [
        ("techpack", "Tech Pack"),
        ("bom", "BOM"),
        ("spec", "Spec"),
        ("construction", "Construction"),
        ("artwork", "Artwork"),
        ("marker_report", "Marker Report"),
        ("mwo_pdf", "Manufacturing WO PDF"),
        ("po_pdf", "Purchase Order PDF"),
        ("annotated_zh_pdf", "Annotated Chinese PDF"),
        ("sample_photo", "Sample Photo"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    revision = models.ForeignKey(
        StyleRevision,
        related_name="documents",
        on_delete=models.CASCADE
    )

    doc_type = models.CharField(max_length=30, choices=DOC_TYPES, db_index=True)
    filename = models.CharField(max_length=255)
    storage_key = models.CharField(max_length=500)  # S3/MinIO key
    file_size = models.BigIntegerField(null=True, blank=True)  # bytes
    file_hash = models.CharField(max_length=64, db_index=True)  # SHA256

    page_count = models.IntegerField(null=True, blank=True)

    # Optional: store PDF text blocks index / OCR metadata summary
    ocr_metadata = models.JSONField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'document'
        indexes = [
            models.Index(fields=["organization", "revision", "doc_type"]),
            models.Index(fields=["organization", "doc_type", "created_at"]),
            models.Index(fields=["file_hash"]),
        ]
```

### 4.3 Supplier / Material / Factory

```python
class Supplier(models.Model):
    """供应商主档"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    name = models.CharField(max_length=200, db_index=True)
    code = models.CharField(max_length=50, blank=True, db_index=True)

    # Contact
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=300, blank=True)
    contact_person = models.CharField(max_length=100, blank=True)

    # Business terms
    category = models.CharField(max_length=50, blank=True)  # fabric, trim, label, packaging
    payment_terms = models.CharField(max_length=100, blank=True)
    lead_time_days = models.IntegerField(null=True, blank=True)
    moq = models.CharField(max_length=100, blank=True)

    # Metadata
    meta = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'supplier'
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "name"],
                name="uniq_supplier_org_name"
            )
        ]
        indexes = [
            models.Index(fields=["organization", "name"]),
            models.Index(fields=["organization", "category"]),
            models.Index(fields=["organization", "is_active"]),
        ]

class Factory(models.Model):
    """工厂主档"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    name = models.CharField(max_length=200, db_index=True)
    code = models.CharField(max_length=50, blank=True, db_index=True)

    # Contact
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.CharField(max_length=300, blank=True)

    # Capabilities
    capabilities = models.JSONField(default=list, blank=True)  # ['knit', 'woven', 'swim']
    capacity_monthly = models.IntegerField(null=True, blank=True)

    meta = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'factory'
        indexes = [
            models.Index(fields=["organization", "name"]),
            models.Index(fields=["organization", "is_active"]),
        ]

class Material(models.Model):
    """物料主档"""
    CATEGORY_CHOICES = [
        ("fabric", "Fabric"),
        ("trim", "Trim"),
        ("label", "Label"),
        ("packaging", "Packaging"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, db_index=True)
    name = models.CharField(max_length=200, db_index=True)  # Canonical material name
    code = models.CharField(max_length=50, blank=True, db_index=True)

    # Specifications
    spec = models.CharField(max_length=300, blank=True)  # Composition, GSM, width, etc.
    composition = models.CharField(max_length=200, blank=True)
    weight_gsm = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    width_unit = models.CharField(max_length=10, blank=True)  # inch / cm

    # Default supplier
    default_supplier = models.ForeignKey(
        Supplier,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='default_materials'
    )

    # Metadata
    meta = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'material'
        indexes = [
            models.Index(fields=["organization", "category"]),
            models.Index(fields=["organization", "name"]),
            models.Index(fields=["organization", "code"]),
        ]
```

### 4.4 BOM / Measurement / Construction (Revision Level)

```python
class BOMItem(models.Model):
    """BOM 行项（Revision 级别 - 模板）"""
    CATEGORY_CHOICES = [
        ("fabric", "Fabric"),
        ("trim", "Trim"),
        ("label", "Label"),
        ("packaging", "Packaging"),
        ("other", "Other"),
    ]

    CONSUMPTION_METHOD_CHOICES = [
        ('manual', 'Manual Input'),
        ('fixed_per_pc', 'Fixed per Piece'),  # 1 set/pc
        ('rule_based', 'Rule-based Calculation'),  # elastic = opening + overlap
        ('marker_report', 'From Marker Report'),  # Fabric
        ('sample_measurement', 'Sample Measurement'),  # Trim actual
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    revision = models.ForeignKey(
        StyleRevision,
        related_name="bom_items",
        on_delete=models.CASCADE
    )

    line_no = models.IntegerField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, db_index=True)

    # Material linkage
    material = models.ForeignKey(
        Material,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='bom_items'
    )
    raw_material_name = models.CharField(max_length=300, blank=True)  # As written in PDF

    # Supplier linkage
    supplier = models.ForeignKey(
        Supplier,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='bom_items'
    )

    # Color
    color = models.CharField(max_length=120, blank=True)
    color_code = models.CharField(max_length=50, blank=True)

    # Estimated consumption (template level, can be null)
    estimated_consumption = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True
    )
    consumption_uom = models.CharField(max_length=30, blank=True)  # yd/pc, m/pc, pcs/pc, set/pc

    # Consumption method & rules (NEW in v2.2.1)
    consumption_method = models.CharField(
        max_length=30,
        choices=CONSUMPTION_METHOD_CHOICES,
        default='manual'
    )
    consumption_rule = models.JSONField(null=True, blank=True)
    # Example for trim rule:
    # {
    #   "rule_id": "uuid",
    #   "formula": "waist_opening + overlap + shrinkage",
    #   "params": {"overlap": 2.5, "shrinkage": 0.05},
    #   "measurement_point": "waist_opening"
    # }

    # Costing
    wastage_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        default=5.0
    )  # %
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True
    )
    currency = models.CharField(max_length=10, blank=True)

    # Placement
    placement = models.JSONField(default=list, blank=True)  # ['body', 'sleeve', 'collar']

    notes = models.TextField(blank=True)

    # AI tracking
    ai_confidence = models.FloatField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bom_item'
        constraints = [
            models.UniqueConstraint(
                fields=["revision", "line_no"],
                name="uniq_bom_line_per_revision"
            )
        ]
        indexes = [
            models.Index(fields=["organization", "revision", "category"]),
            models.Index(fields=["organization", "supplier"]),
            models.Index(fields=["organization", "material"]),
        ]

class Measurement(models.Model):
    """尺寸规格点"""
    UNIT_CHOICES = [("cm", "cm"), ("inch", "inch")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    revision = models.ForeignKey(
        StyleRevision,
        related_name="measurements",
        on_delete=models.CASCADE
    )

    point_code = models.CharField(max_length=30, blank=True, db_index=True)
    point_name = models.CharField(max_length=120, db_index=True)

    # Size values normalized as JSON for flexibility
    values = models.JSONField(default=dict)  # {"XS": 40.0, "S": 42.0, ...}
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES, default="cm")

    tolerance_plus = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )
    tolerance_minus = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True
    )

    # AI tracking
    ai_confidence = models.FloatField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        db_table = 'measurement'
        constraints = [
            models.UniqueConstraint(
                fields=["revision", "point_name"],
                name="uniq_measure_point_per_revision"
            )
        ]
        indexes = [
            models.Index(fields=["organization", "revision"]),
            models.Index(fields=["organization", "point_name"]),
        ]

class ConstructionStep(models.Model):
    """做工工序"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    revision = models.ForeignKey(
        StyleRevision,
        related_name="construction_steps",
        on_delete=models.CASCADE
    )

    step_no = models.IntegerField(db_index=True)
    title = models.CharField(max_length=200, blank=True)
    instruction = models.TextField()  # Factory-ready text (Chinese after review)
    machine_type = models.CharField(max_length=100, blank=True)  # 301/401/bartack...
    qc_point = models.TextField(blank=True)

    # AI tracking
    ai_confidence = models.FloatField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        db_table = 'construction_step'
        constraints = [
            models.UniqueConstraint(
                fields=["revision", "step_no"],
                name="uniq_construction_step_per_revision"
            )
        ]
        indexes = [
            models.Index(fields=["organization", "revision"]),
            models.Index(fields=["organization", "step_no"]),
        ]
```

---

## 5. AI & Extraction Models

### 5.1 AIExtractionLog

```python
class AIExtractionLog(models.Model):
    """AI 抽取日志（完整 metadata）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    revision = models.ForeignKey(
        StyleRevision,
        related_name="ai_logs",
        on_delete=models.CASCADE
    )
    extraction_type = models.CharField(max_length=50, db_index=True)
    # bom / measurement / construction / ocr / translate / marker_parse / ...

    # Model info
    model_name = models.CharField(max_length=80)  # gpt-4o, gpt-4o-mini, etc.
    prompt_version = models.CharField(max_length=40, blank=True)

    # Input/Output
    input_digest = models.JSONField(default=dict)  # File IDs, page ranges, hashes
    output = models.JSONField(null=True, blank=True)

    # Quality metrics
    confidence = models.FloatField(null=True, blank=True)
    issues = models.JSONField(default=list, blank=True)

    # Performance metrics
    processing_time_ms = models.IntegerField(null=True, blank=True)
    api_cost_usd = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True
    )

    # Error handling
    error = models.TextField(blank=True)
    retry_of = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='retries'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_extraction_log'
        indexes = [
            models.Index(fields=["organization", "extraction_type"]),
            models.Index(fields=["organization", "created_at"]),
            models.Index(fields=["organization", "revision"]),
        ]
```

### 5.2 ExtractionRun & ExtractionIssue

```python
class ExtractionRun(models.Model):
    """AI 解析运行（一次完整的 parse 任务）"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('partial', 'Partial (Some failed)'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    revision = models.ForeignKey(
        StyleRevision,
        related_name="extraction_runs",
        on_delete=models.CASCADE
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Extraction scope
    extraction_types = models.JSONField(default=list)  # ['bom', 'measurement', 'construction']

    # Results summary
    total_extractions = models.IntegerField(default=0)
    successful_extractions = models.IntegerField(default=0)
    failed_extractions = models.IntegerField(default=0)

    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Cost
    total_cost_usd = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0.0000
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'extraction_run'
        indexes = [
            models.Index(fields=["organization", "revision", "status"]),
            models.Index(fields=["organization", "status", "created_at"]),
        ]

class ExtractionIssue(models.Model):
    """解析过程中发现的问题"""
    ISSUE_TYPE_CHOICES = [
        ('missing_field', 'Missing Field'),
        ('low_confidence', 'Low Confidence'),
        ('data_conflict', 'Data Conflict'),
        ('invalid_value', 'Invalid Value'),
        ('missing_supplier', 'Missing Supplier'),
        ('missing_material', 'Missing Material'),
        ('missing_consumption', 'Missing Consumption'),
        ('other', 'Other'),
    ]

    SEVERITY_CHOICES = [
        ('error', 'Error'),
        ('warn', 'Warning'),
        ('info', 'Info'),
    ]

    STATUS_CHOICES = [
        ('open', 'Open'),
        ('resolved', 'Resolved'),
        ('ignored', 'Ignored'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    run = models.ForeignKey(
        ExtractionRun,
        related_name="issues",
        on_delete=models.CASCADE
    )

    issue_type = models.CharField(max_length=30, choices=ISSUE_TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='warn')

    # Target entity
    entity_type = models.CharField(max_length=30, blank=True)  # BOMItem / Measurement / ...
    entity_id = models.UUIDField(null=True, blank=True)
    field_name = models.CharField(max_length=100, blank=True)

    # Description
    message = models.TextField()
    evidence = models.JSONField(default=dict, blank=True)  # Page, bbox, text snippet

    # AI suggested fix
    suggested_fix = models.JSONField(null=True, blank=True)

    # Resolution
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    resolved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'extraction_issue'
        indexes = [
            models.Index(fields=["organization", "run", "status"]),
            models.Index(fields=["organization", "status", "severity"]),
            models.Index(fields=["entity_type", "entity_id"]),
        ]
```

---

## 6. Order & Production Models

### 6.1 SalesOrder / SalesOrderItem

```python
class SalesOrder(models.Model):
    """销售订单（客户 PO）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    order_no = models.CharField(max_length=50, db_index=True)
    customer = models.CharField(max_length=120, blank=True, db_index=True)
    season = models.CharField(max_length=50, blank=True, db_index=True)

    status = models.CharField(
        max_length=30,
        default="open",
        choices=[
            ('open', 'Open'),
            ('closed', 'Closed'),
            ('cancelled', 'Cancelled'),
        ]
    )

    order_date = models.DateField(null=True, blank=True)
    ship_date = models.DateField(null=True, blank=True)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sales_order'
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "order_no"],
                name="uniq_salesorder_org_orderno"
            )
        ]
        indexes = [
            models.Index(fields=["organization", "customer"]),
            models.Index(fields=["organization", "season"]),
            models.Index(fields=["organization", "status"]),
        ]

class SalesOrderItem(models.Model):
    """订单行项（款色级别）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    sales_order = models.ForeignKey(
        SalesOrder,
        related_name="items",
        on_delete=models.CASCADE
    )

    # Style reference
    style = models.ForeignKey(Style, on_delete=models.PROTECT)
    approved_revision = models.ForeignKey(
        StyleRevision,
        on_delete=models.PROTECT,
        related_name='order_items'
    )

    # Colorway
    colorway = models.CharField(max_length=120, blank=True)
    color_code = models.CharField(max_length=50, blank=True)

    # Quantity
    total_qty = models.IntegerField()
    size_breakdown = models.JSONField(default=dict)  # {"XS":100, "S":200, "M":300...}

    # Factory
    factory = models.ForeignKey(
        Factory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    # Dates
    delivery_date = models.DateField(null=True, blank=True)
    ex_factory_date = models.DateField(null=True, blank=True)

    # Status
    status = models.CharField(
        max_length=30,
        default="planning",
        choices=[
            ('planning', 'Planning'),
            ('sampling', 'Sampling'),
            ('bulk', 'Bulk Production'),
            ('shipped', 'Shipped'),
        ]
    )

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sales_order_item'
        indexes = [
            models.Index(fields=["organization", "sales_order"]),
            models.Index(fields=["organization", "style"]),
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "delivery_date"]),
        ]
```

### 6.2 ManufacturingOrder / PurchaseOrder

```python
class ManufacturingOrder(models.Model):
    """制造工作单（MWO）"""
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("generating", "Generating PDF"),
        ("approved", "Approved"),
        ("issued", "Issued"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    sales_order_item = models.OneToOneField(
        SalesOrderItem,
        on_delete=models.CASCADE,
        related_name='manufacturing_order'
    )
    factory = models.ForeignKey(
        Factory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Snapshot of approved data used to generate PDF
    snapshot = models.JSONField(default=dict)
    # {
    #   "bom": [...],
    #   "measurements": [...],
    #   "construction": [...],
    #   "meta": {...}
    # }

    # Generated PDF
    pdf_document = models.ForeignKey(
        Document,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='mwo_pdfs'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'manufacturing_order'
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "created_at"]),
        ]

class PurchaseOrderDraft(models.Model):
    """采购订单草稿（按供应商分组）"""
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("approved", "Approved"),
        ("sent", "Sent"),
    ]

    PO_TYPE_CHOICES = [
        ("rfq", "RFQ (Request for Quote)"),
        ("production", "Production"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    sales_order_item = models.ForeignKey(
        SalesOrderItem,
        related_name="purchase_order_drafts",
        on_delete=models.CASCADE
    )

    # Supplier (NULL = UNASSIGNED bucket)
    supplier = models.ForeignKey(
        Supplier,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    po_type = models.CharField(max_length=20, choices=PO_TYPE_CHOICES, default="rfq")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Calculation snapshot reference
    calc_snapshot = models.ForeignKey(
        'POCalcSnapshot',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    # Generated PDF
    pdf_document = models.ForeignKey(
        Document,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='po_draft_pdfs'
    )

    # Email draft
    email_draft_id = models.UUIDField(null=True, blank=True)  # Future: link to EmailDraft

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchase_order_draft'
        constraints = [
            models.UniqueConstraint(
                fields=["sales_order_item", "supplier"],
                name="uniq_po_draft_per_order_supplier",
                condition=models.Q(supplier__isnull=False)
            )
        ]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["sales_order_item"]),
            models.Index(fields=["organization", "supplier"]),
        ]

class POLineDraft(models.Model):
    """采购订单草稿行项"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    purchase_order_draft = models.ForeignKey(
        PurchaseOrderDraft,
        related_name="lines",
        on_delete=models.CASCADE
    )

    # Links to Order-level BOM (NEW in v2.2.1 COMPLETE)
    order_item_bom = models.ForeignKey(
        'OrderItemBOM',
        on_delete=models.CASCADE,
        related_name='po_lines'
    )

    # Also keep link to template for traceability
    bom_item = models.ForeignKey(
        BOMItem,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    # Material linkage (may be pending)
    material = models.ForeignKey(
        Material,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    # Description & specs
    description = models.TextField()  # Defaults to BOM material_raw
    color = models.CharField(max_length=120, blank=True)
    color_code = models.CharField(max_length=50, blank=True)

    # Quantity
    qty = models.DecimalField(max_digits=14, decimal_places=4)
    uom = models.CharField(max_length=30)  # yd / m / pc / set / kg

    # Pricing
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True
    )
    currency = models.CharField(max_length=10, blank=True)
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True
    )  # qty × unit_price

    # Delivery
    requested_delivery_date = models.DateField(null=True, blank=True)

    # Calculation trace (NEW in v2.2.1)
    calculation = models.JSONField(default=dict)
    # {
    #   "order_qty": 2000,
    #   "consumption": 2.5,
    #   "consumption_status": "confirmed",
    #   "wastage_rate": 5.0,
    #   "formula": "2000 × 2.5 × 1.05",
    #   "result": 5250
    # }

    # Quality metrics
    confidence = models.FloatField(null=True, blank=True)  # AI mapping confidence
    issues = models.JSONField(default=list, blank=True)  # Per-line issues

    # Verification
    source = models.CharField(
        max_length=20,
        default="ai",
        choices=[('ai', 'AI Generated'), ('human', 'Human Input')]
    )
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    meta = models.JSONField(default=dict, blank=True)  # MOQ, rounding, etc.

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'po_line_draft'
        indexes = [
            models.Index(fields=["purchase_order_draft"]),
            models.Index(fields=["organization", "material"]),
            models.Index(fields=["organization", "order_item_bom"]),
            models.Index(fields=["organization", "is_verified"]),
        ]

class PurchaseOrder(models.Model):
    """正式采购订单（已发出）"""
    STATUS_CHOICES = [
        ("issued", "Issued"),
        ("confirmed", "Confirmed"),
        ("received", "Received"),
        ("cancelled", "Cancelled"),
    ]

    PO_TYPE_CHOICES = [
        ("rfq", "RFQ"),
        ("production", "Production"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    sales_order_item = models.ForeignKey(
        SalesOrderItem,
        related_name="purchase_orders",
        on_delete=models.CASCADE
    )

    # Link to draft (for traceability)
    draft = models.OneToOneField(
        PurchaseOrderDraft,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='issued_po'
    )

    po_number = models.CharField(max_length=50, db_index=True)
    supplier = models.ForeignKey(
        Supplier,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    po_type = models.CharField(max_length=20, choices=PO_TYPE_CHOICES, default="rfq")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="issued")

    # Snapshot
    snapshot = models.JSONField(default=dict)  # Summary + totals

    # Issued PDF
    pdf_document = models.ForeignKey(
        Document,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='po_pdfs'
    )

    # Dates
    issued_date = models.DateField(null=True, blank=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    actual_delivery_date = models.DateField(null=True, blank=True)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchase_order'
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "po_number"],
                name="uniq_po_number"
            )
        ]
        indexes = [
            models.Index(fields=["organization", "supplier"]),
            models.Index(fields=["organization", "po_type", "status"]),
            models.Index(fields=["organization", "issued_date"]),
        ]

class POLine(models.Model):
    """正式采购订单行项"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        related_name="lines",
        on_delete=models.CASCADE
    )

    description = models.TextField()
    qty = models.DecimalField(max_digits=14, decimal_places=4)
    uom = models.CharField(max_length=30)
    unit_price = models.DecimalField(max_digits=12, decimal_places=4)
    currency = models.CharField(max_length=10)
    amount = models.DecimalField(max_digits=14, decimal_places=2)

    meta = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'po_line'
```

---

## 7. Consumption Management Models

### 7.1 OrderItemBOM (Order-Level BOM Instance) ⭐⭐⭐

```python
class OrderItemBOM(models.Model):
    """Order 级别的 BOM 实例（真正用于计算 PO 的数据）"""

    CONSUMPTION_STATUS_CHOICES = [
        ('unknown', 'Unknown'),
        ('pre_estimate', 'Pre-Estimate'),  # For RFQ
        ('confirmed', 'Confirmed'),        # Marker/sample verified
        ('locked', 'Locked'),              # PP approved, cannot change
    ]

    CONSUMPTION_SOURCE_CHOICES = [
        ('template', 'From Template'),
        ('rule_based', 'Rule-based Calculation'),
        ('marker_report', 'Marker Report'),
        ('sample_measurement', 'Sample Measurement'),
        ('manual', 'Manual Input'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    sales_order_item = models.ForeignKey(
        SalesOrderItem,
        related_name="order_boms",
        on_delete=models.CASCADE
    )
    bom_item = models.ForeignKey(
        BOMItem,
        on_delete=models.PROTECT,
        related_name='order_instances'
    )  # Link to template

    # Material & Supplier (copied from BOMItem, can be updated)
    material = models.ForeignKey(
        Material,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    supplier = models.ForeignKey(
        Supplier,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    category = models.CharField(max_length=20)  # fabric / trim / label / packaging

    # Three-stage consumption values ⭐⭐⭐
    pre_estimate_value = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True
    )
    confirmed_value = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True
    )
    locked_value = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True
    )

    consumption_uom = models.CharField(max_length=30)

    # Current status
    consumption_status = models.CharField(
        max_length=30,
        choices=CONSUMPTION_STATUS_CHOICES,
        default='unknown'
    )

    # Source traceability
    consumption_source = models.CharField(
        max_length=30,
        choices=CONSUMPTION_SOURCE_CHOICES,
        blank=True
    )

    # Evidence documents
    marker_document = models.ForeignKey(
        'MarkerReport',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='affected_boms'
    )
    sample_measurement_record = models.ForeignKey(
        'SampleTrimMeasurement',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='affected_boms'
    )

    # Costing parameters
    wastage_rate = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=5.0
    )  # %
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True
    )
    currency = models.CharField(max_length=10, blank=True)

    # Calculated total quantity (cached)
    calculated_total_qty = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        null=True,
        blank=True
    )
    # Formula: order_qty × consumption × (1 + wastage_rate/100)

    # Verification
    is_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'order_item_bom'
        constraints = [
            models.UniqueConstraint(
                fields=['sales_order_item', 'bom_item'],
                name='uniq_order_item_bom'
            )
        ]
        indexes = [
            models.Index(fields=["organization", "sales_order_item"]),
            models.Index(fields=["organization", "consumption_status"]),
            models.Index(fields=["organization", "category", "consumption_status"]),
            models.Index(fields=["organization", "supplier"]),
        ]

    @property
    def active_consumption_value(self):
        """Get active consumption value based on current status"""
        if self.consumption_status == 'locked':
            return self.locked_value
        elif self.consumption_status == 'confirmed':
            return self.confirmed_value
        elif self.consumption_status == 'pre_estimate':
            return self.pre_estimate_value
        else:
            return None

    def calculate_total_qty(self):
        """Calculate total procurement quantity"""
        consumption = self.active_consumption_value
        if consumption is None:
            return None

        order_qty = self.sales_order_item.total_qty
        wastage = 1 + (self.wastage_rate / 100)
        total = order_qty * consumption * wastage

        # Apply rounding based on UOM
        total = self.apply_rounding(total, self.consumption_uom)

        self.calculated_total_qty = total
        return total

    def apply_rounding(self, value, uom):
        """Apply rounding rules based on UOM"""
        from decimal import Decimal, ROUND_HALF_UP

        rounding_rules = {
            'yd': Decimal('0.1'),
            'm': Decimal('0.1'),
            'pc': Decimal('1'),
            'set': Decimal('1'),
            'kg': Decimal('0.01'),
        }

        # Extract base unit (e.g., 'yd/pc' -> 'yd')
        base_unit = uom.split('/')[0] if '/' in uom else uom

        precision = rounding_rules.get(base_unit, Decimal('0.01'))
        return (Decimal(str(value)) / precision).quantize(Decimal('1'), rounding=ROUND_HALF_UP) * precision
```

### 7.2 MarkerReport (Fabric Consumption Backfill)

```python
class MarkerReport(models.Model):
    """Marker Report 上传与解析记录"""

    FILE_TYPE_CHOICES = [
        ('csv', 'CSV'),
        ('excel', 'Excel'),
        ('pdf', 'PDF'),
    ]

    PARSE_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('parsing', 'Parsing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    BACKFILL_STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    sales_order_item = models.ForeignKey(
        SalesOrderItem,
        related_name="marker_reports",
        on_delete=models.CASCADE
    )

    # Uploaded file
    document = models.ForeignKey(Document, on_delete=models.CASCADE)
    file_type = models.CharField(max_length=20, choices=FILE_TYPE_CHOICES)

    # Parse status
    parse_status = models.CharField(
        max_length=20,
        choices=PARSE_STATUS_CHOICES,
        default='pending'
    )

    # Parsed data
    parsed_data = models.JSONField(null=True, blank=True)
    # {
    #   "fabric_width": 60,  # inches
    #   "marker_length": 4.2,  # yards
    #   "efficiency": 85.3,  # %
    #   "consumption_per_size": {
    #     "XS": 2.2,
    #     "S": 2.3,
    #     "M": 2.5,
    #     "L": 2.7,
    #     "XL": 2.9
    #   },
    #   "weighted_avg": 2.38  # Based on size_breakdown
    # }

    # Backfill status
    backfill_status = models.CharField(
        max_length=20,
        choices=BACKFILL_STATUS_CHOICES,
        default='not_started'
    )
    backfill_log = models.JSONField(default=list, blank=True)
    # [
    #   {
    #     "bom_item_id": "uuid",
    #     "material_name": "Nulu Fabric",
    #     "old_value": null,
    #     "new_value": 2.38,
    #     "status": "success"
    #   },
    #   ...
    # ]

    # Parse method
    parse_method = models.CharField(max_length=30, blank=True)  # 'rule_based' / 'ai_vision'
    parse_cost = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True
    )  # AI cost

    error_message = models.TextField(blank=True)

    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marker_report'
        indexes = [
            models.Index(fields=["organization", "sales_order_item"]),
            models.Index(fields=["organization", "parse_status"]),
            models.Index(fields=["organization", "backfill_status"]),
        ]
```

### 7.3 SampleTrimMeasurement (Trim Consumption Backfill)

```python
class SampleTrimMeasurement(models.Model):
    """样衣副料实测记录"""

    BACKFILL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('partial', 'Partial'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    sales_order_item = models.ForeignKey(
        SalesOrderItem,
        related_name="trim_measurements",
        on_delete=models.CASCADE
    )
    sample = models.ForeignKey(
        'Sample',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )  # Future: link to Sample model

    # Measured by
    measured_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    measured_at = models.DateTimeField(auto_now_add=True)

    # Measurement data
    measurements = models.JSONField(default=list)
    # [
    #   {
    #     "bom_item_id": "uuid",
    #     "material_name": "Knit Elastic",
    #     "measured_value": 68.5,
    #     "uom": "cm/pc",
    #     "notes": "Includes 2cm overlap",
    #     "photo_urls": ["https://..."]
    #   },
    #   ...
    # ]

    # Backfill status
    backfill_status = models.CharField(
        max_length=20,
        choices=BACKFILL_STATUS_CHOICES,
        default='pending'
    )
    backfill_log = models.JSONField(default=list, blank=True)

    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'sample_trim_measurement'
        indexes = [
            models.Index(fields=["organization", "sales_order_item"]),
            models.Index(fields=["organization", "backfill_status"]),
        ]
```

### 7.4 TrimConsumptionRule (Trim Rules Library)

```python
class TrimConsumptionRule(models.Model):
    """副料用量计算规则库"""

    RULE_TYPE_CHOICES = [
        ('fixed_qty', 'Fixed Quantity'),  # Fixed number per piece
        ('formula', 'Formula-based'),     # Formula using measurement points
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    # Rule basic info
    rule_name = models.CharField(max_length=100, db_index=True)
    material_category = models.CharField(max_length=50)  # elastic, binding, tape, label, button
    description = models.TextField(blank=True)

    # Rule type
    rule_type = models.CharField(max_length=30, choices=RULE_TYPE_CHOICES)

    # Fixed quantity rule
    fixed_qty = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        null=True,
        blank=True
    )
    fixed_uom = models.CharField(max_length=30, blank=True)

    # Formula rule
    formula = models.CharField(max_length=500, blank=True)
    # Example: "waist_opening + overlap + shrinkage_allowance"

    formula_params = models.JSONField(default=dict, blank=True)
    # {
    #   "overlap": 2.5,  # cm
    #   "shrinkage_allowance": 0.05  # 5%
    # }

    required_measurement_points = models.JSONField(default=list, blank=True)
    # ["waist_opening", "hip_opening", ...]

    # Usage statistics
    usage_count = models.IntegerField(default=0)
    avg_accuracy = models.FloatField(null=True, blank=True)  # Vs actual measurement

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'trim_consumption_rule'
        constraints = [
            models.UniqueConstraint(
                fields=['organization', 'rule_name'],
                name='uniq_trim_rule_name'
            )
        ]
        indexes = [
            models.Index(fields=["organization", "material_category"]),
            models.Index(fields=["organization", "is_active"]),
        ]
```

### 7.5 POCalcSnapshot (PO Calculation Traceability)

```python
class POCalcSnapshot(models.Model):
    """PO 计算快照（追溯性）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    sales_order_item = models.ForeignKey(
        SalesOrderItem,
        related_name="po_calc_snapshots",
        on_delete=models.CASCADE
    )
    style_revision = models.ForeignKey(
        StyleRevision,
        on_delete=models.PROTECT
    )  # Store for traceability

    # Input parameters
    input_qty_total = models.IntegerField()
    size_breakdown = models.JSONField(null=True, blank=True)

    # Calculation policies
    wastage_profile = models.JSONField(default=dict)
    # {"fabric": 5, "trim": 8, "label": 3, "packaging": 3}

    rounding_policy = models.JSONField(default=dict)
    # {"yd": "0.1", "m": "0.1", "pc": "1", "kg": "0.01"}

    # Calculation lines (per BOM item)
    calc_lines = models.JSONField(default=list)
    # [
    #   {
    #     "bom_item_id": "uuid",
    #     "material_name": "Nulu Fabric",
    #     "consumption": 2.38,
    #     "consumption_status": "confirmed",
    #     "wastage_rate": 5.0,
    #     "formula": "2000 × 2.38 × 1.05",
    #     "result": 4998,
    #     "rounded_result": 5000
    #   },
    #   ...
    # ]

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'po_calc_snapshot'
        indexes = [
            models.Index(fields=["sales_order_item", "created_at"]),
            models.Index(fields=["organization", "created_at"]),
        ]
```

---

## 8. Batch Processing Models

### 8.1 BatchRun / BatchRunItem

```python
class BatchRun(models.Model):
    """批次运行任务"""

    OPERATION_CHOICES = [
        ('parse', 'Parse Tech Packs'),
        ('generate_mwo', 'Generate Manufacturing WO'),
        ('generate_po', 'Generate Purchase Orders'),
        ('approve_revision', 'Approve Revisions'),
        ('marker_upload', 'Upload Marker Reports'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('completed', 'Completed'),
        ('partial', 'Partial (Some failed)'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    operation = models.CharField(max_length=30, choices=OPERATION_CHOICES)

    # Target IDs (depends on operation)
    target_type = models.CharField(max_length=30)  # 'style' / 'order_item' / 'revision'
    target_ids = models.JSONField(default=list)  # [uuid1, uuid2, ...]

    # Batch configuration
    config = models.JSONField(default=dict, blank=True)
    # {
    #   "max_concurrent": 5,
    #   "retry_count": 2,
    #   "timeout_seconds": 300
    # }

    # Progress tracking
    total_count = models.IntegerField()
    completed_count = models.IntegerField(default=0)
    failed_count = models.IntegerField(default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Results summary
    results = models.JSONField(default=dict, blank=True)
    # {
    #   "done": [uuid1, uuid2],
    #   "needs_review": [uuid3, uuid4],
    #   "failed": [uuid5]
    # }

    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'batch_run'
        indexes = [
            models.Index(fields=["organization", "status", "created_at"]),
            models.Index(fields=["organization", "operation", "status"]),
            models.Index(fields=["user", "created_at"]),
        ]

class BatchRunItem(models.Model):
    """批次运行的单项"""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('done', 'Done'),
        ('needs_review', 'Needs Review'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    batch_run = models.ForeignKey(
        BatchRun,
        related_name="items",
        on_delete=models.CASCADE
    )

    # Target
    target_id = models.UUIDField(db_index=True)
    target_type = models.CharField(max_length=30)

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Result
    result = models.JSONField(null=True, blank=True)
    error = models.TextField(blank=True)

    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Retry tracking
    retry_count = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'batch_run_item'
        constraints = [
            models.UniqueConstraint(
                fields=['batch_run', 'target_id'],
                name='uniq_batch_run_target'
            )
        ]
        indexes = [
            models.Index(fields=["batch_run", "status"]),
            models.Index(fields=["organization", "target_id"]),
            models.Index(fields=["status", "started_at"]),
        ]
```

---

## 9. Indexes & Query Patterns

### 9.1 Critical Indexes (Already defined in models above)

**High-frequency queries:**
- Style lookup: (organization, style_number)
- Revision status: (organization, status, created_at)
- BOM by supplier: (organization, supplier)
- Order items by delivery: (organization, delivery_date)
- Review queue: (organization, status, severity)

### 9.2 Common Query Examples

#### Query 1: Find all BOM items missing supplier

```sql
SELECT
  oib.id,
  s.style_number,
  sr.revision_label,
  bi.raw_material_name,
  oib.consumption_status
FROM order_item_bom oib
JOIN bom_item bi ON bi.id = oib.bom_item_id
JOIN sales_order_item soi ON soi.id = oib.sales_order_item_id
JOIN style s ON s.id = soi.style_id
JOIN style_revision sr ON sr.id = soi.approved_revision_id
WHERE oib.organization_id = :org_id
  AND oib.supplier_id IS NULL
  AND oib.category IN ('fabric', 'trim')
ORDER BY s.style_number, sr.created_at DESC;
```

#### Query 2: Find all orders ready for Production PO (fabric confirmed)

```sql
SELECT
  soi.id AS order_item_id,
  s.style_number,
  soi.colorway,
  soi.total_qty,
  COUNT(oib.id) AS total_bom_items,
  COUNT(CASE WHEN oib.consumption_status IN ('confirmed', 'locked') THEN 1 END) AS confirmed_items
FROM sales_order_item soi
JOIN style s ON s.id = soi.style_id
JOIN order_item_bom oib ON oib.sales_order_item_id = soi.id
WHERE soi.organization_id = :org_id
  AND soi.status = 'bulk'
  AND oib.category = 'fabric'
GROUP BY soi.id, s.style_number, soi.colorway, soi.total_qty
HAVING COUNT(CASE WHEN oib.consumption_status IN ('confirmed', 'locked') THEN 1 END) = COUNT(oib.id);
```

#### Query 3: Review Queue (Issues + Missing Consumption)

```sql
-- Extraction issues
SELECT
  'extraction_issue' AS type,
  ei.id,
  ei.severity,
  ei.message,
  s.style_number,
  sr.revision_label,
  ei.created_at
FROM extraction_issue ei
JOIN extraction_run er ON er.id = ei.run_id
JOIN style_revision sr ON sr.id = er.revision_id
JOIN style s ON s.id = sr.style_id
WHERE ei.organization_id = :org_id
  AND ei.status = 'open'

UNION ALL

-- Missing consumption
SELECT
  'missing_consumption' AS type,
  oib.id,
  'warn' AS severity,
  CONCAT('Missing consumption for ', bi.raw_material_name) AS message,
  s.style_number,
  sr.revision_label,
  oib.created_at
FROM order_item_bom oib
JOIN bom_item bi ON bi.id = oib.bom_item_id
JOIN sales_order_item soi ON soi.id = oib.sales_order_item_id
JOIN style s ON s.id = soi.style_id
JOIN style_revision sr ON sr.id = soi.approved_revision_id
WHERE oib.organization_id = :org_id
  AND oib.consumption_status = 'unknown'
  AND soi.status != 'planning'

ORDER BY severity, created_at ASC;
```

#### Query 4: Batch Run Progress Dashboard

```sql
SELECT
  br.id,
  br.operation,
  br.status,
  br.total_count,
  br.completed_count,
  br.failed_count,
  ROUND(br.completed_count::numeric / br.total_count * 100, 1) AS progress_pct,
  br.started_at,
  EXTRACT(EPOCH FROM (COALESCE(br.completed_at, NOW()) - br.started_at)) AS elapsed_seconds
FROM batch_run br
WHERE br.organization_id = :org_id
  AND br.created_at >= NOW() - INTERVAL '7 days'
ORDER BY br.created_at DESC;
```

---

## 10. Business Rules & Constraints

### 10.1 Consumption Lifecycle Rules

```python
# Gating rules for PO generation
def can_generate_production_po(sales_order_item):
    """Check if order item can generate Production PO"""

    fabric_boms = OrderItemBOM.objects.filter(
        sales_order_item=sales_order_item,
        category='fabric'
    )

    for bom in fabric_boms:
        if bom.consumption_status not in ['confirmed', 'locked']:
            return False, f"Fabric {bom.bom_item.raw_material_name} consumption not confirmed"

    return True, "OK"

# Auto-trigger rules
def on_marker_report_backfill(marker_report):
    """Trigger PO recalculation after marker report backfill"""
    sales_order_item = marker_report.sales_order_item

    # Find existing PO drafts
    po_drafts = PurchaseOrderDraft.objects.filter(
        sales_order_item=sales_order_item,
        status='draft'  # Only recalculate drafts
    )

    for po_draft in po_drafts:
        recalculate_po_draft_lines(po_draft)
```

### 10.2 Data Integrity Constraints

**Database-level constraints:**
- Unique (organization, style_number, season, customer) for Style
- Unique (organization, style, revision_label) for StyleRevision
- Unique (revision, line_no) for BOMItem
- Unique (sales_order_item, bom_item) for OrderItemBOM
- Unique (sales_order_item, supplier) for PurchaseOrderDraft (when supplier is not NULL)

**Application-level rules:**
- Cannot delete StyleRevision if referenced by SalesOrderItem.approved_revision
- Cannot delete OrderItemBOM if consumption_status = 'locked'
- Cannot issue Production PO if fabric consumption not confirmed
- Cannot change OrderItemBOM.locked_value without special permission

---

## 11. Migration Path

### 11.1 v2.1 → v2.2.1 COMPLETE

**Step 0: Freeze writes (maintenance window)**
- Pause all parse/approve tasks

**Step 1: Schema migration**
```bash
python manage.py makemigrations
python manage.py migrate
```

**Step 2: Backfill OrderItemBOM (if existing orders)**
```python
# management/commands/backfill_order_item_bom.py

for order_item in SalesOrderItem.objects.iterator(chunk_size=100):
    revision = order_item.approved_revision

    for bom_item in revision.bom_items.all():
        OrderItemBOM.objects.get_or_create(
            sales_order_item=order_item,
            bom_item=bom_item,
            defaults={
                'organization': order_item.organization,
                'material': bom_item.material,
                'supplier': bom_item.supplier,
                'category': bom_item.category,
                'consumption_uom': bom_item.consumption_uom,
                'consumption_status': 'unknown',
                'pre_estimate_value': bom_item.estimated_consumption,
                'wastage_rate': bom_item.wastage_rate or 5.0,
            }
        )
```

**Step 3: Update existing PO drafts**
```python
# Link POLineDraft to OrderItemBOM
for po_line in POLineDraft.objects.filter(order_item_bom__isnull=True):
    order_item = po_line.purchase_order_draft.sales_order_item
    bom_item = po_line.bom_item

    order_item_bom = OrderItemBOM.objects.get(
        sales_order_item=order_item,
        bom_item=bom_item
    )

    po_line.order_item_bom = order_item_bom
    po_line.save()
```

**Step 4: Enable new write paths**
- Deploy new code
- Resume operations

### 11.2 Data Validation Queries

```sql
-- Check for orphaned OrderItemBOM
SELECT COUNT(*) FROM order_item_bom oib
LEFT JOIN sales_order_item soi ON soi.id = oib.sales_order_item_id
WHERE soi.id IS NULL;

-- Check for POLineDraft without OrderItemBOM link
SELECT COUNT(*) FROM po_line_draft pld
WHERE pld.order_item_bom_id IS NULL;

-- Check consumption status distribution
SELECT
  category,
  consumption_status,
  COUNT(*) AS cnt
FROM order_item_bom
WHERE organization_id = :org_id
GROUP BY category, consumption_status
ORDER BY category, consumption_status;
```

---

## 12. Implementation Checklist

### Phase 1 (MVP - 3-4 weeks)

**Week 1-2: Core Models**
- [ ] Setup Django project + PostgreSQL + Redis
- [ ] Implement core models (Style, Revision, Document, BOM, Measurement, Construction)
- [ ] Implement master data models (Supplier, Material, Factory)
- [ ] Write migrations
- [ ] Create admin interface

**Week 3: Order & Consumption**
- [ ] Implement SalesOrder / SalesOrderItem models
- [ ] Implement OrderItemBOM model ⭐
- [ ] Implement MarkerReport model
- [ ] Implement SampleTrimMeasurement model
- [ ] Create consumption calculation logic

**Week 4: PO & Batch**
- [ ] Implement PurchaseOrderDraft / POLineDraft models
- [ ] Implement BatchRun / BatchRunItem models
- [ ] Implement ExtractionRun / ExtractionIssue models
- [ ] Create PO generation logic
- [ ] Create batch processing logic (Celery tasks)

### Phase 2 (Advanced Features - 2-3 weeks)

**Week 5: Trim Rules Library**
- [ ] Implement TrimConsumptionRule model
- [ ] Create rule application logic
- [ ] Define first 20 common trim rules
- [ ] Create UI for rule management

**Week 6: PDF Generation & Workflow**
- [ ] Implement ManufacturingOrder model
- [ ] Create MWO PDF generation (async)
- [ ] Create PO PDF generation (async)
- [ ] Implement approval workflow

**Week 7: Testing & Optimization**
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance optimization (indexes, queries)
- [ ] Load testing (300+ styles)

---

## Appendix: Model Dependency Graph

```
Organization
├─ User
├─ Style
│   └─ StyleRevision
│       ├─ Document
│       ├─ BOMItem
│       ├─ Measurement
│       ├─ ConstructionStep
│       ├─ ExtractionRun
│       │   ├─ AIExtractionLog
│       │   └─ ExtractionIssue
│       └─ SalesOrderItem
│           ├─ OrderItemBOM ⭐
│           │   ├─ MarkerReport
│           │   └─ SampleTrimMeasurement
│           ├─ PurchaseOrderDraft
│           │   └─ POLineDraft (links to OrderItemBOM)
│           │       └─ PurchaseOrder
│           │           └─ POLine
│           └─ ManufacturingOrder
├─ Supplier
├─ Material
├─ Factory
├─ TrimConsumptionRule
└─ BatchRun
    └─ BatchRunItem
```

---

## Document End

**Version:** 2.2.1 COMPLETE
**Status:** Ready for Implementation ✅
**Next Steps:**
1. Review and approve this schema
2. Define Trim Rules Library (20 common rules)
3. Write API Spec v2.2
4. Write AI JSON Schema v2.2

