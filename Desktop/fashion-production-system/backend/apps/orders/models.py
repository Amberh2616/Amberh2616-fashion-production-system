"""
Orders Models - v2.2.1
Sales orders and order items
"""

from django.db import models
import uuid

from apps.core.managers import TenantManager


class SalesOrder(models.Model):
    """
    Sales order from customer
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('in_production', 'In Production'),
        ('shipped', 'Shipped'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        'core.Organization',
        on_delete=models.CASCADE,
        related_name='sales_orders'
    )

    # Order info
    # SaaS-Ready: Changed from unique=True to unique_together with organization
    order_number = models.CharField(max_length=50, db_index=True)
    customer = models.CharField(max_length=200)
    po_number = models.CharField(max_length=100, blank=True)

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )

    # Dates
    order_date = models.DateField()
    delivery_date = models.DateField()

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sales_orders'
        verbose_name = 'Sales Order'
        verbose_name_plural = 'Sales Orders'
        ordering = ['-created_at']
        # SaaS-Ready: Order number unique within organization only
        unique_together = [['organization', 'order_number']]

    # SaaS-Ready: Tenant-aware manager
    objects = TenantManager()

    def __str__(self):
        return f"{self.order_number} - {self.customer}"


class SalesOrderItem(models.Model):
    """
    Line item in a sales order (Style + Quantity + Size breakdown)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sales_order = models.ForeignKey(
        SalesOrder,
        on_delete=models.CASCADE,
        related_name='items'
    )
    style_revision = models.ForeignKey(
        'styles.StyleRevision',
        on_delete=models.PROTECT,
        related_name='order_items'
    )

    # Quantities
    total_quantity = models.IntegerField()
    size_breakdown = models.JSONField(
        help_text='{"XS": 100, "S": 200, "M": 300, ...}'
    )

    # Pricing
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = 'sales_order_items'
        verbose_name = 'Sales Order Item'
        verbose_name_plural = 'Sales Order Items'

    def __str__(self):
        return f"{self.sales_order.order_number} - {self.style_revision}"
