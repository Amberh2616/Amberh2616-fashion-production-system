"""
Parsing Models - v2.2.1
AI extraction runs and draft review items
"""

from django.db import models
import uuid


class ExtractionRun(models.Model):
    """
    Tracks an AI extraction job (parsing a Tech Pack PDF)
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.CASCADE,
        related_name='extraction_runs'
    )
    style_revision = models.ForeignKey(
        'styles.StyleRevision',
        on_delete=models.CASCADE,
        related_name='extraction_runs'
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # AI results
    extracted_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Raw AI extraction results"
    )
    confidence_score = models.FloatField(null=True, blank=True)

    # Issues detected
    issues = models.JSONField(
        default=list,
        blank=True,
        help_text="List of issues/warnings from AI"
    )

    # Processing metadata
    ai_model = models.CharField(max_length=50, blank=True)
    processing_time_ms = models.IntegerField(null=True, blank=True)
    api_cost = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        null=True,
        blank=True
    )

    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'extraction_runs'
        verbose_name = 'Extraction Run'
        verbose_name_plural = 'Extraction Runs'
        ordering = ['-started_at']

    def __str__(self):
        return f"Extraction {self.id} - {self.status}"


class DraftReviewItem(models.Model):
    """
    Individual item pending human review/approval
    """
    ITEM_TYPE_CHOICES = [
        ('bom_item', 'BOM Item'),
        ('measurement', 'Measurement'),
        ('construction', 'Construction Step'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('corrected', 'Corrected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    extraction_run = models.ForeignKey(
        ExtractionRun,
        on_delete=models.CASCADE,
        related_name='review_items'
    )

    # Item info
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES)
    ai_data = models.JSONField(help_text="AI extracted data for this item")
    ai_confidence = models.FloatField()

    # Review status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # Human correction
    corrected_data = models.JSONField(
        null=True,
        blank=True,
        help_text="Human-corrected data"
    )
    correction_notes = models.TextField(blank=True)

    # Review metadata
    reviewed_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_items'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'draft_review_items'
        verbose_name = 'Draft Review Item'
        verbose_name_plural = 'Draft Review Items'
        ordering = ['item_type', '-ai_confidence']

    def __str__(self):
        return f"{self.get_item_type_display()} - {self.status}"
