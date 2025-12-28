"""
Phase 3: Sample Request System Models
Request-based design (not flow-based)
"""

from django.db import models
from django.core.validators import MinValueValidator
import uuid
import hashlib
import json


# ==================== Choices ====================

class SampleRequestType:
    # Core types
    PROTO = 'proto'
    FIT = 'fit'
    SALES = 'sales'
    PHOTO = 'photo'
    MARKETING = 'marketing'
    WEAR_TEST = 'wear_test'

    # Special types
    MATERIAL_TEST = 'material_test'
    COLOR_APPROVAL = 'color_approval'
    SIZE_SET = 'size_set'
    REPLACEMENT = 'replacement'

    # Trade show types
    TRADE_SHOW = 'trade_show'
    COUNTER = 'counter'
    SEALED = 'sealed'

    # Custom
    CUSTOM = 'custom'

    CHOICES = [
        (PROTO, 'Proto Sample'),
        (FIT, 'Fit Sample'),
        (SALES, 'Sales Sample'),
        (PHOTO, 'Photo Sample'),
        (MARKETING, 'Marketing Sample'),
        (WEAR_TEST, 'Wear Test'),
        (MATERIAL_TEST, 'Material Test'),
        (COLOR_APPROVAL, 'Color Approval'),
        (SIZE_SET, 'Size Set'),
        (REPLACEMENT, 'Replacement'),
        (TRADE_SHOW, 'Trade Show'),
        (COUNTER, 'Counter Sample'),
        (SEALED, 'Sealed Sample'),
        (CUSTOM, 'Custom'),
    ]


class SampleRequestStatus:
    DRAFT = 'draft'
    QUOTE_REQUESTED = 'quote_requested'
    QUOTED = 'quoted'
    APPROVED = 'approved'
    IN_EXECUTION = 'in_execution'
    COMPLETED = 'completed'
    REJECTED = 'rejected'
    CANCELLED = 'cancelled'

    CHOICES = [
        (DRAFT, 'Draft'),
        (QUOTE_REQUESTED, 'Quote Requested'),
        (QUOTED, 'Quoted'),
        (APPROVED, 'Approved'),
        (IN_EXECUTION, 'In Execution'),
        (COMPLETED, 'Completed'),
        (REJECTED, 'Rejected'),
        (CANCELLED, 'Cancelled'),
    ]


