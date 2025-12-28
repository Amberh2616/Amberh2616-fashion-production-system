"""
Styles Models - v2.2.1
Style-centric design: Style → StyleRevision → BOMItem/Measurement/ConstructionStep
"""

from django.db import models
import uuid


class Style(models.Model):
    """
    Core entity representing a garment style (款式)
    One Style can have multiple revisions (Rev A, Rev B, etc.)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='styles'
    )

    # Basic info
    style_number = models.CharField(
        max_length=50,
        db_index=True,
        help_text="e.g., LW1FLPS"
    )
    style_name = models.CharField(
        max_length=200,
        help_text="e.g., Nulu Cami Tank"
    )
    season = models.CharField(max_length=50, blank=True)
    customer = models.CharField(max_length=100, blank=True)

    # Current version tracking
    current_revision = models.ForeignKey(
        'StyleRevision',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='+'
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_styles'
    )

    class Meta:
        db_table = 'styles'
        verbose_name = 'Style'
        verbose_name_plural = 'Styles'
        unique_together = [['organization', 'style_number']]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.style_number} - {self.style_name}"


class StyleRevision(models.Model):
    """
    A specific revision of a Style (e.g., Rev A, Rev B)
    Each revision has its own BOM, measurements, construction steps
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('approved', 'Approved'),
        ('in_production', 'In Production'),
        ('archived', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    style = models.ForeignKey(
        Style,
        on_delete=models.CASCADE,
        related_name='revisions'
    )

    # Revision info
    revision_label = models.CharField(
        max_length=20,
        help_text="e.g., Rev A, Rev B, PP"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )

    # Notes and changes
    notes = models.TextField(blank=True)
    changes_from_previous = models.JSONField(
        null=True,
        blank=True,
        help_text="AI-detected changes from previous revision"
    )

    # Draft vs Verified (D-011: AI outputs go to draft, human review writes to verified)
    # Verified data: BOMItem/Measurement/ConstructionStep tables (related objects)
    # Draft data: JSON fields below (AI raw outputs)
    draft_bom_data = models.JSONField(
        null=True,
        blank=True,
        help_text="AI-extracted BOM data (draft, pending review)"
    )
    draft_measurement_data = models.JSONField(
        null=True,
        blank=True,
        help_text="AI-extracted measurement data (draft, pending review)"
    )
    draft_construction_data = models.JSONField(
        null=True,
        blank=True,
        help_text="AI-extracted construction data (draft, pending review)"
    )

    # Previous revision link
    previous_revision = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='next_revisions'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_revisions'
    )

    class Meta:
        db_table = 'style_revisions'
        verbose_name = 'Style Revision'
        verbose_name_plural = 'Style Revisions'
        unique_together = [['style', 'revision_label']]
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.style.style_number} {self.revision_label}"


