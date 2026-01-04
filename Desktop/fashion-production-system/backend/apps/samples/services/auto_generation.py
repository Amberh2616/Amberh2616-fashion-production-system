"""
P0-1: Create Request Auto-Generation Service
自動生成樣衣相關文件的核心服務

When a SampleRequest is created, this service atomically generates:
1. SampleRequest
2. SampleRun #1 (idempotent)
3. RunBOMLine snapshots (from verified BOM)
4. RunOperation snapshots (from verified Construction)
5. SampleMWO (draft)
6. SampleCostEstimate (draft)

設計原則：
- SampleRun 是唯一的「執行真相來源」
- 使用快照模式，不回寫 Phase 2 資料
- 冪等設計，防止重複生成
"""

from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from typing import Dict, Any, Optional, Tuple
import hashlib
import json

from apps.styles.models import StyleRevision, BOMItem, ConstructionStep
from ..models import (
    SampleRequest,
    SampleRun,
    RunBOMLine,
    RunOperation,
    SampleMWO,
    SampleCostEstimate,
    SampleRequestType,
    SampleRunType,
    SampleRunStatus,
)


# ==================== Source Hash Generation ====================

def generate_source_hash(revision: StyleRevision) -> str:
    """
    生成來源資料 hash，用於追溯

    Args:
        revision: StyleRevision instance

    Returns:
        SHA256 hash string (64 chars)
    """
    # Get verified BOM items
    bom_items = BOMItem.objects.filter(
        revision=revision,
        is_verified=True
    ).order_by('item_number')

    # Get verified construction steps
    construction_steps = ConstructionStep.objects.filter(
        revision=revision,
        is_verified=True
    ).order_by('step_number')

    payload = {
        'revision_id': str(revision.id),
        'bom': [
            {
                'material': item.material_name,
                'consumption': str(item.consumption or 0),
                'uom': item.unit or '',
                'supplier': item.supplier or '',
                'unit_price': str(item.unit_price or 0),
            }
            for item in bom_items
        ],
        'ops': [
            {
                'step_no': step.step_number,
                'desc': step.description or '',
            }
            for step in construction_steps
        ],
    }

    json_str = json.dumps(payload, sort_keys=True)
    return hashlib.sha256(json_str.encode()).hexdigest()


# ==================== Document Number Generation ====================

def get_next_sequence(prefix: str) -> int:
    """
    Get next sequence number for document numbering.
    Simple implementation - in production, use Redis or DB sequence.
    """
    from django.db.models import Max

    if prefix == 'mwo':
        last = SampleMWO.objects.filter(
            mwo_no__startswith=f"MWO-{timezone.now().strftime('%y%m')}"
        ).aggregate(Max('mwo_no'))['mwo_no__max']
    elif prefix == 'estimate':
        last = SampleCostEstimate.objects.filter(
            snapshot_hash__startswith=f"EST-{timezone.now().strftime('%y%m')}"
        ).count()
        return last + 1
    else:
        return 1

    if last:
        try:
            # Extract number from format: PREFIX-YYMM-XXXXXX
            seq = int(last.split('-')[-1])
            return seq + 1
        except (ValueError, IndexError):
            pass
    return 1


def generate_mwo_no() -> str:
    """Generate MWO number: MWO-YYMM-XXXXXX"""
    prefix = timezone.now().strftime('MWO-%y%m-')
    seq = get_next_sequence('mwo')
    return f"{prefix}{seq:06d}"


def generate_estimate_no() -> str:
    """Generate Estimate number: EST-YYMM-XXXXXX-v1"""
    prefix = timezone.now().strftime('EST-%y%m-')
    seq = get_next_sequence('estimate')
    return f"{prefix}{seq:06d}-v1"


# ==================== Validation ====================

def validate_revision_for_request(revision: StyleRevision) -> None:
    """
    Gating Rule (Option A - Strict):
    Revision must have at least one verified BOM item before creating Request.

    Args:
        revision: StyleRevision to validate

    Raises:
        ValidationError: If no verified BOM items exist
    """
    verified_count = BOMItem.objects.filter(
        revision=revision,
        is_verified=True
    ).count()

    if verified_count == 0:
        raise ValidationError(
            "Revision must have at least one verified BOM item. "
            "Please verify BOM items in Phase 2 before creating a sample request."
        )


# ==================== Snapshot Functions ====================