class ApprovalStatus:
    NA = 'na'
    APPROVED = 'approved'
    REJECTED = 'rejected'

    CHOICES = [
        (NA, 'N/A'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
    ]


class Priority:
    LOW = 'low'
    NORMAL = 'normal'
    URGENT = 'urgent'

    CHOICES = [
        (LOW, 'Low'),
        (NORMAL, 'Normal'),
        (URGENT, 'Urgent'),
    ]


class EstimateStatus:
    DRAFT = 'draft'
    SENT = 'sent'
    ACCEPTED = 'accepted'
    REJECTED = 'rejected'
    EXPIRED = 'expired'

    CHOICES = [
        (DRAFT, 'Draft'),
        (SENT, 'Sent'),
        (ACCEPTED, 'Accepted'),
        (REJECTED, 'Rejected'),
        (EXPIRED, 'Expired'),
    ]


class EstimateSource:
    MANUAL = 'manual'
    FROM_PHASE2_COSTING = 'from_phase2_costing'

    CHOICES = [
        (MANUAL, 'Manual'),
        (FROM_PHASE2_COSTING, 'From Phase 2 Costing'),
    ]


class T2POStatus:
    DRAFT = 'draft'
    ISSUED = 'issued'
    CONFIRMED = 'confirmed'
    DELIVERED = 'delivered'
    CANCELLED = 'cancelled'

    CHOICES = [
        (DRAFT, 'Draft'),
        (ISSUED, 'Issued'),
        (CONFIRMED, 'Confirmed'),
        (DELIVERED, 'Delivered'),
        (CANCELLED, 'Cancelled'),
    ]


class MWOStatus:
    DRAFT = 'draft'
    ISSUED = 'issued'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'

    CHOICES = [
        (DRAFT, 'Draft'),
        (ISSUED, 'Issued'),
        (IN_PROGRESS, 'In Progress'),
        (COMPLETED, 'Completed'),
        (CANCELLED, 'Cancelled'),
    ]


class SampleStatus:
    IN_PRODUCTION = 'in_production'
    COMPLETED = 'completed'
    DELIVERED = 'delivered'
    REJECTED = 'rejected'

    CHOICES = [
        (IN_PRODUCTION, 'In Production'),
        (COMPLETED, 'Completed'),
        (DELIVERED, 'Delivered'),
        (REJECTED, 'Rejected'),
    ]


class AttachmentFileType:
    PHOTO = 'photo'
    PDF = 'pdf'
    OTHER = 'other'

    CHOICES = [
        (PHOTO, 'Photo'),
        (PDF, 'PDF'),
        (OTHER, 'Other'),
    ]


# ==================== Models ====================

class SampleRequest(models.Model):
    """
    Core entity: Sample Request (樣衣請求)
    Request-based design: supports any brand workflow
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    revision = models.ForeignKey(
        'styles.StyleRevision',
        on_delete=models.CASCADE,
        related_name='sample_requests',
        help_text="Source revision (Phase 2)"
    )

    # Brand & Request Info
    brand_name = models.CharField(
        max_length=120,
        blank=True,
        help_text="Brand name (future: FK to Brand model)"
    )
    request_type = models.CharField(
        max_length=32,
        choices=SampleRequestType.CHOICES,
        default=SampleRequestType.PROTO
    )
    request_type_custom = models.CharField(
        max_length=80,
        blank=True,
        help_text="Required when request_type='custom'"
    )

    # Quantity & Specs
    quantity_requested = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Number of samples requested"
    )
    size_set_json = models.JSONField(
        default=dict,
        blank=True,
        help_text='{"sizes": ["S", "M"], "notes": "..."}'
    )
    purpose = models.TextField(
        blank=True,
        help_text="Purpose of this sample request"
    )

    # Workflow flags
    need_quote_first = models.BooleanField(
        default=False,
        help_text="Requires quote approval before execution"
    )
    priority = models.CharField(
        max_length=16,
        choices=Priority.CHOICES,
        default=Priority.NORMAL
    )
    due_date = models.DateField(
        null=True,
        blank=True
    )

    # Status
    status = models.CharField(
        max_length=24,
        choices=SampleRequestStatus.CHOICES,
        default=SampleRequestStatus.DRAFT,
        db_index=True
    )
    approval_status = models.CharField(
        max_length=16,
        choices=ApprovalStatus.CHOICES,
        default=ApprovalStatus.NA
    )

    # Notes
    notes_internal = models.TextField(blank=True)
    notes_customer = models.TextField(blank=True)

    # Brand-specific context (flexible JSON)
    brand_context_json = models.JSONField(
        default=dict,
        blank=True,
        help_text="Brand-specific custom fields"
    )

    # Metadata
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sample_requests_created'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    status_updated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sample_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['revision', 'status']),
            models.Index(fields=['brand_name', 'status']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f"{self.get_request_type_display()} - {self.brand_name or 'N/A'}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.request_type == SampleRequestType.CUSTOM and not self.request_type_custom:
            raise ValidationError({
                'request_type_custom': 'This field is required when request_type is "custom".'
            })


class SampleCostEstimate(models.Model):
    """
    Sample Quote/Estimate (樣衣報價)
    Supports multiple versions, flexible JSON breakdown
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sample_request = models.ForeignKey(
        SampleRequest,
        on_delete=models.CASCADE,
        related_name='estimates'
    )

    # Version control
    estimate_version = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Version number (starts from 1)"
    )

    # Status & Validity
    status = models.CharField(
        max_length=16,
        choices=EstimateStatus.CHOICES,
        default=EstimateStatus.DRAFT,
        db_index=True
    )
    currency = models.CharField(max_length=3, default='USD')
    valid_until = models.DateField(null=True, blank=True)

    # Cost
    estimated_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)]
    )

    # Breakdown (flexible JSON)
    breakdown_snapshot_json = models.JSONField(
        default=dict,
        help_text='{"materials": [...], "labor": [...], "overhead": [...]}'
    )

    # Provenance
    source = models.CharField(
        max_length=32,
        choices=EstimateSource.CHOICES,
        default=EstimateSource.MANUAL
    )
    source_revision_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Redundant record of source revision"
    )
    snapshot_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="SHA256 of canonical JSON"
    )

    # Metadata
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sample_cost_estimates'
        ordering = ['-estimate_version']
        unique_together = [['sample_request', 'estimate_version']]
        indexes = [
            models.Index(fields=['sample_request', 'status']),
        ]

    def __str__(self):
        return f"Estimate v{self.estimate_version} - {self.estimated_total} {self.currency}"

    def save(self, *args, **kwargs):
        # Auto-generate snapshot_hash if breakdown exists
        if self.breakdown_snapshot_json and not self.snapshot_hash:
            canonical = json.dumps(self.breakdown_snapshot_json, sort_keys=True)
            self.snapshot_hash = hashlib.sha256(canonical.encode()).hexdigest()
        super().save(*args, **kwargs)


