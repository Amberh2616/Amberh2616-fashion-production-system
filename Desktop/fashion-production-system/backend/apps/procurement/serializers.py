from rest_framework import serializers
from .models import Supplier, PurchaseOrder, POLine


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'


class POLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = POLine
        fields = '__all__'


class PurchaseOrderSerializer(serializers.ModelSerializer):
    lines = POLineSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
