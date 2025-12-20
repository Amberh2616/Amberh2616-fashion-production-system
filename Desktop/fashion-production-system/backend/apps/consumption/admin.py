from django.contrib import admin
from .models import OrderItemBOM, MarkerReport, TrimMeasurement


@admin.register(OrderItemBOM)
class OrderItemBOMAdmin(admin.ModelAdmin):
    list_display = (
        'order_item',
        'template_bom_item',
        'consumption_per_piece',
        'consumption_maturity',
        'total_consumption'
    )
    list_filter = ('consumption_maturity', 'source')
    search_fields = ('template_bom_item__material_name',)
    readonly_fields = ('id', 'created_at', 'updated_at')


@admin.register(MarkerReport)
class MarkerReportAdmin(admin.ModelAdmin):
    list_display = (
        'order_item',
        'marker_date',
        'consumption_per_piece',
        'unit',
        'efficiency'
    )
    list_filter = ('marker_date',)
    readonly_fields = ('id', 'created_at')


@admin.register(TrimMeasurement)
class TrimMeasurementAdmin(admin.ModelAdmin):
    list_display = (
        'bom_item',
        'measurement_point',
        'measured_value',
        'calculated_consumption',
        'measured_at'
    )
    list_filter = ('applied_rule_id', 'measured_at')
    readonly_fields = ('id', 'measured_at')