class T2POForSample(models.Model):
    """
    T2 PO for Sample (樣品調料採購單)
    Contract document - immutable after issued
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sample_request = models.ForeignKey(
        SampleRequest,
        on_delete=models.CASCADE,
        related_name='t2pos'
    )
    estimate = models.ForeignKey(
        SampleCostEstimate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='t2pos'
    )

    # PO Info
    po_no = models.CharField(
        max_length=40,
        blank=True,
        db_index=True,
        help_text="Generated after issued"
    )
    supplier_name = models.CharField(max_length=120)

    # Status & Dates
    status = models.CharField(
        max_length=16,
        choices=T2POStatus.CHOICES,
        default=T2POStatus.DRAFT,
        db_index=True
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivery_date = models.DateField(
        null=True,
        blank=True,
        db_index=True
    )

    # Cost
    currency = models.CharField(max_length=3, default='USD')
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    notes = models.TextField(blank=True)

    # Snapshot provenance (Phase 2/3 boundary)
    source_revision_id = models.UUIDField(
        help_text="Source revision at snapshot time"
    )
    snapshot_at = models.DateTimeField(
        auto_now_add=True,
        help_text="When BOM was snapshotted"
    )
    snapshot_hash = models.CharField(
        max_length=64,
        help_text="SHA256 of canonical BOM JSON"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 't2pos_for_sample'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sample_request', 'status']),
            models.Index(fields=['supplier_name', 'status']),
            models.Index(fields=['po_no']),
            models.Index(fields=['delivery_date']),
        ]

    def __str__(self):
        return f"{self.po_no or 'DRAFT'} - {self.supplier_name}"


class T2POLineForSample(models.Model):
    """
    T2 PO Line for Sample (PO 明細)
    Snapshot fields (NO FK to BOMItem) - Phase 2/3 boundary rule
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    t2po = models.ForeignKey(
        T2POForSample,
        on_delete=models.CASCADE,
        related_name='lines'
    )

    line_no = models.IntegerField(help_text="Line number in PO")

    # Material info (snapshot)
    material_name = models.CharField(max_length=200)
    supplier_article_no = models.CharField(max_length=80, blank=True)
    uom = models.CharField(
        max_length=16,
        help_text="Unit of measure: yd, m, pcs"
    )

    # Consumption (snapshot from BOM)
    consumption_per_piece = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=0,
        help_text="Consumption per garment"
    )
    wastage_pct = models.DecimalField(
        max_digits=6,
        decimal_places=4,
        default=0,
        help_text="Wastage percentage (0.10 = 10%)"
    )

    # Quantity & Cost
    quantity_requested = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=0,
        help_text="qty × consumption × (1 + wastage)"
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=0
    )
    line_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="quantity × unit_price"
    )

    class Meta:
        db_table = 't2po_lines_for_sample'
        ordering = ['line_no']
        unique_together = [['t2po', 'line_no']]
        indexes = [
            models.Index(fields=['t2po']),
            models.Index(fields=['material_name']),
        ]

    def __str__(self):
        return f"Line {self.line_no}: {self.material_name}"


