"""
Costing Views
"""

from decimal import Decimal
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.styles.models import StyleRevision, BOMItem
from .models import CostSheet, CostLine
from .serializers import (
    CostSheetDetailSerializer,
    CostSheetListSerializer,
    CostSheetCreateSerializer,
    CostSheetUpdateSerializer,
)


@api_view(['GET', 'POST'])
def cost_sheets_list_create(request, revision_id):
    """
    List or Create CostSheets for a revision

    GET /api/v2/revisions/{revision_id}/cost-sheets/
    - Query params: costing_type, is_current
    - Returns: List of CostSheets

    POST /api/v2/revisions/{revision_id}/cost-sheets/
    - Generate new CostSheet version from current BOM
    - Returns: Created CostSheet with nested lines
    """
    # Validate revision exists
    try:
        revision = StyleRevision.objects.get(id=revision_id)
    except StyleRevision.DoesNotExist:
        return Response(
            {'error': 'Style Revision not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        # LIST operation
        queryset = CostSheet.objects.filter(revision=revision)

        # Filter by costing_type if provided
        costing_type = request.query_params.get('costing_type')
        if costing_type in ['sample', 'bulk']:
            queryset = queryset.filter(costing_type=costing_type)

        # Filter by is_current if provided
        is_current = request.query_params.get('is_current')
        if is_current is not None:
            is_current_bool = is_current.lower() == 'true'
            queryset = queryset.filter(is_current=is_current_bool)

        serializer = CostSheetListSerializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })

    # POST operation - CREATE
    # Validate input
    serializer = CostSheetCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    validated_data = serializer.validated_data
    costing_type = validated_data['costing_type']

    # Get BOM items
    bom_items = BOMItem.objects.filter(revision=revision).order_by('item_number')

    if not bom_items.exists():
        return Response(
            {'error': 'No BOM items found for this revision. Please create BOM first.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Micro-adjustment #3: Use transaction to prevent multiple is_current=true
    with transaction.atomic():
        # 1. Get next version number
        next_version = CostSheet.get_next_version_no(revision, costing_type)

        # 2. Set old versions to is_current=false
        CostSheet.objects.filter(
            revision=revision,
            costing_type=costing_type,
            is_current=True
        ).update(is_current=False)

        # 3. Create new CostSheet
        cost_sheet = CostSheet.objects.create(
            revision=revision,
            costing_type=costing_type,
            version_no=next_version,
            is_current=True,
            labor_cost=validated_data.get('labor_cost', Decimal('0.00')),
            overhead_cost=validated_data.get('overhead_cost', Decimal('0.00')),
            freight_cost=validated_data.get('freight_cost', Decimal('0.00')),
            packaging_cost=validated_data.get('packaging_cost', Decimal('0.00')),
            testing_cost=validated_data.get('testing_cost', Decimal('0.00')),
            margin_pct=validated_data.get('margin_pct', Decimal('30.00')),
            wastage_pct=validated_data.get('wastage_pct', Decimal('5.00')),
            notes=validated_data.get('notes', ''),
            # Calculated fields will be set by calculate_totals()
            material_cost=Decimal('0.0000'),
            total_cost=Decimal('0.0000'),
            unit_price=Decimal('0.0000'),
        )

        # 4. Create CostLine snapshots for each BOMItem
        for idx, bom_item in enumerate(bom_items):
            # Snapshot current BOM values
            consumption = bom_item.consumption or Decimal('0.0000')
            unit_price = bom_item.unit_price or Decimal('0.0000')

            # Calculate line_cost with wastage
            # Micro-adjustment #1: Use Decimal + quantize
            line_cost = CostLine.calculate_line_cost(
                consumption=consumption,
                unit_price=unit_price,
                wastage_pct=cost_sheet.wastage_pct
            )

            # Create snapshot
            CostLine.objects.create(
                cost_sheet=cost_sheet,
                bom_item=bom_item,
                # Snapshot values
                material_name=bom_item.material_name or '',
                supplier=bom_item.supplier or '',
                category=bom_item.category or 'trim',
                unit=bom_item.unit or 'PCS',
                consumption=consumption,
                unit_price=unit_price,
                line_cost=line_cost,
                # Micro-adjustment #2: Independent sort_order
                sort_order=idx,
            )

        # 5. Calculate totals
        # Micro-adjustment #1: Uses Decimal + quantize internally
        cost_sheet.calculate_totals()
        cost_sheet.save()

    # 6. Return serialized response with nested lines
    response_serializer = CostSheetDetailSerializer(cost_sheet)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PATCH'])
def cost_sheet_detail_update(request, cost_sheet_id):
    """
    Get or Update a CostSheet

    GET /api/v2/cost-sheets/{cost_sheet_id}/
    - Returns: CostSheet with nested lines

    PATCH /api/v2/cost-sheets/{cost_sheet_id}/
    - Updates summary fields (labor, overhead, etc.)
    - Phase 1: Only allows updating summary fields, not lines
    - After update, automatically recalculates totals
    """
    try:
        cost_sheet = CostSheet.objects.prefetch_related('lines').get(id=cost_sheet_id)
    except CostSheet.DoesNotExist:
        return Response(
            {'error': 'CostSheet not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        # DETAIL operation
        serializer = CostSheetDetailSerializer(cost_sheet)
        return Response(serializer.data)

    # PATCH operation - UPDATE
    serializer = CostSheetUpdateSerializer(cost_sheet, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Save changes
    serializer.save()

    # Recalculate totals (material_cost unchanged, but total_cost and unit_price may change)
    cost_sheet.calculate_totals()
    cost_sheet.save()

    # Return full detail
    response_serializer = CostSheetDetailSerializer(cost_sheet)
    return Response(response_serializer.data)
