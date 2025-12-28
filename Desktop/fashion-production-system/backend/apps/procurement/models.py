"""
Procurement Models - v2.2.1
Purchase orders, suppliers
"""

from django.db import models
import uuid


class Supplier(models.Model):
    """
    Supplier/vendor information
    """
    SUPPLIER_TYPE_CHOICES = [
        ('fabric', 'Fabric Supplier'),
        ('trim', 'Trim Supplier'),
        ('label', 'Label Supplier'),
        ('packaging', 'Packaging Supplier'),
        ('factory', 'Garment Factory'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='suppliers'
    )

    # Basic info
    name = models.CharField(max_length=200)
    supplier_code = models.CharField(max_length=50, blank=True)
    supplier_type = models.CharField(max_length=50, choices=SUPPLIER_TYPE_CHOICES)

    # Contact
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)

    # Terms
    payment_terms = models.CharField(max_length=100, blank=True)
    lead_time_days = models.IntegerField(null=True, blank=True)

    # Status
    is_active = models.BooleanField(default=True)

    # Metadata
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'suppliers'
        verbose_name = 'Supplier'
        verbose_name_plural = 'Suppliers'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_supplier_type_display()})"


class PurchaseOrder(models.Model):
    """
    Purchase order to supplier
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('confirmed', 'Confirmed'),
        ('partial_received', 'Partial Received'),
        ('received', 'Received'),
        ('cancelled', 'Cancelled'),
    ]

    PO_TYPE_CHOICES = [
        ('rfq', 'RFQ (Request for Quotation)'),
        ('production', 'Production PO'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='purchase_orders'
    )

    # PO info
    po_number = models.CharField(max_length=50, unique=True, db_index=True)
    po_type = models.CharField(
        max_length=20,
        choices=PO_TYPE_CHOICES,
        default='rfq',
        help_text="RFQ allows pre_estimate/confirmed/locked; Production requires confirmed/locked only"
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.PROTECT,
        related_name='purchase_orders'
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )

    # Dates
    po_date = models.DateField()
    expected_delivery = models.DateField()
    actual_delivery = models.DateField(null=True, blank=True)

    # Totals
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    # Metadata
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'core.User',
        on_delete=models.SET_NULL,
        null=True
    )

    class Meta:
        db_table = 'purchase_orders'
        verbose_name = 'Purchase Order'
        verbose_name_plural = 'Purchase Orders'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.po_number} - {self.supplier.name}"


class POLine(models.Model):
    """
    Line item in a purchase order
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name='lines'
    )

    # Material reference
    order_item_bom = models.ForeignKey(
        'consumption.OrderItemBOM',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        help_text="Link to OrderItemBOM if this PO is for a specific order"
    )

    # Item details
    material_name = models.CharField(max_length=200)
    color = models.CharField(max_length=100, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=4)
    unit = models.CharField(max_length=20)

    # Pricing
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    # Delivery
    quantity_received = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        default=0
    )

    class Meta:
        db_table = 'po_lines'
        verbose_name = 'PO Line'
        verbose_name_plural = 'PO Lines'

    def __str__(self):
        return f"{self.purchase_order.po_number} - {self.material_name}"
