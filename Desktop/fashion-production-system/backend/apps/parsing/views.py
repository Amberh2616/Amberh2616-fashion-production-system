from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from .models import ExtractionRun, DraftReviewItem, UploadedDocument
from .models_blocks import Revision, RevisionPage, DraftBlock, DraftBlockHistory
from .serializers import (
    ExtractionRunSerializer,
    DraftReviewItemSerializer,
    RevisionSerializer,
    RevisionListSerializer,
    DraftBlockSerializer,
    DraftBlockPatchSerializer,
    DraftBlockPositionSerializer,
    DraftBlockBatchPositionSerializer,
    UploadedDocumentSerializer,
    DocumentUploadSerializer,
)
from .services import classify_document
import os
import logging

logger = logging.getLogger(__name__)


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

    @action(detail=True, methods=["post"], url_path="translate-batch")
    def translate_batch(self, request, pk=None):
        """
        Batch translate all DraftBlocks for a revision

        POST /api/v2/revisions/{id}/translate-batch/
        Body: { "force": false }

        Returns:
            {
                "translated": 10,
                "skipped": 5,
                "errors": [],
                "total": 15
            }
        """
        from .services.techpack_translator import translate_draft_blocks

        force = request.data.get('force', False)
        result = translate_draft_blocks(revision_id=str(pk), force=force)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="export-bilingual-pdf")
    def export_bilingual_pdf(self, request, pk=None):
        """
        Export bilingual Tech Pack PDF (原始 PDF + 中文疊加)

        Query params:
        - font_size: 中文字體大小 (7/9/11，預設 9)

        Returns:
            PDF file download
        """
        from .services.techpack_pdf_export import export_techpack_bilingual_pdf

        revision = self.get_object()

        # 獲取字體大小參數
        font_size = int(request.query_params.get('font_size', 9))
        if font_size not in [7, 9, 11]:
            font_size = 9

        try:
            return export_techpack_bilingual_pdf(revision, font_size)
        except Exception as e:
            logger.error(f"Failed to export bilingual PDF for revision {pk}: {str(e)}")
            return Response(
                {"detail": f"Failed to export PDF: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"], url_path="page-image/(?P<page_num>[0-9]+)")
    def page_image(self, request, pk=None, page_num=None):
        """
        Render a PDF page as a PNG image

        GET /api/v2/revisions/{id}/page-image/{page_num}/

        Query params:
        - scale: Image scale factor (0.5-3.0, default 1.5)

        Returns:
            PNG image (image/png)
        """
        import fitz  # PyMuPDF
        from django.http import HttpResponse
        import io

        revision = self.get_object()
        page_num = int(page_num)

        # Validate page number
        if page_num < 1 or page_num > revision.page_count:
            return Response(
                {"detail": f"Page {page_num} out of range (1-{revision.page_count})"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get scale parameter
        scale = float(request.query_params.get('scale', 1.5))
        scale = max(0.5, min(3.0, scale))  # Clamp to 0.5-3.0

        try:
            # Open PDF and render page
            pdf_doc = fitz.open(revision.file.path)
            page = pdf_doc.load_page(page_num - 1)  # 0-indexed

            # Render with scale
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat)

            # Convert to PNG
            img_data = pix.tobytes("png")

            pdf_doc.close()

            # Return as image response
            response = HttpResponse(img_data, content_type="image/png")
            response['Content-Disposition'] = f'inline; filename="page_{page_num}.png"'
            return response

        except Exception as e:
            logger.error(f"Failed to render page {page_num} for revision {pk}: {str(e)}")
            return Response(
                {"detail": f"Failed to render page: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["patch"], url_path="blocks/positions")
    def update_block_positions(self, request, pk=None):
        """
        批量更新 Block 的翻譯疊加位置

        PATCH /api/v2/revisions/{id}/blocks/positions/

        Request:
        {
            "positions": [
                {"id": "uuid1", "overlay_x": 100, "overlay_y": 200, "overlay_visible": true},
                {"id": "uuid2", "overlay_x": 150, "overlay_y": 250, "overlay_visible": false}
            ]
        }

        Response:
        {
            "updated": 2,
            "errors": []
        }
        """
        revision = self.get_object()

        serializer = DraftBlockBatchPositionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        positions = serializer.validated_data['positions']
        updated = 0
        errors = []

        # 獲取這個 revision 下的所有 block IDs
        valid_block_ids = set(
            str(b.id) for b in DraftBlock.objects.filter(page__revision=revision)
        )

        for pos in positions:
            block_id = str(pos.get('id'))

            # 驗證 block 屬於這個 revision
            if block_id not in valid_block_ids:
                errors.append(f"Block {block_id} not found in this revision")
                continue

            try:
                DraftBlock.objects.filter(id=block_id).update(
                    overlay_x=pos.get('overlay_x'),
                    overlay_y=pos.get('overlay_y'),
                    overlay_visible=pos.get('overlay_visible', True)
                )
                updated += 1
            except Exception as e:
                errors.append(f"Failed to update block {block_id}: {str(e)}")

        return Response({
            "updated": updated,
            "errors": errors
        }, status=status.HTTP_200_OK)


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

    @action(detail=True, methods=["patch"], url_path="position")
    def update_position(self, request, pk=None):
        """
        更新單個 Block 的翻譯疊加位置

        PATCH /api/v2/draft-blocks/{id}/position/

        Request:
        {
            "overlay_x": 100,
            "overlay_y": 200,
            "overlay_visible": true
        }
        """
        block = self.get_object()

        serializer = DraftBlockPositionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        block.overlay_x = serializer.validated_data['overlay_x']
        block.overlay_y = serializer.validated_data['overlay_y']
        block.overlay_visible = serializer.validated_data.get('overlay_visible', True)
        block.save(update_fields=['overlay_x', 'overlay_y', 'overlay_visible', 'updated_at'])

        return Response(DraftBlockSerializer(block).data, status=status.HTTP_200_OK)


# ============================================
# UploadedDocument Views (P4)
# ============================================

class UploadedDocumentViewSet(viewsets.ModelViewSet):
    """
    UploadedDocument ViewSet for P4: Upload → Classify → Extract pipeline

    POST   /api/v2/uploaded-documents/        - Upload file
    GET    /api/v2/uploaded-documents/{id}/   - Get document details
    POST   /api/v2/uploaded-documents/{id}/classify/  - Trigger AI classification
    GET    /api/v2/uploaded-documents/{id}/status/    - Get processing status
    """
    queryset = UploadedDocument.objects.all()
    serializer_class = UploadedDocumentSerializer
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request, *args, **kwargs):
        """
        Upload a document file

        POST /api/v2/uploaded-documents/
        Body: multipart/form-data with 'file' field
        """
        upload_serializer = DocumentUploadSerializer(data=request.data)
        upload_serializer.is_valid(raise_exception=True)

        uploaded_file = upload_serializer.validated_data['file']
        filename = uploaded_file.name
        file_ext = '.' + filename.split('.')[-1].lower()

        try:
            # Get organization (TODO: from request.user when auth is ready)
            from apps.core.models import Organization
            org = Organization.objects.first()  # Temporary: use first org

            # Create UploadedDocument record
            doc = UploadedDocument.objects.create(
                organization=org,
                file=uploaded_file,
                filename=filename,
                file_type=file_ext[1:],  # Remove leading dot
                file_size=uploaded_file.size,
                status='uploaded',
                created_by=None,  # TODO: request.user when auth is ready
            )

            logger.info(f"Document uploaded successfully: {doc.id} - {filename}")

            # Return document details
            serializer = self.get_serializer(doc)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Error uploading document: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='classify')
    def classify(self, request, pk=None):
        """
        Trigger AI classification for uploaded document

        POST /api/v2/uploaded-documents/{id}/classify/

        This action:
        1. Reads the uploaded file
        2. Uses GPT-4o Vision to classify content types
        3. Updates classification_result field
        4. Changes status to 'classified'
        """
        doc = self.get_object()

        if doc.status not in ['uploaded', 'classifying']:
            return Response(
                {'error': f'Cannot classify document in status: {doc.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Update status
            doc.status = 'classifying'
            doc.save(update_fields=['status', 'updated_at'])

            # Get file path
            file_path = doc.file.path

            logger.info(f"Starting classification for document {doc.id}: {file_path}")

            # Classify document using AI
            classification_result = classify_document(file_path)

            # Update document
            doc.classification_result = classification_result
            doc.status = 'classified'
            doc.save(update_fields=['classification_result', 'status', 'updated_at'])

            logger.info(f"Classification completed for {doc.id}: {classification_result['file_type']}")

            serializer = self.get_serializer(doc)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Classification failed for {doc.id}: {str(e)}", exc_info=True)

            # Update status to failed
            doc.status = 'failed'
            doc.extraction_errors.append({
                'step': 'classification',
                'error': str(e)
            })
            doc.save(update_fields=['status', 'extraction_errors', 'updated_at'])

            return Response(
                {'error': f'Classification failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], url_path='status')
    def get_status(self, request, pk=None):
        """
        Get processing status for uploaded document

        GET /api/v2/uploaded-documents/{id}/status/

        Returns:
        - status: current processing status
        - classification_result: AI classification result (if available)
        - progress: processing progress information
        """
        doc = self.get_object()

        progress = {
            'uploaded': doc.status != 'uploaded',
            'classified': doc.status in ['classified', 'extracting', 'extracted', 'completed'],
            'extracted': doc.status in ['extracted', 'completed'],
        }

        response_data = {
            'id': str(doc.id),
            'status': doc.status,
            'filename': doc.filename,
            'classification_result': doc.classification_result,
            'extraction_errors': doc.extraction_errors,
            'progress': progress,
            'created_at': doc.created_at.isoformat(),
            'updated_at': doc.updated_at.isoformat(),
        }

        # ⚡ Add revision IDs if available (for navigation after extraction)
        if doc.style_revision:
            response_data['style_revision_id'] = str(doc.style_revision.id)
        if doc.tech_pack_revision:
            response_data['tech_pack_revision_id'] = str(doc.tech_pack_revision.id)

        return Response(response_data)

    @action(detail=True, methods=['post'], url_path='extract')
    def extract(self, request, pk=None):
        """
        Trigger AI extraction for classified document

        POST /api/v2/uploaded-documents/{id}/extract/

        This action:
        1. Validates document is classified
        2. Extracts Tech Pack, BOM, and Measurement data using AI
        3. Creates StyleRevision with extracted data
        4. Changes status to 'extracted'
        """
        doc = self.get_object()

        if doc.status not in ['classified', 'extracting']:
            return Response(
                {'error': f'Cannot extract document in status: {doc.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Update status
            doc.status = 'extracting'
            doc.save(update_fields=['status', 'updated_at'])

            logger.info(f"Starting extraction for document {doc.id}")

            # Get classification result
            classification = doc.classification_result
            if not classification:
                raise ValueError("No classification result found")

            # 1. Create Revision (for Tech Pack review) and StyleRevision (for BOM/Measurement)
            from apps.styles.models import Style, StyleRevision
            from apps.parsing.models_blocks import Revision as TechPackRevision
            import pdfplumber

            # Extract style number from filename (e.g., "LW1FLWS TECH PACK.pdf" → "LW1FLWS")
            style_number = doc.filename.split()[0] if ' ' in doc.filename else doc.filename.split('.')[0]

            # Get or create Style
            style, _ = Style.objects.get_or_create(
                organization=doc.organization,
                style_number=style_number,
                defaults={
                    'style_name': f'{style_number} (Auto-generated)',
                    'season': 'SS25',  # Default season
                    'customer': 'Unknown',  # Default customer
                }
            )

            # Create StyleRevision (for BOM and Measurement)
            style_revision = StyleRevision.objects.create(
                organization=doc.organization,
                style=style,
                revision_label=f'Rev {StyleRevision.objects.filter(style=style).count() + 1}',
                status='draft'
            )

            # Get page count
            with pdfplumber.open(doc.file.path) as pdf:
                page_count = len(pdf.pages)

            # Create TechPackRevision (for Tech Pack review with DraftBlocks)
            tech_pack_revision = TechPackRevision.objects.create(
                file=doc.file,
                filename=doc.filename,
                page_count=page_count,
                status='uploaded'
            )

            logger.info(f"Created StyleRevision {style_revision.id} and TechPackRevision {tech_pack_revision.id} for Style {style.style_number}")

            # Use style_revision for BOM/Measurement, tech_pack_revision for DraftBlocks
            revision = style_revision

            # 2. Extract based on page types
            tech_pack_pages = [p['page'] for p in classification['pages'] if p['type'] == 'tech_pack']
            bom_pages = [p['page'] for p in classification['pages'] if p['type'] == 'bom_table']
            measurement_pages = [p['page'] for p in classification['pages'] if p['type'] == 'measurement_table']

            extraction_stats = {
                'tech_pack_blocks': 0,
                'bom_items': 0,
                'measurements': 0,
            }

            # 3. Extract Tech Pack annotations (if any)
            if tech_pack_pages:
                logger.info(f"Extracting Tech Pack from pages: {tech_pack_pages}")
                from apps.parsing.utils.vision_extract import extract_text_from_pdf_page_vision
                from apps.parsing.utils.translate import batch_translate
                from apps.parsing.models_blocks import RevisionPage, DraftBlock
                from django.db import transaction
                import fitz  # PyMuPDF for getting page dimensions

                # Open PDF to get page dimensions
                pdf_doc = fitz.open(doc.file.path)

                # 处理所有 Tech Pack 页面
                for page_num in tech_pack_pages:  # Process all pages
                    try:
                        # Extract text blocks
                        extracted_blocks = extract_text_from_pdf_page_vision(doc.file.path, page_num)

                        # Get page dimensions from PDF
                        pdf_page = pdf_doc.load_page(page_num - 1)  # 0-indexed
                        page_width = int(pdf_page.rect.width)
                        page_height = int(pdf_page.rect.height)

                        # Get or create page (use tech_pack_revision for DraftBlocks)
                        page_obj, _ = RevisionPage.objects.get_or_create(
                            revision=tech_pack_revision,
                            page_number=page_num,
                            defaults={
                                'width': page_width,
                                'height': page_height
                            }
                        )

                        # ⚡ 批量翻译（10-20倍加速）
                        texts_to_translate = [block.get('text', '').strip() for block in extracted_blocks]
                        translations = batch_translate(texts_to_translate)

                        # Save blocks with translation
                        with transaction.atomic():
                            for i, block in enumerate(extracted_blocks):
                                text = texts_to_translate[i]
                                if not text:
                                    continue

                                translation = translations[i] if i < len(translations) else ""

                                # Get bbox from block (from pdfplumber)
                                bbox = block.get('bbox', {})
                                bbox_x = bbox.get('x', 0)
                                bbox_y = bbox.get('y', 0)
                                bbox_width = bbox.get('width', 100)
                                bbox_height = bbox.get('height', 20)

                                # ⚠️ 過濾策略：只保存重要的 block
                                # 1. Vision 標註（圖形標註）→ 必須保留
                                # 2. 文字層（text_layer）→ 只保留長度 > 3 的文本（過濾單字母）
                                is_vision = block.get('is_vision', False)
                                is_text_layer = block.get('type') == 'text_layer'

                                # 過濾邏輯
                                if is_text_layer and len(text) <= 3:
                                    # 跳過短文本（單字母、縮寫）
                                    continue

                                # Create DraftBlock with real bbox
                                DraftBlock.objects.create(
                                    page=page_obj,
                                    source_text=text,
                                    translated_text=translation,
                                    bbox_x=bbox_x,
                                    bbox_y=bbox_y,
                                    bbox_width=bbox_width,
                                    bbox_height=bbox_height,
                                    block_type=block.get('type', 'callout'),
                                    status='auto',
                                )
                                extraction_stats['tech_pack_blocks'] += 1

                        logger.info(f"Page {page_num}: Extracted {len(extracted_blocks)} blocks")
                    except Exception as e:
                        logger.error(f"Failed to extract Tech Pack page {page_num}: {str(e)}")

                # Close PDF document
                pdf_doc.close()

            # 4. Extract BOM (if any)
            if bom_pages:
                logger.info(f"Extracting BOM from pages: {bom_pages}")
                from apps.parsing.services.bom_extractor import extract_bom_from_pages

                try:
                    bom_count = extract_bom_from_pages(doc.file.path, bom_pages, revision)
                    extraction_stats['bom_items'] = bom_count
                    logger.info(f"BOM extraction completed: {bom_count} items")
                except Exception as e:
                    logger.error(f"BOM extraction failed: {str(e)}")
                    doc.extraction_errors.append({
                        'step': 'bom_extraction',
                        'error': str(e)
                    })

            # 5. Extract Measurement (if any)
            if measurement_pages:
                logger.info(f"Extracting Measurement from pages: {measurement_pages}")
                from apps.parsing.services.measurement_extractor import extract_measurements_from_page

                for page_num in measurement_pages[:2]:  # Limit to first 2 pages
                    try:
                        measurement_count = extract_measurements_from_page(doc.file.path, page_num, revision)
                        extraction_stats['measurements'] += measurement_count
                        logger.info(f"Page {page_num}: Extracted {measurement_count} measurements")
                    except Exception as e:
                        logger.error(f"Measurement extraction failed for page {page_num}: {str(e)}")
                        doc.extraction_errors.append({
                            'step': 'measurement_extraction',
                            'page': page_num,
                            'error': str(e)
                        })

            # 6. Update document status
            doc.style_revision = revision
            doc.tech_pack_revision = tech_pack_revision  # ⚡ Save TechPackRevision reference
            doc.status = 'extracted'
            doc.save(update_fields=['style_revision', 'tech_pack_revision', 'status', 'extraction_errors', 'updated_at'])

            logger.info(f"Extraction completed for {doc.id}: {extraction_stats}")

            serializer = self.get_serializer(doc)
            response_data = serializer.data
            response_data['extraction_stats'] = extraction_stats
            response_data['revision_id'] = str(revision.id)
            response_data['style_revision_id'] = str(revision.id)  # ⚡ For BOM/Spec navigation
            response_data['tech_pack_revision_id'] = str(tech_pack_revision.id)  # ⚡ For translation review navigation

            return Response(response_data)

        except Exception as e:
            logger.error(f"Extraction failed for {doc.id}: {str(e)}", exc_info=True)

            # Update status to failed
            doc.status = 'failed'
            doc.extraction_errors.append({
                'step': 'extraction',
                'error': str(e)
            })
            doc.save(update_fields=['status', 'extraction_errors', 'updated_at'])

            return Response(
                {'error': f'Extraction failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='batch-upload')
    def batch_upload(self, request):
        """
        批量上傳 Tech Pack（ZIP 文件）

        POST /api/v2/uploaded-documents/batch-upload/

        Request:
        - file: ZIP file containing PDFs

        File naming conventions:
        - Case A: {style_number}.pdf - 單個 PDF 包含所有內容
        - Case B: {style_number}_techpack.pdf, {style_number}_bom.pdf - 多個 PDF 按款式分組

        Response:
        {
            "total_files": 10,
            "styles_found": 5,
            "styles_created": 3,
            "documents_created": 10,
            "errors": [],
            "style_results": {
                "LW1FLWS": {
                    "style_id": "uuid",
                    "revision_id": "uuid",
                    "documents": [...],
                    "status": "created"
                }
            }
        }
        """
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided. Please upload a ZIP file.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded_file = request.FILES['file']

        # Validate file type
        if not uploaded_file.name.lower().endswith('.zip'):
            return Response(
                {'error': 'Invalid file type. Please upload a ZIP file.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from apps.parsing.services.batch_upload_service import BatchUploadService

            service = BatchUploadService(user=request.user if request.user.is_authenticated else None)
            result = service.process_zip(uploaded_file)

            return Response({
                'total_files': result.total_files,
                'styles_found': result.styles_found,
                'styles_created': result.styles_created,
                'documents_created': result.documents_created,
                'errors': result.errors,
                'style_results': result.style_results,
            }, status=status.HTTP_200_OK if not result.errors else status.HTTP_207_MULTI_STATUS)

        except Exception as e:
            logger.error(f"Batch upload failed: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Batch upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'], url_path='batch-process')
    def batch_process(self, request):
        """
        批量處理已上傳的文檔（分類 + 提取）

        POST /api/v2/uploaded-documents/batch-process/

        Request:
        {
            "document_ids": ["uuid1", "uuid2", ...],
            "async": false  // 是否異步處理
        }

        Response:
        {
            "total": 10,
            "processed": 8,
            "failed": 2,
            "results": {
                "uuid1": {"status": "completed", "blocks_count": 50},
                "uuid2": {"status": "error", "error": "..."}
            }
        }
        """
        document_ids = request.data.get('document_ids', [])

        if not document_ids:
            return Response(
                {'error': 'No document_ids provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate document IDs
        existing_docs = UploadedDocument.objects.filter(id__in=document_ids)
        if existing_docs.count() != len(document_ids):
            found_ids = set(str(d.id) for d in existing_docs)
            missing_ids = [did for did in document_ids if did not in found_ids]
            return Response(
                {'error': f'Documents not found: {missing_ids}'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if async processing is requested
        run_async = request.data.get('async', False)

        if run_async:
            # TODO: Implement Celery task for async processing
            return Response(
                {'error': 'Async processing not yet implemented'},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )

        try:
            from apps.parsing.services.batch_upload_service import BatchProcessingService

            service = BatchProcessingService()
            results = service.process_documents(document_ids)

            # Calculate summary
            completed = sum(1 for r in results.values() if r.get('status') == 'completed')
            failed = sum(1 for r in results.values() if r.get('status') == 'error')

            return Response({
                'total': len(document_ids),
                'processed': completed,
                'failed': failed,
                'results': results,
            }, status=status.HTTP_200_OK if failed == 0 else status.HTTP_207_MULTI_STATUS)

        except Exception as e:
            logger.error(f"Batch process failed: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Batch process failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
