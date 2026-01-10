from rest_framework import serializers
from .models import Supplier, Material, PurchaseOrder, POLine


class SupplierSerializer(serializers.ModelSerializer):
    supplier_type_display = serializers.CharField(source='get_supplier_type_display', read_only=True)

    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ['organization']


class SupplierSimpleSerializer(serializers.ModelSerializer):
    """Simplified supplier for dropdown/references"""
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'supplier_code', 'supplier_type']


class MaterialSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Material
        fields = '__all__'
        read_only_fields = ['organization']


class MaterialSimpleSerializer(serializers.ModelSerializer):
    """Simplified material for dropdown/references"""
    class Meta:
        model = Material
        fields = ['id', 'article_no', 'name', 'name_zh', 'unit', 'unit_price']


class POLineSerializer(serializers.ModelSerializer):
    material_article_no = serializers.CharField(source='material.article_no', read_only=True)

    class Meta:
        model = POLine
        fields = '__all__'


class POLineDetailSerializer(serializers.ModelSerializer):
    """Detailed line serializer with material info"""
    material_article_no = serializers.CharField(source='material.article_no', read_only=True)
    material_name_zh = serializers.CharField(source='material.name_zh', read_only=True)

    class Meta:
        model = POLine
        fields = '__all__'


class PurchaseOrderSerializer(serializers.ModelSerializer):
    """List serializer - minimal lines info"""
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    po_type_display = serializers.CharField(source='get_po_type_display', read_only=True)
    lines_count = serializers.IntegerField(source='lines.count', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['organization', 'status', 'total_amount', 'actual_delivery', 'created_by']


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    """Detail serializer - full lines info"""
    lines = POLineDetailSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_data = SupplierSimpleSerializer(source='supplier', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    po_type_display = serializers.CharField(source='get_po_type_display', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['organization', 'status', 'total_amount', 'actual_delivery', 'created_by']
