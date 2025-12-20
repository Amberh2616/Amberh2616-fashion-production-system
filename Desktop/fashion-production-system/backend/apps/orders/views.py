from rest_framework import viewsets
from .models import SalesOrder, SalesOrderItem
from .serializers import SalesOrderSerializer, SalesOrderItemSerializer


class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.all()
    serializer_class = SalesOrderSerializer


class SalesOrderItemViewSet(viewsets.ModelViewSet):
    queryset = SalesOrderItem.objects.all()
    serializer_class = SalesOrderItemSerializer
