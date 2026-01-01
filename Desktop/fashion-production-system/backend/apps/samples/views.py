"""
Phase 3: Sample Request System - DRF ViewSets
Day 3 MVP API + SampleRun (Phase 3 Refactor)
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import (
    SampleRequest,
    SampleRun,
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
)
from .services.auto_generation import create_with_initial_run


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
    queryset = SampleRequest.objects.all().select_related('revision').prefetch_related(
        'attachments',
        'estimates',
        'samples',
        'runs',  # Phase 3: SampleRun replaces direct MWO/T2PO links
    ).order_by('-created_at')
    serializer_class = SampleRequestSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

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
    queryset = SampleRun.objects.all().select_related(
        'sample_request',
        'revision',
        'guidance_usage',
        'actual_usage',
        'costing_version',
    ).prefetch_related(
        'actuals',
        't2pos',
        'mwos',
    ).order_by('sample_request', 'run_no')
    serializer_class = SampleRunSerializer
    permission_classes = [AllowAny]  # TODO: Change to IsAuthenticated in production

    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return SampleRunListSerializer
        return SampleRunSerializer

    def get_queryset(self):
        """Filter by sample_request if provided"""
        queryset = super().get_queryset()
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