def snapshot_bom_to_run(revision: StyleRevision, run: SampleRun) -> int:
    """
    Snapshot verified BOM items to RunBOMLine.

    Args:
        revision: Source revision
        run: Target SampleRun

    Returns:
        Number of lines created
    """
    bom_items = BOMItem.objects.filter(
        revision=revision,
        is_verified=True
    ).order_by('item_number')

    created = 0
    for idx, item in enumerate(bom_items, start=1):
        RunBOMLine.objects.create(
            run=run,
            line_no=idx,
            material_name=item.material_name or '',
            material_name_zh=getattr(item, 'material_name_zh', '') or '',  # Copy Chinese translation
            material_code=item.supplier_article_no or '',
            category=item.category or '',
            color=item.color or '',
            uom=item.unit or 'pcs',
            consumption=item.consumption or Decimal('0'),
            wastage_pct=Decimal('0.05'),  # Default 5%
            unit_price=item.unit_price,
            supplier_name=item.supplier or '',
            supplier_id=None,  # TODO: Add supplier FK if available
            leadtime_days=item.leadtime_days or 0,
            source_bom_item_id=item.id,
        )
        created += 1

    return created


def snapshot_operations_to_run(revision: StyleRevision, run: SampleRun) -> int:
    """
    Snapshot verified construction steps to RunOperation.

    Args:
        revision: Source revision
        run: Target SampleRun

    Returns:
        Number of operations created
    """
    steps = ConstructionStep.objects.filter(
        revision=revision,
        is_verified=True,
        translation_status='confirmed'
    ).order_by('step_number')

    created = 0
    for step in steps:
        RunOperation.objects.create(
            run=run,
            step_no=step.step_number,
            step_name='',  # ConstructionStep doesn't have step_name field
            description=step.description or '',
            description_zh=getattr(step, 'description_zh', '') or '',
            machine_type=step.machine_type or '',
            machine_type_zh=getattr(step, 'machine_type_zh', '') or '',
            stitch_type_zh=getattr(step, 'stitch_type_zh', '') or '',
            std_minutes=0,  # TODO: Add from step if available
            special_requirements='',  # ConstructionStep doesn't have special_requirements field
            source_construction_id=step.id,
        )
        created += 1

    return created


# ==================== Main Service Function ====================

