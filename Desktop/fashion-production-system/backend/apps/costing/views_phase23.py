"""
Phase 2-3 API Views
ViewSets for Three-Layer Separation Architecture
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404

from .models import (
    UsageScenario,
    UsageLine,
    CostSheetGroup,
    CostSheetVersion,
    CostLineV2
)
from .serializers_phase23 import (
    UsageScenarioListSerializer,
    UsageScenarioDetailSerializer,
    UsageLineSerializer,
    CostSheetGroupSerializer,
    CostSheetVersionListSerializer,
    CostSheetVersionDetailSerializer,
    CostLineV2Serializer,
)
from .services import UsageScenarioService, CostingService


class UsageScenarioViewSet(viewsets.ModelViewSet):
    """
    UsageScenario CRUD + Clone action

    Endpoints:
    - GET /api/v2/usage-scenarios/ - List scenarios
    - POST /api/v2/usage-scenarios/ - Create scenario
    - GET /api/v2/usage-scenarios/{id}/ - Retrieve scenario
    - PATCH /api/v2/usage-scenarios/{id}/ - Update scenario summary
    - POST /api/v2/usage-scenarios/{id}/clone/ - Clone scenario
    """

    queryset = UsageScenario.objects.select_related(
        'revision',
        'created_by'
    ).prefetch_related('usage_lines')
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_serializer_class(self):
        if self.action == 'list':
            return UsageScenarioListSerializer
        return UsageScenarioDetailSerializer

    def get_queryset(self):
        """Filter by query params"""
        queryset = self.queryset

        # Filter by revision
        revision_id = self.request.query_params.get('revision_id')
        if revision_id:
            queryset = queryset.filter(revision_id=revision_id)

        # Filter by purpose
        purpose = self.request.query_params.get('purpose')
        if purpose:
            queryset = queryset.filter(purpose=purpose)

        return queryset

    def create(self, request, *args, **kwargs):
        """
        Create UsageScenario via Service

        Payload:
        {
            "revision_id": "uuid",
            "purpose": "sample_quote|bulk_quote|...",
            "wastage_pct": 5.0,
            "rounding_rule": "round_up",
            "notes": "",
            "bom_items": [  // optional, if not provided, use all BOM items
                {
                    "bom_item_id": "uuid",
                    "consumption": 1.5,
                    "consumption_unit": "yards",
                    "consumption_status": "confirmed"
                }
            ]
        }
        """
        from apps.styles.models import StyleRevision

        revision_id = request.data.get('revision_id')
        purpose = request.data.get('purpose')

        if not revision_id or not purpose:
            return Response(
                {'error': 'revision_id and purpose are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        revision = get_object_or_404(StyleRevision, id=revision_id)

        try:
            scenario = UsageScenarioService.create_scenario(
                revision=revision,
                purpose=purpose,
                payload=request.data,
                user=request.user
            )

            serializer = UsageScenarioDetailSerializer(scenario)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def clone(self, request, pk=None):
        """
        Clone UsageScenario

        Payload:
        {
            "purpose": "bulk_quote",  // optional, can switch purpose
            "wastage_pct": 5.0,       // optional
            "notes": ""               // optional
        }
        """
        scenario = self.get_object()

        try:
            cloned = UsageScenarioService.clone_scenario(
                scenario_id=scenario.id,
                overrides=request.data,
                user=request.user
            )

            serializer = UsageScenarioDetailSerializer(cloned)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class UsageLineViewSet(viewsets.ModelViewSet):
    """
    UsageLine CRUD (mainly for updating consumption)

    Endpoints:
    - GET /api/v2/usage-lines/ - List lines (filter by scenario)
    - PATCH /api/v2/usage-lines/{id}/ - Update line
    """

    queryset = UsageLine.objects.select_related(
        'usage_scenario',
        'bom_item',
        'confirmed_by'
    )
    serializer_class = UsageLineSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production
    http_method_names = ['get', 'patch']  # Only GET and PATCH

    def get_queryset(self):
        """Filter by usage_scenario_id"""
        queryset = self.queryset

        scenario_id = self.request.query_params.get('usage_scenario_id')
        if scenario_id:
            queryset = queryset.filter(usage_scenario_id=scenario_id)

        return queryset

    def partial_update(self, request, *args, **kwargs):
        """
        Update UsageLine via Service (with can_edit check)

        Payload:
        {
            "consumption": 1.8,
            "consumption_status": "confirmed",
            "wastage_pct_override": 10.0
        }
        """
        line = self.get_object()

        try:
            updated_line = UsageScenarioService.update_usage_line(
                line_id=line.id,
                patch=request.data,
                user=request.user
            )

            serializer = self.get_serializer(updated_line)
            return Response(serializer.data)

        except PermissionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CostSheetVersionViewSet(viewsets.ModelViewSet):
    """
    CostSheetVersion CRUD + Clone/Submit actions

    Endpoints:
    - GET /api/v2/cost-sheet-versions/ - List versions
    - POST /api/v2/cost-sheet-versions/ - Create version
    - GET /api/v2/cost-sheet-versions/{id}/ - Retrieve version
    - PATCH /api/v2/cost-sheet-versions/{id}/ - Update summary
    - POST /api/v2/cost-sheet-versions/{id}/clone/ - Clone version
    - POST /api/v2/cost-sheet-versions/{id}/submit/ - Submit version
    """

    queryset = CostSheetVersion.objects.select_related(
        'cost_sheet_group__style',
        'techpack_revision',
        'usage_scenario',
        'created_by',
        'submitted_by'
    ).prefetch_related('cost_lines')
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_serializer_class(self):
        if self.action == 'list':
            return CostSheetVersionListSerializer
        return CostSheetVersionDetailSerializer

    def get_queryset(self):
        """Filter by query params"""
        queryset = self.queryset

        # Filter by cost_sheet_group
        group_id = self.request.query_params.get('cost_sheet_group_id')
        if group_id:
            queryset = queryset.filter(cost_sheet_group_id=group_id)

        # Filter by costing_type
        costing_type = self.request.query_params.get('costing_type')
        if costing_type:
            queryset = queryset.filter(costing_type=costing_type)

        # Filter by style_id (join through cost_sheet_group)
        style_id = self.request.query_params.get('style_id')
        if style_id:
            queryset = queryset.filter(cost_sheet_group__style_id=style_id)

        return queryset

    def create(self, request, *args, **kwargs):
        """
        Create CostSheetVersion via Service

        Payload:
        {
            "style_id": "uuid",
            "costing_type": "sample|bulk",
            "usage_scenario_id": "uuid",
            "labor_cost": 10.0,
            "overhead_cost": 5.0,
            "freight_cost": 3.0,
            "packing_cost": 2.0,
            "margin_pct": 30.0,
            "change_reason": "Initial costing"
        }
        """
        style_id = request.data.get('style_id')
        costing_type = request.data.get('costing_type')
        usage_scenario_id = request.data.get('usage_scenario_id')

        if not all([style_id, costing_type, usage_scenario_id]):
            return Response(
                {'error': 'style_id, costing_type, and usage_scenario_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            cost_sheet = CostingService.create_cost_sheet(
                style_id=style_id,
                costing_type=costing_type,
                usage_scenario_id=usage_scenario_id,
                payload=request.data,
                user=request.user
            )

            serializer = CostSheetVersionDetailSerializer(cost_sheet)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def partial_update(self, request, *args, **kwargs):
        """
        Update CostSheetVersion summary via Service (Draft only)

        Payload:
        {
            "labor_cost": 12.0,
            "overhead_cost": 6.0,
            "margin_pct": 35.0
        }
        """
        cost_sheet = self.get_object()

        try:
            updated = CostingService.update_cost_sheet_summary(
                cost_sheet_id=cost_sheet.id,
                patch=request.data,
                user=request.user
            )

            serializer = self.get_serializer(updated)
            return Response(serializer.data)

        except PermissionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def clone(self, request, pk=None):
        """
        Clone CostSheetVersion

        Payload:
        {
            "usage_scenario_id": "uuid",  // optional, can switch scenario
            "labor_cost": 12.0,           // optional
            "margin_pct": 35.0,           // optional
            "change_reason": "Client requested adjustment"
        }
        """
        cost_sheet = self.get_object()

        try:
            cloned = CostingService.clone_cost_sheet(
                cost_sheet_id=cost_sheet.id,
                overrides=request.data,
                user=request.user
            )

            serializer = CostSheetVersionDetailSerializer(cloned)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'], url_path='allowed-actions')
    def allowed_actions(self, request, pk=None):
        """
        GET /api/v2/cost-sheet-versions/{id}/allowed-actions/

        Returns what actions are allowed on this cost sheet version

        Returns:
            {
                "success": true,
                "data": {
                    "can_submit": bool,
                    "can_edit": bool,
                    "reasons": ["NOT_DRAFT" | "BOM_NOT_READY"],
                    "bom": {
                        "items_count": int,
                        "verified_count": int,
                        "verified_ratio": float,
                        "required_threshold": float
                    }
                }
            }
        """
        from apps.styles.portfolio import bom_counts, BOM_VERIFIED_THRESHOLD

        cost_sheet = self.get_object()
        style = cost_sheet.cost_sheet_group.style if cost_sheet.cost_sheet_group else None

        # Get BOM counts
        total, verified, ratio = bom_counts(style) if style else (0, 0, 0.0)

        # Determine can_submit
        can_submit = (
            cost_sheet.status == 'draft' and
            ratio >= BOM_VERIFIED_THRESHOLD
        )

        # Determine can_edit
        can_edit = cost_sheet.status == 'draft'

        # Reasons why cannot submit
        reasons = []
        if cost_sheet.status != 'draft':
            reasons.append('NOT_DRAFT')
        if ratio < BOM_VERIFIED_THRESHOLD:
            reasons.append('BOM_NOT_READY')

        return Response({
            'success': True,
            'data': {
                'can_submit': can_submit,
                'can_edit': can_edit,
                'reasons': reasons,
                'bom': {
                    'items_count': total,
                    'verified_count': verified,
                    'verified_ratio': round(ratio, 4),
                    'required_threshold': BOM_VERIFIED_THRESHOLD,
                }
            }
        })

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit CostSheetVersion (Draft → Submitted, locks UsageScenario)

        Decision 2 Gate: BOM verified_ratio >= 0.9

        No payload required

        Returns:
            200: Success with serialized cost_sheet
            400: Invalid state (not draft)
            403: BOM not ready (verified_ratio < 0.9)
            500: Internal error
        """
        cost_sheet = self.get_object()

        try:
            from .services.costing_service import BOMNotReadyError

            submitted = CostingService.submit_cost_sheet(
                cost_sheet_id=cost_sheet.id,
                user=request.user
            )

            serializer = CostSheetVersionDetailSerializer(submitted)
            return Response({
                'success': True,
                'data': serializer.data
            })

        except BOMNotReadyError as e:
            # Decision 2: Return 403 with BOM details
            return Response(
                {
                    'success': False,
                    'error': 'BOM_NOT_READY',
                    'detail': str(e),
                    **e.bom_data
                },
                status=status.HTTP_403_FORBIDDEN
            )
        except ValueError as e:
            return Response(
                {
                    'success': False,
                    'error': 'INVALID_STATE',
                    'detail': str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {
                    'success': False,
                    'error': 'INTERNAL_ERROR',
                    'detail': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CostLineV2ViewSet(viewsets.ModelViewSet):
    """
    CostLineV2 CRUD (mainly for adjusting consumption/price in Draft)

    Endpoints:
    - GET /api/v2/cost-lines-v2/ - List lines (filter by cost_sheet)
    - PATCH /api/v2/cost-lines-v2/{id}/ - Update line (adjust consumption/price)
    """

    queryset = CostLineV2.objects.select_related(
        'cost_sheet_version',
        'adjusted_by'
    )
    serializer_class = CostLineV2Serializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production
    http_method_names = ['get', 'patch']  # Only GET and PATCH

    def get_queryset(self):
        """Filter by cost_sheet_version_id"""
        queryset = self.queryset

        cost_sheet_id = self.request.query_params.get('cost_sheet_version_id')
        if cost_sheet_id:
            queryset = queryset.filter(cost_sheet_version_id=cost_sheet_id)

        return queryset.order_by('sort_order', 'category', 'material_name')

    def partial_update(self, request, *args, **kwargs):
        """
        Update CostLineV2 via Service (Draft only, with 403 Guard)

        Payload:
        {
            "consumption_adjusted": 1.8,
            "unit_price_adjusted": 12.5,
            "adjustment_reason": "Client negotiation"
        }
        """
        line = self.get_object()

        try:
            updated_line = CostingService.update_cost_line(
                line_id=line.id,
                patch=request.data,
                user=request.user
            )

            serializer = self.get_serializer(updated_line)
            return Response(serializer.data)

        except PermissionError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class CostSheetGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """
    CostSheetGroup Read-only (auto-created when first CostSheetVersion is created)

    Endpoints:
    - GET /api/v2/cost-sheet-groups/ - List groups
    - GET /api/v2/cost-sheet-groups/{id}/ - Retrieve group
    """

    queryset = CostSheetGroup.objects.select_related('style')
    serializer_class = CostSheetGroupSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        """Filter by style_id"""
        queryset = self.queryset

        style_id = self.request.query_params.get('style_id')
        if style_id:
            queryset = queryset.filter(style_id=style_id)

        return queryset
