"""
Styles Views - v2.2.1
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.core.api_utils import api_success, api_error, paginated_response, ErrorCodes
from .models import Style, StyleRevision, BOMItem
from .serializers import (
    StyleSerializer,
    StyleListSerializer,
    StyleRevisionSerializer,
    BOMItemSerializer,
    IntakeBulkCreateRequestSerializer,
)
from .services import bulk_create_styles_and_revisions, build_styles_queryset_with_risk


class BOMItemViewSet(viewsets.ModelViewSet):
    """
    ViewSet for BOM Item CRUD operations
    Nested under StyleRevision: /api/v2/revisions/{revision_id}/bom/
    """
    serializer_class = BOMItemSerializer
    permission_classes = []  # TODO: Enable authentication in production

    def get_queryset(self):
        """Filter BOM items by revision"""
        revision_id = self.kwargs.get('revision_pk')
        return BOMItem.objects.filter(revision_id=revision_id).order_by('item_number')

    def perform_create(self, serializer):
        """Set revision when creating"""
        revision_id = self.kwargs.get('revision_pk')
        revision = get_object_or_404(StyleRevision, pk=revision_id)
        serializer.save(revision=revision)


class StyleViewSet(viewsets.ViewSet):
    """
    ViewSet for Style CRUD and Intake operations
    """
    # TODO: Enable authentication in production
    # permission_classes = [IsAuthenticated]
    permission_classes = []

    def _get_organization(self, request):
        """Get organization from request user"""
        org = getattr(request.user, 'organization', None)
        if org is None:
            # For development: get first org
            from apps.core.models import Organization
            org = Organization.objects.first()
        return org

    def list(self, request):
        """
        GET /api/v2/styles
        List all styles with risk badges
        """
        org = self._get_organization(request)
        if org is None:
            return api_error(
                code=ErrorCodes.UNAUTHORIZED,
                message="Organization not found",
                status_code=status.HTTP_403_FORBIDDEN
            )

        # Build queryset with risk annotations
        qs = build_styles_queryset_with_risk(org, request.query_params)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 50))

        # Calculate pagination
        total = qs.count()
        start = (page - 1) * page_size
        end = start + page_size

        # Get page data
        items = list(qs[start:end])

        # Serialize
        serializer = StyleListSerializer(items, many=True)

        return paginated_response(
            data=serializer.data,
            page=page,
            page_size=page_size,
            total=total
        )

    def retrieve(self, request, pk=None):
        """
        GET /api/v2/styles/{id}
        Get single style with all revisions
        """
        org = self._get_organization(request)
        if org is None:
            return api_error(
                code=ErrorCodes.UNAUTHORIZED,
                message="Organization not found",
                status_code=status.HTTP_403_FORBIDDEN
            )

        style = get_object_or_404(Style, pk=pk, organization=org)
        serializer = StyleSerializer(style)

        return api_success(data=serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """
        POST /api/v2/styles/bulk-create
        Bulk create styles and revisions (Intake)
        """
        org = self._get_organization(request)
        if org is None:
            return api_error(
                code=ErrorCodes.UNAUTHORIZED,
                message="Organization not found",
                status_code=status.HTTP_403_FORBIDDEN
            )

        serializer = IntakeBulkCreateRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return api_error(
                code=ErrorCodes.VALIDATION_ERROR,
                message="Invalid payload",
                details=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        result = bulk_create_styles_and_revisions(
            organization=org,
            items=serializer.validated_data['items'],
            options=serializer.validated_data.get('options', {})
        )

        return api_success(
            data=result['items'],
            meta=result['meta'],
            status_code=status.HTTP_200_OK
        )


class StyleRevisionViewSet(viewsets.ViewSet):
    """
    ViewSet for StyleRevision operations
    """
    # TODO: Enable authentication in production
    # permission_classes = [IsAuthenticated]
    permission_classes = []

    def _get_organization(self, request):
        """Get organization from request user"""
        org = getattr(request.user, 'organization', None)
        if org is None:
            from apps.core.models import Organization
            org = Organization.objects.first()
        return org

    def retrieve(self, request, pk=None):
        """
        GET /api/v2/revisions/{id}
        Get single revision with all data
        """
        org = self._get_organization(request)
        if org is None:
            return api_error(
                code=ErrorCodes.UNAUTHORIZED,
                message="Organization not found",
                status_code=status.HTTP_403_FORBIDDEN
            )

        revision = get_object_or_404(
            StyleRevision.objects.select_related('style'),
            pk=pk,
            style__organization=org
        )
        serializer = StyleRevisionSerializer(revision)

        return api_success(data=serializer.data)

    @action(detail=True, methods=['post'], url_path='parse')
    def parse(self, request, pk=None):
        """
        POST /api/v2/revisions/{id}/parse/
        Trigger AI parsing for this revision
        """
        from apps.parsing.tasks import parse_techpack_task
        from apps.parsing.models import ExtractionRun
        from apps.documents.models import Document

        org = self._get_organization(request)
        if org is None:
            return api_error(
                code=ErrorCodes.UNAUTHORIZED,
                message="Organization not found",
                status_code=status.HTTP_403_FORBIDDEN
            )

        revision = get_object_or_404(
            StyleRevision.objects.select_related('style'),
            pk=pk,
            style__organization=org
        )

        # Get targets from request (default: all)
        targets = request.data.get('targets', ['bom', 'measurement', 'construction'])

        # Get document (preferably tech pack)
        document = revision.documents.filter(
            doc_type='techpack'
        ).order_by('-uploaded_at').first()

        if not document:
            # Fall back to any document
            document = revision.documents.order_by('-uploaded_at').first()

        if not document:
            return api_error(
                code=ErrorCodes.VALIDATION_ERROR,
                message="No documents attached to this revision",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # Create extraction run
        extraction_run = ExtractionRun.objects.create(
            document=document,
            style_revision=revision,
            status='pending'
        )

        # Trigger Celery task
        task = parse_techpack_task.delay(
            extraction_run_id=str(extraction_run.id),
            targets=targets
        )

        return api_success(
            data={
                'extraction_run_id': str(extraction_run.id),
                'job_id': str(task.id),
                'status': 'queued',
                'message': f'Parsing started for {len(targets)} targets',
                'targets': targets
            },
            status_code=status.HTTP_202_ACCEPTED
        )

    @action(detail=True, methods=['get'], url_path='draft')
    def get_draft(self, request, pk=None):
        """
        GET /api/v2/revisions/{id}/draft/
        Get AI-extracted draft data (not yet verified)
        """
        org = self._get_organization(request)
        if org is None:
            return api_error(
                code=ErrorCodes.UNAUTHORIZED,
                message="Organization not found",
                status_code=status.HTTP_403_FORBIDDEN
            )

        revision = get_object_or_404(
            StyleRevision.objects.select_related('style'),
            pk=pk,
            style__organization=org
        )

        # Collect all issues from draft data
        all_issues = []
        if revision.draft_bom_data:
            all_issues.extend(revision.draft_bom_data.get('issues', []))
        if revision.draft_measurement_data:
            all_issues.extend(revision.draft_measurement_data.get('issues', []))
        if revision.draft_construction_data:
            all_issues.extend(revision.draft_construction_data.get('issues', []))

        return api_success(data={
            'bom': revision.draft_bom_data,
            'measurement': revision.draft_measurement_data,
            'construction': revision.draft_construction_data,
            'issues': all_issues
        })

    @action(detail=True, methods=['patch'], url_path='draft')
    def update_draft(self, request, pk=None):
        """
        PATCH /api/v2/revisions/{id}/draft/
        Update draft data (human corrections)
        """
        org = self._get_organization(request)
        if org is None:
            return api_error(
                code=ErrorCodes.UNAUTHORIZED,
                message="Organization not found",
                status_code=status.HTTP_403_FORBIDDEN
            )

        revision = get_object_or_404(
            StyleRevision.objects.select_related('style'),
            pk=pk,
            style__organization=org
        )

        # Update draft data
        if 'bom' in request.data:
            revision.draft_bom_data = request.data['bom']
        if 'measurement' in request.data:
            revision.draft_measurement_data = request.data['measurement']
        if 'construction' in request.data:
            revision.draft_construction_data = request.data['construction']

        revision.save()

        return api_success(
            data={
                'message': 'Draft data updated',
                'revision_id': str(revision.id)
            }
        )

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """
        POST /api/v2/revisions/{id}/approve/
        Approve revision: write draft data to verified tables (BOMItem/Measurement/ConstructionStep)
        """
        from apps.styles.models import BOMItem, Measurement, ConstructionStep
        from django.utils import timezone

        org = self._get_organization(request)
        if org is None:
            return api_error(
                code=ErrorCodes.UNAUTHORIZED,
                message="Organization not found",
                status_code=status.HTTP_403_FORBIDDEN
            )

        revision = get_object_or_404(
            StyleRevision.objects.select_related('style'),
            pk=pk,
            style__organization=org
        )

        # Check for blocking issues (severity=error)
        all_issues = []
        if revision.draft_bom_data:
            all_issues.extend(revision.draft_bom_data.get('issues', []))
        if revision.draft_measurement_data:
            all_issues.extend(revision.draft_measurement_data.get('issues', []))
        if revision.draft_construction_data:
            all_issues.extend(revision.draft_construction_data.get('issues', []))

        blocking_issues = [i for i in all_issues if i.get('severity') == 'error']

        if blocking_issues:
            return api_error(
                code=ErrorCodes.VALIDATION_ERROR,
                message=f"Cannot approve: {len(blocking_issues)} blocking issues found",
                details={'blocking_issues': blocking_issues},
                status_code=status.HTTP_400_BAD_REQUEST
            )

        # Write draft data to verified tables
        created_counts = {
            'bom_items': 0,
            'measurements': 0,
            'construction_steps': 0
        }

        # Create BOM items
        if revision.draft_bom_data and revision.draft_bom_data.get('items'):
            for item_data in revision.draft_bom_data['items']:
                BOMItem.objects.create(
                    style_revision=revision,
                    item_number=item_data.get('item_number'),
                    category=item_data.get('category'),
                    description=item_data.get('description', ''),
                    material_code=item_data.get('material_code', ''),
                    color=item_data.get('color', ''),
                    supplier_id=item_data.get('supplier_id'),  # FK if available
                    consumption=item_data.get('consumption'),
                    uom=item_data.get('uom', ''),
                    placement=item_data.get('placement', ''),
                    notes=item_data.get('notes', ''),
                    ai_extracted=True,
                    ai_confidence=item_data.get('field_confidence', {}).get('description', 0.0)
                )
                created_counts['bom_items'] += 1

        # Create Measurements
        if revision.draft_measurement_data and revision.draft_measurement_data.get('points'):
            for point_data in revision.draft_measurement_data['points']:
                Measurement.objects.create(
                    style_revision=revision,
                    point_code=point_data.get('point_code', ''),
                    point_name=point_data.get('point_name', ''),
                    measurement_method=point_data.get('measurement_method', ''),
                    tolerance=point_data.get('tolerance', ''),
                    size_values=point_data.get('sizes', {}),
                    ai_extracted=True
                )
                created_counts['measurements'] += 1

        # Create Construction Steps
        if revision.draft_construction_data and revision.draft_construction_data.get('steps'):
            for step_data in revision.draft_construction_data['steps']:
                ConstructionStep.objects.create(
                    style_revision=revision,
                    step_number=step_data.get('step_number'),
                    step_name=step_data.get('step_name', ''),
                    description=step_data.get('description', ''),
                    machine_type=step_data.get('machine_type', ''),
                    special_requirements=step_data.get('special_requirements', ''),
                    qc_checkpoints=step_data.get('qc_checkpoints', []),
                    ai_extracted=True
                )
                created_counts['construction_steps'] += 1

        # Update revision status
        revision.status = 'approved'
        revision.approved_at = timezone.now()
        revision.approved_by = request.user if request.user.is_authenticated else None
        revision.save()

        return api_success(
            data={
                'message': 'Revision approved successfully',
                'revision_id': str(revision.id),
                'created': created_counts
            }
        )