@transaction.atomic
def create_with_initial_run(
    revision_id: str,
    payload: Dict[str, Any],
    user=None,
    skip_validation: bool = False
) -> Tuple[SampleRequest, SampleRun, Dict[str, Any]]:
    """
    P0-1 核心服務：建立 SampleRequest 並自動生成所有相關文件

    原子交易內自動生成：
    1. SampleRequest
    2. SampleRun #1
    3. Run Snapshots (BOM + Operations)
    4. MWO (draft)
    5. Estimate (draft)

    Args:
        revision_id: StyleRevision UUID
        payload: Request data containing:
            - request_type: proto/fit/sales/photo/etc.
            - quantity_requested: Number of samples
            - priority: low/normal/urgent
            - due_date: Optional due date
            - brand_name: Optional brand name
            - need_quote_first: Boolean
        user: Optional User instance
        skip_validation: Skip BOM verification check (for development)

    Returns:
        Tuple of (SampleRequest, SampleRun, documents_info)

    Raises:
        ValidationError: If revision not found or no verified BOM
    """
    # 1. Get revision
    try:
        revision = StyleRevision.objects.select_related('style').get(id=revision_id)
    except StyleRevision.DoesNotExist:
        raise ValidationError(f"StyleRevision with id {revision_id} not found")

    # 2. Validate revision has verified BOM (Gating Rule)
    if not skip_validation:
        validate_revision_for_request(revision)

    # 3. Generate source hash
    source_hash = generate_source_hash(revision)

    # 4. Map request_type to run_type
    request_type = payload.get('request_type', SampleRequestType.PROTO)
    run_type_map = {
        SampleRequestType.PROTO: SampleRunType.PROTO,
        SampleRequestType.FIT: SampleRunType.FIT,
        SampleRequestType.SALES: SampleRunType.SALES,
        SampleRequestType.PHOTO: SampleRunType.PHOTO,
    }
    run_type = run_type_map.get(request_type, SampleRunType.OTHER)

    # 5. Create SampleRequest
    request = SampleRequest.objects.create(
        revision=revision,
        request_type=request_type,
        request_type_custom=payload.get('request_type_custom', ''),
        quantity_requested=payload.get('quantity_requested', 1),
        priority=payload.get('priority', 'normal'),
        due_date=payload.get('due_date'),
        brand_name=payload.get('brand_name', ''),
        need_quote_first=payload.get('need_quote_first', False),
        notes_internal=payload.get('notes_internal', ''),
        notes_customer=payload.get('notes_customer', ''),
        created_by=user,
    )

    # 6. Create SampleRun #1 (idempotent with get_or_create)
    run, run_created = SampleRun.objects.get_or_create(
        sample_request=request,
        run_no=1,
        defaults={
            'run_type': run_type,
            'status': SampleRunStatus.DRAFT,
            'quantity': payload.get('quantity_requested', 1),
            'target_due_date': payload.get('due_date'),
            'source_revision_id': revision.id,
            'source_revision_label': revision.revision_label,
            'source_hash': source_hash,
            'snapshotted_at': timezone.now(),
            'created_by': user,
        }
    )

    documents = {
        'run_created': run_created,
        'mwo_id': None,
        'mwo_no': None,
        'estimate_id': None,
        'estimate_no': None,
        'bom_line_count': 0,
        'operation_count': 0,
    }

    if run_created:
        # 7. Snapshot BOM to RunBOMLine
        documents['bom_line_count'] = snapshot_bom_to_run(revision, run)

        # 8. Snapshot Operations to RunOperation
        documents['operation_count'] = snapshot_operations_to_run(revision, run)

        # 9. Build enhanced MWO snapshots from RunBOMLine and RunOperation
        # Enhanced BOM snapshot with material code, color, total consumption, Chinese translation
        bom_snapshot = [{
            'line_no': line.line_no,
            'material_code': line.material_code or '',  # Article #
            'material_name': line.material_name,
            'material_name_zh': line.material_name_zh or '',  # NEW: Chinese translation
            'category': line.category,
            'color': line.color or '',
            'supplier_name': line.supplier_name,
            'consumption': str(line.consumption),
            'total_consumption': str(line.consumption * run.quantity),  # Total = unit × qty
            'uom': line.uom,
            'unit_price': str(line.unit_price or 0),
            'leadtime_days': line.leadtime_days or 0,
        } for line in run.bom_lines.all()]

        # Enhanced construction snapshot with stitch type, special notes, Chinese translation
        construction_snapshot = [{
            'step_no': op.step_no,
            'description': op.description,
            'description_zh': getattr(op, 'description_zh', '') or '',  # NEW: Chinese translation
            'machine_type': op.machine_type,
            'machine_type_zh': getattr(op, 'machine_type_zh', '') or '',  # NEW: Chinese translation
            'std_minutes': op.std_minutes or 0,
            'special_requirements': op.special_requirements or '',
        } for op in run.operations.all()]

        # Enhanced QC snapshot with label positions and packaging requirements
        qc_snapshot = {
            'labels': [
                {
                    'type': 'logo',
                    'position': 'TBD - To be defined based on style requirements',
                    'method': 'Heat transfer / Sewn-in'
                },
                {
                    'type': 'care_label',
                    'position': 'TBD - To be defined based on style requirements',
                    'method': 'Sewn-in'
                }
            ],
            'packaging': {
                'polybag': 'Standard polybag (size TBD)',
                'carton': 'Standard carton box',
                'special_requirements': []
            },
            'inspections': {
                'measurement_tolerance': 'Per spec sheet',
                'visual_inspection': 'Per AQL standard',
                'functional_tests': []
            }
        }

        # 10. Create MWO (draft) with populated snapshots
        mwo = SampleMWO.objects.create(
            sample_run=run,
            version_no=1,
            is_latest=True,
            mwo_no=generate_mwo_no(),
            factory_name='TBD',
            status='draft',
            source_revision_id=revision.id,
            snapshot_hash=source_hash,
            bom_snapshot_json=bom_snapshot,
            construction_snapshot_json=construction_snapshot,
            qc_snapshot_json=qc_snapshot,  # NEW: Populated QC snapshot
        )
        documents['mwo_id'] = str(mwo.id)
        documents['mwo_no'] = mwo.mwo_no

        # 10. Create Estimate (draft)
        # Calculate material cost from BOM
        material_cost = Decimal('0.00')
        for bom_line in run.bom_lines.all():
            if bom_line.unit_price and bom_line.consumption:
                line_cost = (bom_line.consumption * bom_line.unit_price).quantize(
                    Decimal('0.01'), rounding=ROUND_HALF_UP
                )
                material_cost += line_cost

        estimate = SampleCostEstimate.objects.create(
            sample_request=request,
            estimate_version=1,
            status='draft',
            currency='USD',
            estimated_total=material_cost,
            breakdown_snapshot_json={
                'materials': [
                    {
                        'material_name': line.material_name,
                        'consumption': str(line.consumption),
                        'unit_price': str(line.unit_price or 0),
                        'line_cost': str(
                            (line.consumption * (line.unit_price or Decimal('0'))).quantize(
                                Decimal('0.01'), rounding=ROUND_HALF_UP
                            )
                        ),
                    }
                    for line in run.bom_lines.all()
                ],
                'labor': [],
                'overhead': [],
            },
            source='manual',
            source_revision_id=revision.id,
            created_by=user,
        )
        documents['estimate_id'] = str(estimate.id)
        documents['estimate_no'] = generate_estimate_no()

    return request, run, documents
