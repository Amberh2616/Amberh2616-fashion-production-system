"""
Parsing Tasks - v2.2.1
Celery tasks for AI parsing (Tech Pack extraction)
"""

from celery import shared_task
from django.utils import timezone
from datetime import timedelta
import uuid

from .models import ExtractionRun
from apps.styles.models import StyleRevision


@shared_task(bind=True)
def parse_techpack_task(self, extraction_run_id: str, targets: list):
    """
    Celery task: Parse Tech Pack and extract BOM/Measurement/Construction

    Phase 1: STUB VERSION - Returns fake data matching AI-JSON-SCHEMA_v2.2.1
    Phase 2+: Real AI implementation with PyMuPDF + GPT-4 Vision

    Args:
        extraction_run_id: UUID of ExtractionRun
        targets: List of ['bom', 'measurement', 'construction']

    Returns:
        dict: Task result
    """
    try:
        # Get extraction run
        extraction_run = ExtractionRun.objects.select_related(
            'style_revision', 'document'
        ).get(pk=extraction_run_id)

        # Update status to processing
        extraction_run.status = 'processing'
        extraction_run.save(update_fields=['status'])

        # STUB: Generate fake AI data matching schema
        stub_data = generate_stub_extraction_data(
            revision=extraction_run.style_revision,
            targets=targets
        )

        # Update revision draft data
        revision = extraction_run.style_revision

        if 'bom' in targets and 'bom' in stub_data:
            revision.draft_bom_data = stub_data['bom']

        if 'measurement' in targets and 'measurement' in stub_data:
            revision.draft_measurement_data = stub_data['measurement']

        if 'construction' in targets and 'construction' in stub_data:
            revision.draft_construction_data = stub_data['construction']

        revision.save(update_fields=[
            'draft_bom_data',
            'draft_measurement_data',
            'draft_construction_data'
        ])

        # Update extraction run
        extraction_run.status = 'completed'
        extraction_run.extracted_data = stub_data
        extraction_run.confidence_score = 0.85  # Stub confidence
        extraction_run.issues = stub_data.get('issues', [])
        extraction_run.ai_model = 'stub-v1.0'
        extraction_run.processing_time_ms = 2500  # Fake 2.5s
        extraction_run.api_cost = 1.20  # Fake $1.20
        extraction_run.completed_at = timezone.now()
        extraction_run.save()

        return {
            'status': 'success',
            'extraction_run_id': str(extraction_run_id),
            'targets_completed': targets,
            'confidence_score': extraction_run.confidence_score,
        }

    except ExtractionRun.DoesNotExist:
        return {
            'status': 'error',
            'message': f'ExtractionRun {extraction_run_id} not found'
        }
    except Exception as e:
        # Update extraction run to failed
        try:
            extraction_run = ExtractionRun.objects.get(pk=extraction_run_id)
            extraction_run.status = 'failed'
            extraction_run.completed_at = timezone.now()
            extraction_run.save()
        except:
            pass

        return {
            'status': 'error',
            'message': str(e)
        }


