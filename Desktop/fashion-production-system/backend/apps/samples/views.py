"""
Phase 3: Sample Request System - DRF ViewSets
Day 3 MVP API + SampleRun (Phase 3 Refactor)
P0-2: Kanban View API
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes as perm_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Count, Q, Case, When, Value, IntegerField
from django.utils import timezone
from datetime import timedelta

from .models import (
    SampleRequest,
    SampleRun,
    SampleRunStatus,
    SampleActuals,
    SampleAttachment,
    SampleCostEstimate,
    T2POForSample,
    T2POLineForSample,
    SampleMWO,
    Sample,
)
from .serializers import (
    SampleRequestSerializer,
    SampleRequestListSerializer,
    SampleRunSerializer,
    SampleRunListSerializer,
    SampleActualsSerializer,
    SampleAttachmentSerializer,
    SampleCostEstimateSerializer,
    T2POForSampleSerializer,
    T2POLineForSampleSerializer,
    SampleMWOSerializer,
    SampleSerializer,
)
from .services.transitions import (
    transition_sample_request,
    can_transition,
    get_allowed_actions,
)
from .services.run_transitions import (
    transition_sample_run,
    can_transition as can_transition_run,
    get_allowed_actions as get_allowed_actions_run,
    batch_transition_sample_runs,
)
from .services.excel_export import (
    MWOExcelExporter,
    EstimateExcelExporter,
    T2POExcelExporter,
)
from .services.auto_generation import create_with_initial_run


def _get_user_organization(request):
    """
    Get organization from authenticated user.

    SaaS-Ready: No fallback to first organization - user MUST have an organization.
    Returns None for anonymous users (ViewSet should handle this).
    """
    if not request.user.is_authenticated:
        return None
    org = getattr(request.user, 'organization', None)
    return org


class SampleRequestViewSet(viewsets.ModelViewSet):
    """
    SampleRequest CRUD + state transition actions

    Actions (workflow):
    - POST /sample-requests/{id}/submit/
    - POST /sample-requests/{id}/quote/
    - POST /sample-requests/{id}/approve/
    - POST /sample-requests/{id}/reject/
    - POST /sample-requests/{id}/cancel/
    - POST /sample-requests/{id}/start_execution/
    - POST /sample-requests/{id}/complete/
    - GET  /sample-requests/{id}/allowed_actions/
    """
    serializer_class = SampleRequestSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        """
        SaaS-Ready: Filter by organization using direct organization FK.

        Development mode: If no organization, return all in DEBUG mode.
        Production: Should require authentication and organization.
        """
        org = _get_user_organization(self.request)

        base_qs = SampleRequest.objects.select_related(
            'revision',
            'revision__style',
            'organization',
        ).prefetch_related(
            'attachments',
            'estimates',
            'samples',
            'runs',
        ).order_by('-created_at')

        if org is None:
            # Development mode: Return all if no auth (for testing)
            from django.conf import settings
            if settings.DEBUG:
                return base_qs
            return SampleRequest.objects.none()

        # SaaS mode: Use TenantManager for_tenant() or direct filter
        return base_qs.for_tenant(org)

    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return SampleRequestListSerializer
        return SampleRequestSerializer

    def create(self, request, *args, **kwargs):
        """
        P0-1: Create SampleRequest with auto-generation

        When a request is created, automatically generates:
        - SampleRun #1
        - RunBOMLine snapshots
        - RunOperation snapshots
        - MWO (draft)
        - Estimate (draft)
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Extract revision ID from validated data
        revision = serializer.validated_data.get('revision')
        if not revision:
            return Response(
                {"detail": "revision is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build payload for auto-generation service
        payload = {
            'request_type': serializer.validated_data.get('request_type', 'proto'),
            'request_type_custom': serializer.validated_data.get('request_type_custom', ''),
            'quantity_requested': serializer.validated_data.get('quantity_requested', 1),
            'priority': serializer.validated_data.get('priority', 'normal'),
            'due_date': serializer.validated_data.get('due_date'),
            'brand_name': serializer.validated_data.get('brand_name', ''),
            'need_quote_first': serializer.validated_data.get('need_quote_first', False),
            'notes_internal': serializer.validated_data.get('notes_internal', ''),
            'notes_customer': serializer.validated_data.get('notes_customer', ''),
        }

        try:
            # Use auto-generation service
            sample_request, sample_run, documents = create_with_initial_run(
                revision_id=str(revision.id),
                payload=payload,
                user=request.user if request.user.is_authenticated else None,
                skip_validation=True,  # Skip BOM verification for now (development)
            )
        except DjangoValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Serialize the created request
        response_serializer = self.get_serializer(sample_request)

        return Response({
            "data": response_serializer.data,
            "initial_run": {
                "id": str(sample_run.id),
                "run_no": sample_run.run_no,
                "status": sample_run.status,
                "source_revision_label": sample_run.source_revision_label,
                "source_hash": sample_run.source_hash,
            },
            "documents": documents,
        }, status=status.HTTP_201_CREATED)

    def _handle_transition(self, request, pk, action_name):
        """
        Common handler for all transition actions
        Reduces code duplication across actions
        """
        obj = self.get_object()

        # Extract payload from request
        payload = {
            "reason": request.data.get("reason", ""),
            "notes": request.data.get("notes", ""),
        }

        try:
            result = transition_sample_request(
                sample_request=obj,
                action=action_name,
                actor=request.user,
                payload=payload,
            )
        except (ValueError, DjangoValidationError) as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Re-serialize the updated object
        serializer = self.get_serializer(obj)

        return Response({
            "transition": {
                "old_status": result.old_status,
                "new_status": result.new_status,
                "action": result.action,
                "changed_at": result.changed_at.isoformat(),
                "meta": result.meta,
            },
            "data": serializer.data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit(self, request, pk=None):
        """Submit sample request (draft → quote_requested or approved)"""
        return self._handle_transition(request, pk, "submit")

    @action(detail=True, methods=["post"], url_path="quote")
    def quote(self, request, pk=None):
        """Mark as quoted (quote_requested → quoted)"""
        return self._handle_transition(request, pk, "quote")

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """Approve sample request (quoted/draft → approved)"""
        return self._handle_transition(request, pk, "approve")

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        """Reject sample request (any → rejected)"""
        return self._handle_transition(request, pk, "reject")

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancel sample request (any → cancelled)"""
        return self._handle_transition(request, pk, "cancel")

    @action(detail=True, methods=["post"], url_path="start-execution")
    def start_execution(self, request, pk=None):
        """Start execution (approved → in_execution)"""
        return self._handle_transition(request, pk, "start_execution")

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        """Complete sample request (in_execution → completed)"""
        return self._handle_transition(request, pk, "complete")

    @action(detail=True, methods=["get"], url_path="allowed-actions")
    def allowed_actions(self, request, pk=None):
        """Get list of allowed actions for current status"""
        obj = self.get_object()
        actions = get_allowed_actions(obj)

        return Response({
            "current_status": obj.status,
            "allowed_actions": actions,
            "can_submit": can_transition(obj, "submit"),
            "can_approve": can_transition(obj, "approve"),
            "can_reject": can_transition(obj, "reject"),
        }, status=status.HTTP_200_OK)


# ==================== Phase 3 Refactor: SampleRun ====================

class SampleRunViewSet(viewsets.ModelViewSet):
    """
    SampleRun CRUD + state transition actions

    Actions (workflow):
    - POST /sample-runs/{id}/start-materials-planning/
    - POST /sample-runs/{id}/generate-t2po/
    - POST /sample-runs/{id}/issue-t2po/
    - POST /sample-runs/{id}/generate-mwo/
    - POST /sample-runs/{id}/issue-mwo/
    - POST /sample-runs/{id}/start-production/
    - POST /sample-runs/{id}/mark-sample-done/
    - POST /sample-runs/{id}/record-actuals/
    - POST /sample-runs/{id}/cancel/
    - GET  /sample-runs/{id}/allowed-actions/
    """
    serializer_class = SampleRunSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return SampleRunListSerializer
        return SampleRunSerializer

    def get_queryset(self):
        """
        SaaS-Ready: Filter by organization using direct organization FK.
        Also supports filtering by sample_request query param.
        """
        org = _get_user_organization(self.request)

        base_qs = SampleRun.objects.select_related(
            'sample_request',
            'sample_request__revision',
            'sample_request__revision__style',
            'organization',
            'revision',
            'guidance_usage',
            'actual_usage',
            'costing_version',
        ).prefetch_related(
            'actuals',
            't2pos',
            'mwos',
        ).order_by('sample_request', 'run_no')

        if org is None:
            # Development mode: Return all if no auth (for testing)
            from django.conf import settings
            if settings.DEBUG:
                queryset = base_qs
            else:
                return SampleRun.objects.none()
        else:
            # SaaS mode: Use TenantManager for_tenant()
            queryset = base_qs.for_tenant(org)

        # Additional filter by sample_request if provided
        sample_request_id = self.request.query_params.get('sample_request')
        if sample_request_id:
            queryset = queryset.filter(sample_request_id=sample_request_id)

        return queryset

    def _handle_transition(self, request, pk, action_name):
        """
        Common handler for all transition actions
        """
        obj = self.get_object()

        # Extract payload from request
        payload = {
            "reason": request.data.get("reason", ""),
            "notes": request.data.get("notes", ""),
        }

        try:
            result = transition_sample_run(
                sample_run=obj,
                action=action_name,
                actor=request.user,
                payload=payload,
            )
        except (ValueError, DjangoValidationError) as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Re-serialize the updated object
        serializer = self.get_serializer(obj)

        return Response({
            "transition": {
                "old_status": result.old_status,
                "new_status": result.new_status,
                "action": result.action,
                "changed_at": result.changed_at.isoformat(),
                "meta": result.meta,
            },
            "data": serializer.data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="start-materials-planning")
    def start_materials_planning(self, request, pk=None):
        """Start materials planning (draft → materials_planning)"""
        return self._handle_transition(request, pk, "start_materials_planning")

    @action(detail=True, methods=["post"], url_path="generate-t2po")
    def generate_t2po(self, request, pk=None):
        """Generate T2PO draft (materials_planning → po_drafted)"""
        return self._handle_transition(request, pk, "generate_t2po")

    @action(detail=True, methods=["post"], url_path="issue-t2po")
    def issue_t2po(self, request, pk=None):
        """Issue T2PO (po_drafted → po_issued)"""
        return self._handle_transition(request, pk, "issue_t2po")

    @action(detail=True, methods=["post"], url_path="generate-mwo")
    def generate_mwo(self, request, pk=None):
        """Generate MWO draft (po_issued → mwo_drafted)"""
        return self._handle_transition(request, pk, "generate_mwo")

    @action(detail=True, methods=["post"], url_path="issue-mwo")
    def issue_mwo(self, request, pk=None):
        """Issue MWO (mwo_drafted → mwo_issued)"""
        return self._handle_transition(request, pk, "issue_mwo")

    @action(detail=True, methods=["post"], url_path="start-production")
    def start_production(self, request, pk=None):
        """Start production (mwo_issued → in_progress)"""
        return self._handle_transition(request, pk, "start_production")

    @action(detail=True, methods=["post"], url_path="mark-sample-done")
    def mark_sample_done(self, request, pk=None):
        """Mark sample done (in_progress → sample_done)"""
        return self._handle_transition(request, pk, "mark_sample_done")

    @action(detail=True, methods=["post"], url_path="record-actuals")
    def record_actuals(self, request, pk=None):
        """Record actuals (sample_done → actuals_recorded)"""
        return self._handle_transition(request, pk, "record_actuals")

    @action(detail=True, methods=["post"], url_path="generate-sample-costing")
    def generate_sample_costing(self, request, pk=None):
        """Generate sample costing (actuals_recorded → costing_generated)"""
        return self._handle_transition(request, pk, "generate_sample_costing")

    @action(detail=True, methods=["post"], url_path="mark-quoted")
    def mark_quoted(self, request, pk=None):
        """Mark as quoted (costing_generated → quoted)"""
        return self._handle_transition(request, pk, "mark_quoted")

    @action(detail=True, methods=["post"], url_path="mark-accepted")
    def mark_accepted(self, request, pk=None):
        """Mark as accepted (quoted → accepted)"""
        return self._handle_transition(request, pk, "mark_accepted")

    @action(detail=True, methods=["post"], url_path="mark-revise-needed")
    def mark_revise_needed(self, request, pk=None):
        """Mark revise needed (quoted → revise_needed)"""
        return self._handle_transition(request, pk, "mark_revise_needed")

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        """Cancel sample run (any → cancelled)"""
        return self._handle_transition(request, pk, "cancel")

    @action(detail=True, methods=["get"], url_path="allowed-actions")
    def allowed_actions(self, request, pk=None):
        """Get list of allowed actions for current status"""
        obj = self.get_object()
        actions = get_allowed_actions_run(obj)

        # Build can_* flags for common actions
        can_flags = {}
        for action_name in actions:
            can_flags[f"can_{action_name}"] = can_transition_run(obj, action_name)

        return Response({
            "current_status": obj.status,
            "allowed_actions": actions,
            **can_flags,
        }, status=status.HTTP_200_OK)

    # P2: Excel Export Actions
    @action(detail=True, methods=["get"], url_path="export-mwo")
    def export_mwo(self, request, pk=None):
        """
        Export MWO as Excel
        GET /api/v2/sample-runs/{id}/export-mwo/
        """
        run = self.get_object()

        # Get latest MWO for this run
        mwo = run.mwos.filter(is_latest=True).first()
        if not mwo:
            return Response(
                {'detail': 'No MWO found for this run'},
                status=status.HTTP_404_NOT_FOUND
            )

        exporter = MWOExcelExporter()
        return exporter.export(mwo)

    @action(detail=True, methods=["get"], url_path="export-estimate")
    def export_estimate(self, request, pk=None):
        """
        Export Estimate as Excel
        GET /api/v2/sample-runs/{id}/export-estimate/
        """
        run = self.get_object()

        # Get estimate from sample request (latest accepted or draft)
        estimate = run.sample_request.estimates.filter(
            status__in=['accepted', 'sent', 'draft']
        ).order_by('-estimate_version').first()

        if not estimate:
            return Response(
                {'detail': 'No estimate found for this run'},
                status=status.HTTP_404_NOT_FOUND
            )

        exporter = EstimateExcelExporter()
        return exporter.export(estimate)

    @action(detail=True, methods=["get"], url_path="export-po")
    def export_po(self, request, pk=None):
        """
        Export T2 PO as Excel
        GET /api/v2/sample-runs/{id}/export-po/
        """
        run = self.get_object()

        # Get latest issued PO
        po = run.t2pos.filter(
            status__in=['issued', 'confirmed', 'delivered']
        ).order_by('-version_no').first()

        if not po:
            # Try to get draft PO
            po = run.t2pos.filter(status='draft').order_by('-version_no').first()

        if not po:
            return Response(
                {'detail': 'No PO found for this run'},
                status=status.HTTP_404_NOT_FOUND
            )

        exporter = T2POExcelExporter()
        return exporter.export(po)


class SampleActualsViewSet(viewsets.ModelViewSet):
    """
    SampleActuals CRUD

    Used to record actual labor/costs after sample completion
    """
    queryset = SampleActuals.objects.all().select_related('sample_run').order_by('-created_at')
    serializer_class = SampleActualsSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        """Filter by sample_run if provided"""
        queryset = super().get_queryset()
        sample_run_id = self.request.query_params.get('sample_run')
        if sample_run_id:
            queryset = queryset.filter(sample_run_id=sample_run_id)
        return queryset

    def perform_create(self, serializer):
        """Auto-set recorded_by to current user"""
        from django.utils import timezone
        serializer.save(
            recorded_by=self.request.user,
            recorded_at=timezone.now()
        )


class SampleAttachmentViewSet(viewsets.ModelViewSet):
    """
    SampleAttachment CRUD

    Attachments can be linked to:
    - SampleRequest (general attachments)
    - Sample (specific physical sample photos/docs)
    """
    queryset = SampleAttachment.objects.all().order_by('-uploaded_at')
    serializer_class = SampleAttachmentSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def perform_create(self, serializer):
        """Auto-set uploaded_by to current user"""
        serializer.save(uploaded_by=self.request.user)


class SampleCostEstimateViewSet(viewsets.ModelViewSet):
    """
    SampleCostEstimate CRUD

    Cost estimates are versioned and can be:
    - Manual (created by user)
    - From Phase 2 Costing (snapshot copy)
    """
    queryset = SampleCostEstimate.objects.all().select_related('sample_request').order_by(
        '-sample_request', '-estimate_version'
    )
    serializer_class = SampleCostEstimateSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        """Filter by sample_request if provided"""
        queryset = super().get_queryset()
        sample_request_id = self.request.query_params.get('sample_request')
        if sample_request_id:
            queryset = queryset.filter(sample_request_id=sample_request_id)
        return queryset

    def perform_create(self, serializer):
        """Auto-set created_by to current user"""
        serializer.save(created_by=self.request.user)


class T2POForSampleViewSet(viewsets.ModelViewSet):
    """
    T2 PO for Sample CRUD

    T2 POs are procurement orders for sample materials
    Phase 2/3 Boundary: Uses snapshot fields, NO FK to BOMItem
    """
    queryset = T2POForSample.objects.all().select_related(
        'sample_request', 'estimate'
    ).prefetch_related('lines').order_by('-created_at')
    serializer_class = T2POForSampleSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        """Filter by sample_request if provided"""
        queryset = super().get_queryset()
        sample_request_id = self.request.query_params.get('sample_request')
        if sample_request_id:
            queryset = queryset.filter(sample_request_id=sample_request_id)
        return queryset


class T2POLineForSampleViewSet(viewsets.ModelViewSet):
    """
    T2 PO Line for Sample CRUD

    Lines are snapshot data - immutable after PO is issued
    """
    queryset = T2POLineForSample.objects.all().select_related('t2po').order_by('t2po', 'line_no')
    serializer_class = T2POLineForSampleSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        """Filter by t2po if provided"""
        queryset = super().get_queryset()
        t2po_id = self.request.query_params.get('t2po')
        if t2po_id:
            queryset = queryset.filter(t2po_id=t2po_id)
        return queryset


class SampleMWOViewSet(viewsets.ModelViewSet):
    """
    Sample Manufacturing Work Order CRUD

    MWOs contain snapshots of BOM/Construction/QC
    Phase 2/3 Boundary: Snapshot-only, NO FK to Phase 2 models
    """
    queryset = SampleMWO.objects.all().select_related(
        'sample_request', 'estimate'
    ).order_by('-created_at')
    serializer_class = SampleMWOSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        """Filter by sample_request if provided"""
        queryset = super().get_queryset()
        sample_request_id = self.request.query_params.get('sample_request')
        if sample_request_id:
            queryset = queryset.filter(sample_request_id=sample_request_id)
        return queryset


class SampleViewSet(viewsets.ModelViewSet):
    """
    Physical Sample CRUD

    Represents actual physical samples produced
    Can have multiple samples per request
    """
    queryset = Sample.objects.all().select_related(
        'sample_request', 'sample_mwo'
    ).prefetch_related('attachments').order_by('-created_at')
    serializer_class = SampleSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_queryset(self):
        """Filter by sample_request if provided"""
        queryset = super().get_queryset()
        sample_request_id = self.request.query_params.get('sample_request')
        if sample_request_id:
            queryset = queryset.filter(sample_request_id=sample_request_id)
        return queryset


# ==================== P0-2: Kanban View API ====================

@api_view(['GET'])
@perm_classes([AllowAny])
def kanban_counts(request):
    """
    P0-2: Get Kanban lane counts for SampleRun

    Returns counts grouped by status with overdue tracking.

    Query params:
    - days_ahead: Show due within N days (default: 7)

    Response:
    {
      "lanes": [
        {"status": "draft", "label": "Draft", "count": 5, "overdue": 0},
        {"status": "materials_planning", "label": "Materials Planning", "count": 3, "overdue": 1},
        ...
      ],
      "summary": {
        "total": 25,
        "overdue_total": 2,
        "due_this_week": 8
      }
    }
    """
    today = timezone.now().date()
    days_ahead = int(request.query_params.get('days_ahead', 7))
    due_cutoff = today + timedelta(days=days_ahead)

    # Define Kanban lane order (based on workflow)
    lane_order = [
        SampleRunStatus.DRAFT,
        SampleRunStatus.MATERIALS_PLANNING,
        SampleRunStatus.PO_DRAFTED,
        SampleRunStatus.PO_ISSUED,
        SampleRunStatus.MWO_DRAFTED,
        SampleRunStatus.MWO_ISSUED,
        SampleRunStatus.IN_PROGRESS,
        SampleRunStatus.SAMPLE_DONE,
        SampleRunStatus.ACTUALS_RECORDED,
        SampleRunStatus.COSTING_GENERATED,
        SampleRunStatus.QUOTED,
        SampleRunStatus.ACCEPTED,
        SampleRunStatus.REVISE_NEEDED,
    ]

    # SaaS-Ready: Tenant filtering using direct organization FK
    org = _get_user_organization(request)
    base_filter = Q(status__in=lane_order)  # Exclude cancelled

    if org is not None:
        # SaaS mode: Filter by direct organization FK (more efficient)
        base_filter &= Q(organization=org)
    else:
        # Development mode: In production, should return empty
        from django.conf import settings
        if not settings.DEBUG:
            return Response({
                'lanes': [],
                'summary': {'total': 0, 'overdue_total': 0, 'due_this_week': 0},
                'meta': {'as_of': timezone.now().isoformat(), 'days_ahead': days_ahead}
            })

    # Get counts by status
    status_counts = SampleRun.objects.filter(
        base_filter
    ).values('status').annotate(
        count=Count('id'),
        overdue=Count('id', filter=Q(target_due_date__lt=today)),
        due_soon=Count('id', filter=Q(
            target_due_date__gte=today,
            target_due_date__lte=due_cutoff
        )),
    )

    # Build lookup dict
    counts_dict = {item['status']: item for item in status_counts}

    # Build ordered lanes
    lanes = []
    for status_code in lane_order:
        status_label = dict(SampleRunStatus.CHOICES).get(status_code, status_code)
        data = counts_dict.get(status_code, {'count': 0, 'overdue': 0, 'due_soon': 0})
        lanes.append({
            'status': status_code,
            'label': status_label,
            'count': data['count'],
            'overdue': data['overdue'],
            'due_soon': data['due_soon'],
        })

    # Calculate summary
    total = sum(lane['count'] for lane in lanes)
    overdue_total = sum(lane['overdue'] for lane in lanes)
    due_this_week = sum(lane['due_soon'] for lane in lanes)

    return Response({
        'lanes': lanes,
        'summary': {
            'total': total,
            'overdue_total': overdue_total,
            'due_this_week': due_this_week,
        },
        'meta': {
            'as_of': timezone.now().isoformat(),
            'days_ahead': days_ahead,
        }
    })


@api_view(['GET'])
@perm_classes([AllowAny])
def kanban_runs(request):
    """
    P0-2: Get SampleRuns for Kanban board (300+ styles support)

    Returns runs with minimal data for Kanban cards.

    Query params:
    - status: Filter by status (can be multiple, comma-separated)
    - priority: Filter by priority (urgent/normal/low)
    - overdue_only: Show only overdue items
    - due_this_week: Show items due within 7 days
    - brand: Filter by brand name (partial match)
    - style_number: Filter by style number (partial match)
    - run_type: Filter by run type (proto/fit/sales/photo)
    - search: General search (style_number or brand)
    - limit: Max items per status (default: 50)
    """
    today = timezone.now().date()
    week_later = today + timedelta(days=7)

    # SaaS-Ready: Tenant filtering using direct organization FK
    org = _get_user_organization(request)

    # Base queryset with tenant awareness
    queryset = SampleRun.objects.select_related(
        'sample_request',
        'sample_request__revision',
        'sample_request__revision__style',
        'organization',
    ).exclude(
        status=SampleRunStatus.CANCELLED
    )

    if org is not None:
        # SaaS mode: Filter by direct organization FK (more efficient)
        queryset = queryset.for_tenant(org)
    else:
        # Development mode: In production, should return empty
        from django.conf import settings
        if not settings.DEBUG:
            return Response({
                'runs': [],
                'meta': {'count': 0, 'as_of': timezone.now().isoformat()}
            })

    # Apply filters
    status_filter = request.query_params.get('status')
    if status_filter:
        statuses = [s.strip() for s in status_filter.split(',')]
        queryset = queryset.filter(status__in=statuses)

    priority = request.query_params.get('priority')
    if priority:
        queryset = queryset.filter(sample_request__priority=priority)

    overdue_only = request.query_params.get('overdue_only', '').lower() == 'true'
    if overdue_only:
        queryset = queryset.filter(target_due_date__lt=today)

    due_this_week = request.query_params.get('due_this_week', '').lower() == 'true'
    if due_this_week:
        queryset = queryset.filter(
            target_due_date__gte=today,
            target_due_date__lte=week_later
        )

    # Brand filter (partial match)
    brand = request.query_params.get('brand')
    if brand:
        queryset = queryset.filter(sample_request__brand_name__icontains=brand)

    # Style number filter (partial match)
    style_number = request.query_params.get('style_number')
    if style_number:
        queryset = queryset.filter(
            sample_request__revision__style__style_number__icontains=style_number
        )

    # Run type filter
    run_type = request.query_params.get('run_type')
    if run_type:
        queryset = queryset.filter(run_type=run_type)

    # General search (style_number or brand)
    search = request.query_params.get('search')
    if search:
        queryset = queryset.filter(
            Q(sample_request__brand_name__icontains=search) |
            Q(sample_request__revision__style__style_number__icontains=search) |
            Q(sample_request__revision__style__style_name__icontains=search)
        )

    # Limit per status
    limit = int(request.query_params.get('limit', 50))

    # Annotate with overdue flag
    queryset = queryset.annotate(
        is_overdue=Case(
            When(target_due_date__lt=today, then=Value(1)),
            default=Value(0),
            output_field=IntegerField()
        )
    ).order_by('status', '-is_overdue', 'target_due_date', '-created_at')

    # Build response
    runs = []
    for run in queryset[:limit * 15]:  # Rough limit
        request_obj = run.sample_request
        revision = request_obj.revision
        style = revision.style if revision else None

        runs.append({
            'id': str(run.id),
            'run_no': run.run_no,
            'status': run.status,
            'status_label': run.get_status_display(),
            'run_type': run.run_type,
            'run_type_label': run.get_run_type_display(),
            'quantity': run.quantity,
            'target_due_date': run.target_due_date.isoformat() if run.target_due_date else None,
            'is_overdue': run.target_due_date and run.target_due_date < today,
            'days_until_due': (run.target_due_date - today).days if run.target_due_date else None,
            'sample_request': {
                'id': str(request_obj.id),
                'request_type': request_obj.request_type,
                'priority': request_obj.priority,
                'brand_name': request_obj.brand_name,
            },
            'style': {
                'id': str(style.id) if style else None,
                'style_number': style.style_number if style else None,
                'style_name': style.style_name if style else None,
            } if style else None,
            'revision': {
                'id': str(revision.id) if revision else None,
                'revision_label': revision.revision_label if revision else None,
            } if revision else None,
        })

    return Response({
        'runs': runs,
        'meta': {
            'count': len(runs),
            'as_of': timezone.now().isoformat(),
        }
    })


# ==================== P1: Batch Operations API ====================

@api_view(['POST'])
@perm_classes([AllowAny])  # TODO: Change to IsAuthenticated in production
def batch_transition(request):
    """
    P1: Batch transition multiple SampleRuns

    POST /api/v2/sample-runs/batch-transition/

    Request body:
    {
        "run_ids": ["uuid1", "uuid2", ...],
        "action": "start_materials_planning"
    }

    Response:
    {
        "total": 5,
        "succeeded": 4,
        "failed": 1,
        "results": [
            {"run_id": "uuid1", "old_status": "draft", "new_status": "materials_planning", "success": true},
            {"run_id": "uuid2", "success": false, "error": "..."}
        ],
        "errors": [
            {"run_id": "uuid2", "error": "Prerequisite not met"}
        ]
    }

    Notes:
    - All runs must be in the same status
    - Partial success is allowed (some may fail, others succeed)
    - Returns detailed results for each run
    """
    # Extract request data
    run_ids = request.data.get('run_ids', [])
    action = request.data.get('action', '')

    # Validate inputs
    if not run_ids:
        return Response(
            {'detail': 'run_ids is required and must be non-empty'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not action:
        return Response(
            {'detail': 'action is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not isinstance(run_ids, list):
        return Response(
            {'detail': 'run_ids must be an array'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(run_ids) > 100:
        return Response(
            {'detail': 'Maximum 100 runs per batch operation'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # SaaS-Ready: Get organization for tenant filtering
    org = _get_user_organization(request)

    # Execute batch transition
    result = batch_transition_sample_runs(
        run_ids=run_ids,
        action=action,
        actor=request.user if request.user.is_authenticated else None,
        payload={
            'reason': request.data.get('reason', ''),
            'notes': request.data.get('notes', ''),
        },
        organization=org,
    )

    # Return appropriate status code
    if result.failed == result.total:
        # All failed
        status_code = status.HTTP_400_BAD_REQUEST
    elif result.failed > 0:
        # Partial success
        status_code = status.HTTP_207_MULTI_STATUS
    else:
        # All succeeded
        status_code = status.HTTP_200_OK

    return Response({
        'total': result.total,
        'succeeded': result.succeeded,
        'failed': result.failed,
        'results': result.results,
        'errors': result.errors,
    }, status=status_code)


# ==================== P1: Alerts API ====================

@api_view(['GET'])
@perm_classes([AllowAny])  # TODO: Change to IsAuthenticated in production
def get_alerts(request):
    """
    P1: Get alerts for SampleRuns

    GET /api/v2/alerts/

    Query params:
    - include_overdue: Include overdue alerts (default: true)
    - include_due_soon: Include due soon alerts (default: true)
    - include_stale: Include stale alerts (default: true)
    - due_soon_days: Days threshold for "due soon" (default: 3)
    - stale_days: Days threshold for "stale" (default: 7)
    - limit: Max alerts per category (default: 20)

    Response:
    {
        "alerts": [
            {
                "id": "uuid",
                "type": "overdue",
                "severity": "high",
                "title": "Overdue: Style ABC123",
                "message": "Run #1 was due on Jan 1, 2026",
                "run_id": "uuid",
                "style_number": "ABC123",
                "days_overdue": 5
            },
            ...
        ],
        "summary": {
            "overdue": 3,
            "due_soon": 5,
            "stale": 2,
            "total": 10
        }
    }
    """
    today = timezone.now().date()

    # Parse query params
    include_overdue = request.query_params.get('include_overdue', 'true').lower() == 'true'
    include_due_soon = request.query_params.get('include_due_soon', 'true').lower() == 'true'
    include_stale = request.query_params.get('include_stale', 'true').lower() == 'true'
    due_soon_days = int(request.query_params.get('due_soon_days', 3))
    stale_days = int(request.query_params.get('stale_days', 7))
    limit = int(request.query_params.get('limit', 20))

    # SaaS-Ready: Tenant filtering
    org = _get_user_organization(request)

    # Base queryset - exclude completed/cancelled
    base_qs = SampleRun.objects.select_related(
        'sample_request',
        'sample_request__revision',
        'sample_request__revision__style',
    ).exclude(
        status__in=[SampleRunStatus.CANCELLED, SampleRunStatus.ACCEPTED]
    )

    if org is not None:
        base_qs = base_qs.filter(organization=org)
    else:
        from django.conf import settings
        if not settings.DEBUG:
            return Response({
                'alerts': [],
                'summary': {'overdue': 0, 'due_soon': 0, 'stale': 0, 'total': 0}
            })

    alerts = []
    summary = {'overdue': 0, 'due_soon': 0, 'stale': 0, 'total': 0}

    # 1. Overdue alerts (target_due_date < today)
    if include_overdue:
        overdue_runs = base_qs.filter(
            target_due_date__lt=today
        ).order_by('target_due_date')[:limit]

        for run in overdue_runs:
            days_overdue = (today - run.target_due_date).days
            style = run.sample_request.revision.style if run.sample_request.revision else None
            alerts.append({
                'id': str(run.id),
                'type': 'overdue',
                'severity': 'high',
                'title': f"Overdue: {style.style_number if style else 'Unknown'}",
                'message': f"Run #{run.run_no} was due on {run.target_due_date.strftime('%b %d, %Y')} ({days_overdue} days ago)",
                'run_id': str(run.id),
                'request_id': str(run.sample_request.id),
                'style_number': style.style_number if style else None,
                'status': run.status,
                'days_overdue': days_overdue,
                'target_due_date': run.target_due_date.isoformat(),
            })
            summary['overdue'] += 1

    # 2. Due Soon alerts (today <= target_due_date <= today + due_soon_days)
    if include_due_soon:
        due_soon_cutoff = today + timedelta(days=due_soon_days)
        due_soon_runs = base_qs.filter(
            target_due_date__gte=today,
            target_due_date__lte=due_soon_cutoff
        ).order_by('target_due_date')[:limit]

        for run in due_soon_runs:
            days_until = (run.target_due_date - today).days
            style = run.sample_request.revision.style if run.sample_request.revision else None
            alerts.append({
                'id': str(run.id),
                'type': 'due_soon',
                'severity': 'medium',
                'title': f"Due Soon: {style.style_number if style else 'Unknown'}",
                'message': f"Run #{run.run_no} is due in {days_until} day{'s' if days_until != 1 else ''}",
                'run_id': str(run.id),
                'request_id': str(run.sample_request.id),
                'style_number': style.style_number if style else None,
                'status': run.status,
                'days_until_due': days_until,
                'target_due_date': run.target_due_date.isoformat(),
            })
            summary['due_soon'] += 1

    # 3. Stale alerts (draft status for > stale_days)
    if include_stale:
        stale_cutoff = timezone.now() - timedelta(days=stale_days)
        stale_runs = base_qs.filter(
            status=SampleRunStatus.DRAFT,
            created_at__lt=stale_cutoff
        ).order_by('created_at')[:limit]

        for run in stale_runs:
            days_stale = (timezone.now() - run.created_at).days
            style = run.sample_request.revision.style if run.sample_request.revision else None
            alerts.append({
                'id': str(run.id),
                'type': 'stale',
                'severity': 'low',
                'title': f"Stale: {style.style_number if style else 'Unknown'}",
                'message': f"Run #{run.run_no} has been in draft for {days_stale} days",
                'run_id': str(run.id),
                'request_id': str(run.sample_request.id),
                'style_number': style.style_number if style else None,
                'status': run.status,
                'days_stale': days_stale,
                'created_at': run.created_at.isoformat(),
            })
            summary['stale'] += 1

    summary['total'] = summary['overdue'] + summary['due_soon'] + summary['stale']

    # Sort alerts by severity (high > medium > low)
    severity_order = {'high': 0, 'medium': 1, 'low': 2}
    alerts.sort(key=lambda x: severity_order.get(x['severity'], 3))

    return Response({
        'alerts': alerts,
        'summary': summary,
        'meta': {
            'as_of': timezone.now().isoformat(),
            'due_soon_days': due_soon_days,
            'stale_days': stale_days,
        }
    })
