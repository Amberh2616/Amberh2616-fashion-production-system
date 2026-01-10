from decimal import Decimal
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import SalesOrder, SalesOrderItem, ProductionOrder, MaterialRequirement
from .serializers import (
    SalesOrderSerializer,
    SalesOrderItemSerializer,
    ProductionOrderSerializer,
    ProductionOrderDetailSerializer,
    ProductionOrderCreateSerializer,
    MaterialRequirementSerializer,
    MaterialRequirementSimpleSerializer,
    CalculateMRPSerializer,
    GeneratePOSerializer,
)
from .services import MRPService


class SalesOrderViewSet(viewsets.ModelViewSet):
    queryset = SalesOrder.objects.all()
    serializer_class = SalesOrderSerializer


class SalesOrderItemViewSet(viewsets.ModelViewSet):
    queryset = SalesOrderItem.objects.all()
    serializer_class = SalesOrderItemSerializer


class ProductionOrderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for ProductionOrder (大貨訂單)

    Endpoints:
    - GET /production-orders/ - List all
    - POST /production-orders/ - Create new
    - GET /production-orders/{id}/ - Get detail
    - PUT/PATCH /production-orders/{id}/ - Update
    - DELETE /production-orders/{id}/ - Delete
    - POST /production-orders/{id}/calculate-mrp/ - Calculate material requirements
    - POST /production-orders/{id}/generate-po/ - Generate purchase orders
    - GET /production-orders/{id}/requirements-summary/ - Get requirements summary
    - POST /production-orders/{id}/confirm/ - Confirm order
    """
    queryset = ProductionOrder.objects.select_related(
        'style_revision__style',
        'organization'
    ).prefetch_related(
        'material_requirements'
    ).all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'customer', 'style_revision']
    search_fields = ['po_number', 'order_number', 'customer']
    ordering_fields = ['created_at', 'order_date', 'delivery_date', 'total_quantity']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductionOrderDetailSerializer
        elif self.action == 'create':
            return ProductionOrderCreateSerializer
        return ProductionOrderSerializer

    def perform_create(self, serializer):
        # Auto-set organization from first available (demo mode)
        from apps.core.models import Organization
        org = Organization.objects.first()
        serializer.save(organization=org)

    @action(detail=True, methods=['post'])
    def calculate_mrp(self, request, pk=None):
        """
        Calculate material requirements for this production order.

        POST /api/v2/production-orders/{id}/calculate-mrp/
        Body: {
            "usage_scenario_id": "uuid" (optional),
            "default_wastage_pct": 5.00 (optional)
        }
        """
        order = self.get_object()

        serializer = CalculateMRPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        usage_scenario = None
        if serializer.validated_data.get('usage_scenario_id'):
            from apps.costing.models import UsageScenario
            try:
                usage_scenario = UsageScenario.objects.get(
                    id=serializer.validated_data['usage_scenario_id']
                )
            except UsageScenario.DoesNotExist:
                return Response(
                    {'error': 'UsageScenario not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        default_wastage = serializer.validated_data.get(
            'default_wastage_pct',
            Decimal('5.00')
        )

        requirements = MRPService.calculate_requirements(
            production_order=order,
            usage_scenario=usage_scenario,
            default_wastage_pct=default_wastage
        )

        return Response({
            'message': f'Calculated {len(requirements)} material requirements',
            'requirements_count': len(requirements),
            'summary': MRPService.get_requirements_summary(order)
        })

    @action(detail=True, methods=['post'])
    def generate_po(self, request, pk=None):
        """
        Generate purchase orders from material requirements.

        POST /api/v2/production-orders/{id}/generate-po/
        Body: {
            "group_by_supplier": true (optional, default true)
        }
        """
        order = self.get_object()

        if not order.mrp_calculated:
            return Response(
                {'error': 'Please calculate MRP first'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = GeneratePOSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group_by_supplier = serializer.validated_data.get('group_by_supplier', True)

        try:
            purchase_orders = MRPService.generate_purchase_orders(
                production_order=order,
                group_by_supplier=group_by_supplier
            )

            if not purchase_orders:
                return Response({
                    'message': 'No purchase orders generated (all requirements already ordered or no items to order)',
                    'purchase_orders': []
                })

            return Response({
                'message': f'Generated {len(purchase_orders)} purchase order(s)',
                'purchase_orders': [
                    {
                        'id': str(po.id),
                        'po_number': po.po_number,
                        'supplier': po.supplier.name,
                        'total_amount': float(po.total_amount),
                        'lines_count': po.lines.count()
                    }
                    for po in purchase_orders
                ]
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def requirements_summary(self, request, pk=None):
        """
        Get summary of material requirements.

        GET /api/v2/production-orders/{id}/requirements-summary/
        """
        order = self.get_object()
        summary = MRPService.get_requirements_summary(order)
        return Response(summary)

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """
        Confirm the production order.

        POST /api/v2/production-orders/{id}/confirm/
        """
        order = self.get_object()

        if order.status != 'draft':
            return Response(
                {'error': 'Can only confirm orders in draft status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.status = 'confirmed'
        order.save(update_fields=['status'])

        return Response({
            'status': 'confirmed',
            'message': 'Production order confirmed'
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get production order statistics.

        GET /api/v2/production-orders/stats/
        """
        qs = self.get_queryset()

        from django.db.models import Sum, Count

        stats = {
            'total': qs.count(),
            'by_status': {},
            'total_quantity': qs.aggregate(
                total=Sum('total_quantity')
            )['total'] or 0,
            'total_amount': float(qs.aggregate(
                total=Sum('total_amount')
            )['total'] or 0),
        }

        # Count by status
        status_counts = qs.values('status').annotate(count=Count('id'))
        for item in status_counts:
            stats['by_status'][item['status']] = item['count']

        return Response(stats)


class MaterialRequirementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for MaterialRequirement (物料需求)

    Read-only for most operations, as requirements are calculated by MRP service.
    """
    queryset = MaterialRequirement.objects.select_related(
        'production_order',
        'bom_item',
        'purchase_order_line'
    ).all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['production_order', 'status', 'category']
    search_fields = ['material_name', 'material_name_zh', 'supplier']
    ordering_fields = ['category', 'material_name', 'total_requirement']
    ordering = ['category', 'material_name']

    def get_serializer_class(self):
        if self.action == 'list':
            return MaterialRequirementSimpleSerializer
        return MaterialRequirementSerializer

    @action(detail=True, methods=['patch'])
    def update_stock(self, request, pk=None):
        """
        Update current stock for a material requirement.

        PATCH /api/v2/material-requirements/{id}/update-stock/
        Body: {"current_stock": 100.00}
        """
        requirement = self.get_object()

        current_stock = request.data.get('current_stock')
        if current_stock is None:
            return Response(
                {'error': 'current_stock is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            requirement.current_stock = Decimal(str(current_stock))
            requirement.calculate_requirements()
            requirement.save()

            return Response({
                'id': str(requirement.id),
                'current_stock': float(requirement.current_stock),
                'order_quantity_needed': float(requirement.order_quantity_needed),
                'message': 'Stock updated'
            })
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