class SampleMWO(models.Model):
    """
    Sample Manufacturing Work Order (樣衣製造單)
    Historical instruction - immutable after issued
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sample_request = models.ForeignKey(
        SampleRequest,
        on_delete=models.CASCADE,
        related_name='mwos'
    )
    estimate = models.ForeignKey(
        SampleCostEstimate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # MWO Info
    mwo_no = models.CharField(
        max_length=40,
        blank=True,
        help_text="Generated after issued"
    )
    factory_name = models.CharField(max_length=120)

    # Status & Dates
    status = models.CharField(
        max_length=16,
        choices=MWOStatus.CHOICES,
        default=MWOStatus.DRAFT,
        db_index=True
    )
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(
        null=True,
        blank=True,
        db_index=True
    )

    notes = models.TextField(blank=True)

    # Snapshots (Phase 2/3 boundary)
    source_revision_id = models.UUIDField()
    snapshot_at = models.DateTimeField(auto_now_add=True)
    snapshot_hash = models.CharField(max_length=64)

    bom_snapshot_json = models.JSONField(
        default=list,
        help_text="BOM snapshot at MWO generation time"
    )
    construction_snapshot_json = models.JSONField(
        default=list,
        help_text="Construction steps snapshot"
    )
    qc_snapshot_json = models.JSONField(
        default=dict,
        blank=True,
        help_text="QC checkpoints snapshot"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sample_mwos'
        ordering = ['-created_at']
        # Phase 3: 1 request → 1 MWO (can relax in Phase 4+)
        unique_together = [['sample_request']]
        indexes = [
            models.Index(fields=['factory_name', 'status']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f"{self.mwo_no or 'DRAFT'} - {self.factory_name}"

    def save(self, *args, **kwargs):
        # Auto-generate snapshot_hash
        if not self.snapshot_hash:
            canonical = json.dumps({
                'bom': self.bom_snapshot_json,
                'construction': self.construction_snapshot_json,
                'qc': self.qc_snapshot_json
            }, sort_keys=True)
            self.snapshot_hash = hashlib.sha256(canonical.encode()).hexdigest()
        super().save(*args, **kwargs)


class Sample(models.Model):
    """
    Physical Sample (實體樣衣)
    Multiple samples can be created per request
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sample_request = models.ForeignKey(
        SampleRequest,
        on_delete=models.CASCADE,
        related_name='samples'
    )
    sample_mwo = models.ForeignKey(
        SampleMWO,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='samples'
    )

    # Physical info
    physical_ref = models.CharField(
        max_length=60,
        blank=True,
        help_text="Physical reference / package number"
    )
    quantity_made = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)]
    )

    # Status & Dates
    status = models.CharField(
        max_length=16,
        choices=SampleStatus.CHOICES,
        default=SampleStatus.IN_PRODUCTION,
        db_index=True
    )
    received_date = models.DateField(null=True, blank=True)
    delivered_date = models.DateField(
        null=True,
        blank=True,
        db_index=True
    )

    # Feedback
    customer_feedback = models.TextField(blank=True)
    fit_comments = models.TextField(blank=True)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'samples'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sample_request', 'status']),
            models.Index(fields=['delivered_date']),
        ]

    def __str__(self):
        return f"{self.physical_ref or 'Sample'} - {self.get_status_display()}"


class SampleAttachment(models.Model):
    """
    Attachments / Photos for Sample Requests or Physical Samples
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Can attach to either request or sample (at least one required)
    sample_request = models.ForeignKey(
        SampleRequest,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments'
    )
    sample = models.ForeignKey(
        Sample,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments'
    )

    # File info
    file_url = models.TextField(help_text="URL or path to file")
    file_type = models.CharField(
        max_length=24,
        choices=AttachmentFileType.CHOICES,
        default=AttachmentFileType.PHOTO
    )
    caption = models.CharField(max_length=200, blank=True)

    # Metadata
    uploaded_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sample_attachments'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.get_file_type_display()} - {self.caption or 'N/A'}"

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.sample_request and not self.sample:
            raise ValidationError(
                'At least one of sample_request or sample must be specified.'
            )
