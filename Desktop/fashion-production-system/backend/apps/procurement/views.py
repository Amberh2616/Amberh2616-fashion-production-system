from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db.models import Sum, Count
from .models import Supplier, Material, PurchaseOrder, POLine
from .serializers import (
    SupplierSerializer,
    MaterialSerializer,
    PurchaseOrderSerializer,
    PurchaseOrderDetailSerializer,
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
    queryset = PurchaseOrder.objects.select_related('supplier').prefetch_related('lines').all()
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['status', 'po_type', 'supplier']
    search_fields = ['po_number', 'supplier__name']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return PurchaseOrderDetailSerializer
        return PurchaseOrderSerializer

    # Status transition: draft → sent
    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        po = self.get_object()
        if po.status != 'draft':
            return Response(
                {'error': 'Can only send PO in draft status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        po.status = 'sent'
        po.save()
        return Response({'status': 'sent', 'message': 'PO sent to supplier'})

    # Status transition: sent → confirmed
    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        po = self.get_object()
        if po.status != 'sent':
            return Response(
                {'error': 'Can only confirm PO in sent status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        po.status = 'confirmed'
        po.save()
        return Response({'status': 'confirmed', 'message': 'PO confirmed by supplier'})

    # Status transition: confirmed → partial_received / received
    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        po = self.get_object()
        if po.status not in ['confirmed', 'partial_received']:
            return Response(
                {'error': 'Can only receive PO in confirmed or partial_received status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if all lines are fully received
        lines = po.lines.all()
        all_received = all(line.quantity_received >= line.quantity for line in lines)

        if all_received:
            po.status = 'received'
            po.actual_delivery = timezone.now().date()
        else:
            po.status = 'partial_received'
        po.save()
        return Response({'status': po.status, 'message': f'PO status updated to {po.status}'})

    # Status transition: any → cancelled
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        po = self.get_object()
        if po.status in ['received', 'cancelled']:
            return Response(
                {'error': 'Cannot cancel PO that is already received or cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        po.status = 'cancelled'
        po.save()
        return Response({'status': 'cancelled', 'message': 'PO cancelled'})

    # Dashboard statistics
    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self.get_queryset()
        stats = {
            'total': qs.count(),
            'by_status': {},
            'total_amount': qs.aggregate(total=Sum('total_amount'))['total'] or 0,
        }
        # Count by status
        status_counts = qs.values('status').annotate(count=Count('id'))
        for item in status_counts:
            stats['by_status'][item['status']] = item['count']
        return Response(stats)


class POLineViewSet(viewsets.ModelViewSet):
    queryset = POLine.objects.select_related('purchase_order', 'material').all()
    serializer_class = POLineSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['purchase_order']

    # Update quantity received
    @action(detail=True, methods=['post'])
    def update_received(self, request, pk=None):
        line = self.get_object()
        quantity = request.data.get('quantity_received')
        if quantity is None:
            return Response(
                {'error': 'quantity_received is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        line.quantity_received = quantity
        line.save()
        return Response({
            'id': str(line.id),
            'quantity_received': str(line.quantity_received),
            'message': 'Quantity received updated'
        })