def generate_stub_extraction_data(revision: StyleRevision, targets: list) -> dict:
    """
    Generate stub AI extraction data matching AI-JSON-SCHEMA_v2.2.1_COMPLETE.md

    This is Phase 1 fake data to enable UI development.
    Replace with real AI parser in Phase 2.

    🆕 Added: Auto-translation using machine_translate()
    """
    from .utils.translate import machine_translate

    result = {}
    issues = []

    style_number = revision.style.style_number
    style_name = revision.style.style_name

    # BOM stub data
    if 'bom' in targets:
        result['bom'] = {
            'items': [
                {
                    'item_number': 1,
                    'category': 'fabric',
                    'description': 'Nulu fabric',
                    'description_zh': machine_translate('Nulu fabric'),  # 🆕 Auto-translate
                    'material_code': 'NULU-001',
                    'color': 'Black',
                    'supplier': None,  # Missing - will create issue
                    'consumption': None,  # Missing - will create issue
                    'uom': 'yard/pc',
                    'placement': 'Main body',
                    'notes': '',
                    'evidence': {
                        'source': 'techpack',
                        'page': 3,
                        'bbox': [100, 200, 400, 250],
                        'text_snippet': 'Main fabric: Nulu fabric, Black'
                    },
                    'field_confidence': {
                        'description': 0.95,
                        'material_code': 0.80,
                        'color': 0.92,
                        'supplier': 0.0,  # Missing
                        'consumption': 0.0  # Missing
                    }
                },
                {
                    'item_number': 2,
                    'category': 'trim',
                    'description': 'Elastic waistband 1" width',
                    'description_zh': machine_translate('Elastic waistband 1" width'),  # 🆕 Auto-translate
                    'material_code': 'ELAS-WB-1',
                    'color': 'Black',
                    'supplier': None,
                    'consumption': None,
                    'uom': 'cm/pc',
                    'placement': 'Waistband',
                    'notes': '',
                    'evidence': {
                        'source': 'techpack',
                        'page': 3,
                        'bbox': [100, 280, 400, 320],
                        'text_snippet': 'Elastic: 1" waistband elastic, black'
                    },
                    'field_confidence': {
                        'description': 0.90,
                        'material_code': 0.75,
                        'color': 0.88,
                        'supplier': 0.0,
                        'consumption': 0.0
                    }
                }
            ]
        }

        # Generate issues for missing fields
        bom_issues = [
            {
                'type': 'missing_field',
                'severity': 'error',
                'target': 'bom',
                'item_number': 1,
                'field': 'supplier',
                'message': 'Supplier not found in Tech Pack for item #1',
                'suggested_fix': 'Please assign supplier manually'
            },
            {
                'type': 'missing_field',
                'severity': 'error',
                'target': 'bom',
                'item_number': 1,
                'field': 'consumption',
                'message': 'Consumption not found in Tech Pack for item #1',
                'suggested_fix': 'Use pre-estimate or wait for marker report'
            },
            {
                'type': 'missing_field',
                'severity': 'error',
                'target': 'bom',
                'item_number': 2,
                'field': 'supplier',
                'message': 'Supplier not found in Tech Pack for item #2',
                'suggested_fix': 'Please assign supplier manually'
            },
            {
                'type': 'missing_field',
                'severity': 'error',
                'target': 'bom',
                'item_number': 2,
                'field': 'consumption',
                'message': 'Consumption not found in Tech Pack for item #2',
                'suggested_fix': 'Use trim estimation rule or manual input'
            }
        ]

        # Add issues to both BOM data and global issues list
        result['bom']['issues'] = bom_issues
        issues.extend(bom_issues)

    # Measurement stub data
    if 'measurement' in targets:
        result['measurement'] = {
            'points': [
                {
                    'point_code': 'A',
                    'point_name': 'Chest width',
                    'measurement_method': 'Laid flat, across chest 1" below armhole',
                    'tolerance': '+/- 0.5cm',
                    'sizes': {
                        'XS': 40.0,
                        'S': 42.5,
                        'M': 45.0,
                        'L': 47.5,
                        'XL': 50.0
                    },
                    'evidence': {
                        'source': 'techpack',
                        'page': 5,
                        'bbox': [120, 300, 500, 340],
                        'text_snippet': 'A: Chest width - 40/42.5/45/47.5/50'
                    },
                    'field_confidence': {
                        'point_name': 0.92,
                        'measurement_method': 0.75,
                        'sizes': 0.88
                    }
                },
                {
                    'point_code': 'B',
                    'point_name': 'Body length',
                    'measurement_method': 'HPS to bottom hem',
                    'tolerance': '+/- 0.5cm',
                    'sizes': {
                        'XS': 60.0,
                        'S': 61.0,
                        'M': 62.0,
                        'L': 63.0,
                        'XL': 64.0
                    },
                    'evidence': {
                        'source': 'techpack',
                        'page': 5,
                        'bbox': [120, 360, 500, 400],
                        'text_snippet': 'B: Body length HPS - 60/61/62/63/64'
                    },
                    'field_confidence': {
                        'point_name': 0.90,
                        'measurement_method': 0.85,
                        'sizes': 0.92
                    }
                }
            ],
            'issues': []
        }

    # Construction stub data
    if 'construction' in targets:
        result['construction'] = {
            'steps': [
                {
                    'step_number': 1,
                    'step_name': 'Cut fabric',
                    'description': 'Cut main body panels from Nulu fabric per marker',
                    'description_zh': machine_translate('Cut main body panels from Nulu fabric per marker'),  # 🆕 Auto-translate
                    'machine_type': 'Cutting machine',
                    'machine_type_zh': machine_translate('Cutting machine'),  # 🆕 Auto-translate
                    'special_requirements': 'Mind fabric stretch direction',
                    'qc_checkpoints': ['Check grain line', 'Verify pattern placement'],
                    'evidence': {
                        'source': 'techpack',
                        'page': 7,
                        'bbox': [100, 200, 500, 250],
                        'text_snippet': 'Step 1: Cut fabric panels'
                    },
                    'field_confidence': {
                        'step_name': 0.88,
                        'description': 0.75,
                        'machine_type': 0.70
                    }
                },
                {
                    'step_number': 2,
                    'step_name': 'Sew side seams',
                    'description': 'Join front and back panels at side seams using flatlock stitch',
                    'description_zh': machine_translate('Join front and back panels at side seams using flatlock stitch'),  # 🆕 Auto-translate
                    'machine_type': 'Flatlock machine',
                    'machine_type_zh': machine_translate('Flatlock machine'),  # 🆕 Auto-translate
                    'special_requirements': 'Use Nylon thread, 3-thread flatlock',
                    'qc_checkpoints': ['Check seam flatness', 'Verify stitch density'],
                    'evidence': {
                        'source': 'techpack',
                        'page': 7,
                        'bbox': [100, 280, 500, 330],
                        'text_snippet': 'Step 2: Flatlock side seams'
                    },
                    'field_confidence': {
                        'step_name': 0.90,
                        'description': 0.82,
                        'machine_type': 0.85
                    }
                }
            ],
            'issues': []
        }

    # Add global issues
    result['issues'] = issues

    return result
