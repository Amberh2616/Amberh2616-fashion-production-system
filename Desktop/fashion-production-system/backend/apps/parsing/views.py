from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import ExtractionRun, DraftReviewItem
from .models_blocks import Revision, RevisionPage, DraftBlock, DraftBlockHistory
from .serializers import (
    ExtractionRunSerializer,
    DraftReviewItemSerializer,
    RevisionSerializer,
    RevisionListSerializer,
    DraftBlockSerializer,
    DraftBlockPatchSerializer,
)


class ExtractionRunViewSet(viewsets.ModelViewSet):
    queryset = ExtractionRun.objects.all()
    serializer_class = ExtractionRunSerializer


class DraftReviewItemViewSet(viewsets.ModelViewSet):
    queryset = DraftReviewItem.objects.all()
    serializer_class = DraftReviewItemSerializer


# ============================================
# Block-Based Parsing Views
# ============================================

class RevisionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Revision ViewSet - Draft Review 主 API

    GET /api/v2/revisions/          - 列表（輕量）
    GET /api/v2/revisions/{id}/     - 詳細（含 pages + blocks）
    POST /api/v2/revisions/{id}/approve/ - Approve revision
    """
    queryset = Revision.objects.all()
    ordering = ['-created_at']  # Fix: Use created_at, not created

    def get_queryset(self):
        """
        根據 action 動態調整 prefetch
        """
        queryset = super().get_queryset()
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related('pages__blocks')
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return RevisionListSerializer
        return RevisionSerializer

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        """
        Approve a revision - marks it as completed

        Validation:
        - Must have at least 1 block

        State transition:
        - Any status → "completed"
        """
        revision = self.get_object()

        # ✅ 基本驗證：必須至少有 1 個 block
        has_blocks = DraftBlock.objects.filter(page__revision=revision).exists()
        if not has_blocks:
            return Response(
                {"detail": "Cannot approve: no blocks found for this revision."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ✅ 狀態切換
        # STATUS_CHOICES: uploaded, parsing, parsed, reviewing, completed
        # 沒有 "approved"，所以用 "completed"
        revision.status = "completed"
        revision.save(update_fields=["status", "updated_at"])

        serializer = self.get_serializer(revision)
        return Response(serializer.data, status=status.HTTP_200_OK)


class DraftBlockViewSet(viewsets.ModelViewSet):
    """
    DraftBlock ViewSet - 審稿編輯 API

    GET    /api/v2/draft-blocks/{id}/      - 取得單個 block
    PATCH  /api/v2/draft-blocks/{id}/      - 編輯 edited_text + status
    """
    queryset = DraftBlock.objects.select_related('page__revision').all()

    def get_serializer_class(self):
        if self.action in ['partial_update', 'update']:
            return DraftBlockPatchSerializer
        return DraftBlockSerializer

    def perform_update(self, serializer):
        """
        審稿時自動切換 status + 記錄 History

        規則：
        - 如果 edited_text 有改 → status = "edited"
        - 自動創建 DraftBlockHistory 記錄
        """
        instance = self.get_object()

        # 記錄修改前的值
        previous_text = instance.edited_text or instance.translated_text or instance.source_text

        # 如果 edited_text 被修改，自動設為 "edited"
        if 'edited_text' in serializer.validated_data:
            new_text = serializer.validated_data['edited_text']
            if new_text and new_text != instance.translated_text:
                serializer.validated_data['status'] = 'edited'

            # ✅ P2: 自動寫入 DraftBlockHistory
            if new_text != previous_text:
                # 先保存以獲取最新的 instance
                updated_instance = serializer.save()

                # 創建歷史記錄
                DraftBlockHistory.objects.create(
                    block=updated_instance,
                    previous_text=previous_text,
                    new_text=new_text,
                    changed_by='',  # TODO: 接入真實用戶系統後填入 request.user
                )
                return  # 已經 save 過了，不要再 save

        # 如果沒有創建 history，正常 save
        serializer.save()
