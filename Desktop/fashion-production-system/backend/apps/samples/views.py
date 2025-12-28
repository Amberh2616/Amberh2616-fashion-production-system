"""
Phase 3: Sample Request System - DRF ViewSets
Day 3 MVP API
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import (
    SampleRequest,
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
        'mwos',
        't2pos',
        'samples',
    ).order_by('-created_at')
    serializer_class = SampleRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Use lightweight serializer for list view"""
        if self.action == 'list':
            return SampleRequestListSerializer
        return SampleRequestSerializer

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


class SampleAttachmentViewSet(viewsets.ModelViewSet):
    """
    SampleAttachment CRUD

    Attachments can be linked to:
    - SampleRequest (general attachments)
    - Sample (specific physical sample photos/docs)
    """
    queryset = SampleAttachment.objects.all().order_by('-uploaded_at')
    serializer_class = SampleAttachmentSerializer
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter by sample_request if provided"""
        queryset = super().get_queryset()
        sample_request_id = self.request.query_params.get('sample_request')
        if sample_request_id:
            queryset = queryset.filter(sample_request_id=sample_request_id)
        return queryset
