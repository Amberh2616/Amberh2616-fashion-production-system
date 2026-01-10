from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Supplier, Material, PurchaseOrder, POLine
from .serializers import (
    SupplierSerializer,
    MaterialSerializer,
    PurchaseOrderSerializer,
    POLineSerializer
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['supplier_type', 'is_active']
    search_fields = ['name', 'supplier_code']


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.select_related('supplier').all()
    serializer_class = MaterialSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['category', 'supplier', 'status', 'is_active']
    search_fields = ['article_no', 'name', 'name_zh', 'color']


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer


class POLineViewSet(viewsets.ModelViewSet):
    queryset = POLine.objects.all()
    serializer_class = POLineSerializer
