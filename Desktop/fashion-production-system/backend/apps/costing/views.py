"""
Costing Views
Phase 2-2I: 版本策略 API
"""

from decimal import Decimal
from django.db import transaction
from django.db.models import Max
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.styles.models import StyleRevision, BOMItem
from .models import CostSheet, CostLine
from .serializers import (
    CostSheetDetailSerializer,
    CostSheetListSerializer,
    CostSheetCreateSerializer,
    CostSheetPatchSerializer,
    CostSheetDuplicateSerializer,
)
from .utils import calc_line_cost, calc_totals


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

        # 3. Create new CostSheet (Phase 2-2I: 加入 created_by, status)
        user = request.user if request.user.is_authenticated else None
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
            # Phase 2-2I: 狀態與審計
            status='draft',
            created_by=user,
            updated_by=user,
            # Calculated fields will be set by calculate_totals()
            material_cost=Decimal('0.0000'),
            total_cost=Decimal('0.0000'),
            unit_price=Decimal('0.0000'),
        )

        # 4. Create CostLine snapshots for each BOMItem (Phase 2-2I: 使用 services.py)
        for idx, bom_item in enumerate(bom_items):
            # Snapshot current BOM values
            consumption = bom_item.consumption or Decimal('0.0000')
            unit_price_val = bom_item.unit_price or Decimal('0.0000')

            # Calculate line_cost with wastage (統一計算邏輯)
            line_cost = calc_line_cost(
                consumption=consumption,
                unit_price=unit_price_val,
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
                unit_price=unit_price_val,
                line_cost=line_cost,
                # Micro-adjustment #2: Independent sort_order
                sort_order=idx,
            )

        # 5. Calculate totals (Phase 2-2I: 使用 services.py 統一計算)
        line_costs = [line.line_cost for line in CostLine.objects.filter(cost_sheet=cost_sheet)]
        material_cost, total_cost, unit_price_calc = calc_totals(
            line_costs=line_costs,
            labor=Decimal(cost_sheet.labor_cost),
            overhead=Decimal(cost_sheet.overhead_cost),
            freight=Decimal(cost_sheet.freight_cost),
            packaging=Decimal(cost_sheet.packaging_cost),
            testing=Decimal(cost_sheet.testing_cost),
            margin_pct=Decimal(cost_sheet.margin_pct),
        )
        cost_sheet.material_cost = material_cost
        cost_sheet.total_cost = total_cost
        cost_sheet.unit_price = unit_price_calc
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

    # PATCH operation - UPDATE (Phase 2-2I: Guard Rules + services.py)
    serializer = CostSheetPatchSerializer(cost_sheet, data=request.data, partial=True)
    if not serializer.is_valid():
        # Check for version policy violation (409 Conflict)
        if "version_policy" in serializer.errors:
            return Response(
                {
                    "error": "VERSION_POLICY_VIOLATION",
                    "message": serializer.errors["version_policy"][0],
                    "details": serializer.errors,
                },
                status=status.HTTP_409_CONFLICT
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Save changes (只有 A-fields)
    user = request.user if request.user.is_authenticated else None
    cost_sheet = serializer.save(updated_by=user)

    # Recalculate totals using existing snapshot lines (Phase 2-2I: services.py)
    line_qs = CostLine.objects.filter(cost_sheet=cost_sheet).order_by('sort_order')
    line_costs = [Decimal(line.line_cost) for line in line_qs]

    material_cost, total_cost, unit_price_calc = calc_totals(
        line_costs=line_costs,
        labor=Decimal(cost_sheet.labor_cost),
        overhead=Decimal(cost_sheet.overhead_cost),
        freight=Decimal(cost_sheet.freight_cost),
        packaging=Decimal(cost_sheet.packaging_cost),
        testing=Decimal(cost_sheet.testing_cost),
        margin_pct=Decimal(cost_sheet.margin_pct),
    )

    cost_sheet.material_cost = material_cost
    cost_sheet.total_cost = total_cost
    cost_sheet.unit_price = unit_price_calc
    cost_sheet.save(update_fields=['material_cost', 'total_cost', 'unit_price', 'updated_at', 'updated_by'])

    # Return full detail
    response_serializer = CostSheetDetailSerializer(cost_sheet)
    return Response(response_serializer.data)


@api_view(['POST'])
def cost_sheet_duplicate(request, cost_sheet_id):
    """
    Duplicate CostSheet with new margin/wastage (Version Policy B-fields)

    POST /api/v2/cost-sheets/{cost_sheet_id}/duplicate/
    - Creates new version with same CostLines (not rebuilding from BOM)
    - Applies new margin_pct and wastage_pct
    - Recalculates line_cost for each line with new wastage
    - Recalculates totals with new margin
    - Sets is_current=true for new version, false for old

    Use case: Pure negotiation (same BOM snapshot, different pricing stance)
    """
    # Get source CostSheet
    try:
        source_sheet = CostSheet.objects.prefetch_related('lines').get(id=cost_sheet_id)
    except CostSheet.DoesNotExist:
        return Response(
            {'error': 'CostSheet not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validate input
    serializer = CostSheetDuplicateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    validated_data = serializer.validated_data
    new_margin = Decimal(validated_data['margin_pct'])
    new_wastage = Decimal(validated_data['wastage_pct'])
    new_notes = validated_data.get('notes', '')

    # Use transaction to prevent multiple is_current=true
    with transaction.atomic():
        # 1. Get next version number
        next_version = CostSheet.get_next_version_no(
            source_sheet.revision,
            source_sheet.costing_type
        )

        # 2. Set old versions to is_current=false
        CostSheet.objects.filter(
            revision=source_sheet.revision,
            costing_type=source_sheet.costing_type,
            is_current=True
        ).update(is_current=False)

        # 3. Create new CostSheet (copy A-fields from source, use new B-fields)
        user = request.user if request.user.is_authenticated else None
        new_sheet = CostSheet.objects.create(
            revision=source_sheet.revision,
            costing_type=source_sheet.costing_type,
            version_no=next_version,
            is_current=True,
            # Copy A-fields from source
            labor_cost=source_sheet.labor_cost,
            overhead_cost=source_sheet.overhead_cost,
            freight_cost=source_sheet.freight_cost,
            packaging_cost=source_sheet.packaging_cost,
            testing_cost=source_sheet.testing_cost,
            # Use new B-fields
            margin_pct=new_margin,
            wastage_pct=new_wastage,
            notes=new_notes,
            # Status & audit
            status='draft',
            created_by=user,
            updated_by=user,
            # Calculated fields (will be set below)
            material_cost=Decimal('0.0000'),
            total_cost=Decimal('0.0000'),
            unit_price=Decimal('0.0000'),
        )

        # 4. Copy CostLines from source (keep same snapshot, recalculate line_cost with new wastage)
        source_lines = source_sheet.lines.all().order_by('sort_order')
        for line in source_lines:
            # Recalculate line_cost with new wastage
            new_line_cost = calc_line_cost(
                consumption=line.consumption,
                unit_price=line.unit_price,
                wastage_pct=new_wastage
            )

            # Create new line
            CostLine.objects.create(
                cost_sheet=new_sheet,
                bom_item=line.bom_item,
                # Copy snapshot values
                material_name=line.material_name,
                supplier=line.supplier,
                category=line.category,
                unit=line.unit,
                consumption=line.consumption,
                unit_price=line.unit_price,
                # New calculated value
                line_cost=new_line_cost,
                sort_order=line.sort_order,
            )

        # 5. Calculate totals with new margin
        new_lines = CostLine.objects.filter(cost_sheet=new_sheet).order_by('sort_order')
        line_costs = [Decimal(line.line_cost) for line in new_lines]

        material_cost, total_cost, unit_price_calc = calc_totals(
            line_costs=line_costs,
            labor=Decimal(new_sheet.labor_cost),
            overhead=Decimal(new_sheet.overhead_cost),
            freight=Decimal(new_sheet.freight_cost),
            packaging=Decimal(new_sheet.packaging_cost),
            testing=Decimal(new_sheet.testing_cost),
            margin_pct=new_margin,
        )

        new_sheet.material_cost = material_cost
        new_sheet.total_cost = total_cost
        new_sheet.unit_price = unit_price_calc
        new_sheet.save()

    # 6. Return serialized response
    response_serializer = CostSheetDetailSerializer(new_sheet)
    return Response(response_serializer.data, status=status.HTTP_201_CREATED)