class BOMItem(models.Model):
    """
    BOM Item (template level) - attached to StyleRevision
    Represents a material/component in the style's bill of materials
    """
    CATEGORY_CHOICES = [
        ('fabric', 'Fabric'),
        ('trim', 'Trim'),
        ('label', 'Label'),
        ('packaging', 'Packaging'),
    ]

    CONSUMPTION_MATURITY_CHOICES = [
        ('unknown', 'Unknown'),
        ('pre_estimate', 'Pre-Estimate'),
        ('confirmed', 'Confirmed'),
        ('locked', 'Locked'),
    ]

    TRANSLATION_STATUS_CHOICES = [
        ('pending', 'Pending Translation'),
        ('confirmed', 'Translation Confirmed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    revision = models.ForeignKey(
        StyleRevision,
        on_delete=models.CASCADE,
        related_name='bom_items'
    )

    # Item info
    item_number = models.IntegerField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    material_name = models.CharField(max_length=200)
    supplier = models.CharField(max_length=100, blank=True)
    supplier_article_no = models.CharField(
        max_length=100,
        blank=True,
        help_text="Supplier's article/material number (key for procurement)"
    )
    color = models.CharField(max_length=100, blank=True)
    color_code = models.CharField(max_length=50, blank=True)

    # Material status (approval status from supplier/quality)
    material_status = models.CharField(
        max_length=100,
        blank=True,
        help_text="e.g., Approved, Approved with Limitations, Pending, etc."
    )

    # Consumption (template level)
    consumption = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Consumption per piece"
    )
    consumption_maturity = models.CharField(
        max_length=20,
        choices=CONSUMPTION_MATURITY_CHOICES,
        default='unknown'
    )
    unit = models.CharField(max_length=20, help_text="e.g., yards, meters, pcs")

    # Placement (JSONField for SQLite compatibility)
    placement = models.JSONField(
        default=list,
        blank=True,
        help_text="List of placements, e.g., ['body', 'sleeve']"
    )

    # Wastage
    wastage_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=5.00,
        help_text="Wastage percentage"
    )

    # Pricing (optional at template level)
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )

    # Lead time
    leadtime_days = models.IntegerField(
        null=True,
        blank=True,
        help_text="Total lead time in days"
    )

    # AI extraction metadata
    ai_confidence = models.FloatField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    # Phase 2-1: Verification tracking (who & when)
    verified_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_bom_items'
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    # Phase 2-1: Translation status tracking
    translation_status = models.CharField(
        max_length=20,
        choices=TRANSLATION_STATUS_CHOICES,
        default='pending',
        help_text="Translation confirmation status"
    )

    class Meta:
        db_table = 'bom_items'
        verbose_name = 'BOM Item'
        verbose_name_plural = 'BOM Items'
        ordering = ['item_number']

    def __str__(self):
        return f"{self.revision} - {self.item_number}. {self.material_name}"


class Measurement(models.Model):
    """
    Measurement specification point for a StyleRevision
    """
    TRANSLATION_STATUS_CHOICES = [
        ('pending', 'Pending Translation'),
        ('confirmed', 'Translation Confirmed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    revision = models.ForeignKey(
        StyleRevision,
        on_delete=models.CASCADE,
        related_name='measurements'
    )

    # Measurement point
    point_name = models.CharField(max_length=100)
    point_code = models.CharField(max_length=20, blank=True)

    # Size values (JSON: {"XS": 40.0, "S": 42.0, "M": 44.0, ...})
    values = models.JSONField()

    # Tolerances
    tolerance_plus = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.5
    )
    tolerance_minus = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0.5
    )
    unit = models.CharField(max_length=10, default='cm')

    # AI extraction metadata
    ai_confidence = models.FloatField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    # Phase 2-1: Verification tracking (who & when)
    verified_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_measurements'
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    # Phase 2-1: Translation status tracking
    translation_status = models.CharField(
        max_length=20,
        choices=TRANSLATION_STATUS_CHOICES,
        default='pending',
        help_text="Translation confirmation status"
    )

    class Meta:
        db_table = 'measurements'
        verbose_name = 'Measurement'
        verbose_name_plural = 'Measurements'
        ordering = ['point_name']

    def __str__(self):
        return f"{self.revision} - {self.point_name}"


class ConstructionStep(models.Model):
    """
    Construction/sewing instructions for a StyleRevision
    """
    TRANSLATION_STATUS_CHOICES = [
        ('pending', 'Pending Translation'),
        ('confirmed', 'Translation Confirmed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    revision = models.ForeignKey(
        StyleRevision,
        on_delete=models.CASCADE,
        related_name='construction_steps'
    )

    step_number = models.IntegerField()
    description = models.TextField()
    stitch_type = models.CharField(max_length=50, blank=True)
    machine_type = models.CharField(max_length=100, blank=True)

    # AI extraction metadata
    ai_confidence = models.FloatField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    # Phase 2-1: Verification tracking (who & when)
    verified_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_construction_steps'
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    # Phase 2-1: Translation status tracking
    translation_status = models.CharField(
        max_length=20,
        choices=TRANSLATION_STATUS_CHOICES,
        default='pending',
        help_text="Translation confirmation status"
    )

    class Meta:
        db_table = 'construction_steps'
        verbose_name = 'Construction Step'
        verbose_name_plural = 'Construction Steps'
        ordering = ['step_number']

    def __str__(self):
        return f"{self.revision} - Step {self.step_number}"
