from django.contrib import admin
from .models import Supplier, PurchaseOrder, POLine


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'supplier_code', 'supplier_type', 'is_active')
    list_filter = ('supplier_type', 'is_active')
    search_fields = ('name', 'supplier_code', 'contact_person')


class POLineInline(admin.TabularInline):
    model = POLine
    extra = 0
    fields = ('material_name', 'color', 'quantity', 'unit', 'unit_price', 'line_total')


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_number', 'supplier', 'status', 'po_date', 'expected_delivery', 'total_amount')
    list_filter = ('status', 'po_date')
    search_fields = ('po_number', 'supplier__name')
    inlines = [POLineInline]


@admin.register(POLine)
class POLineAdmin(admin.ModelAdmin):
    list_display = ('purchase_order', 'material_name', 'quantity', 'unit_price', 'line_total')
