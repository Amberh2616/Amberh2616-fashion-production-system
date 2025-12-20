from rest_framework import viewsets
from .models import Supplier, PurchaseOrder, POLine
from .serializers import (
    SupplierSerializer,
    PurchaseOrderSerializer,
    POLineSerializer
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer


class POLineViewSet(viewsets.ModelViewSet):
    queryset = POLine.objects.all()
    serializer_class = POLineSerializer
