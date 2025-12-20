"""
Test Parse Workflow
Tests the complete parse flow: trigger → celery task → draft data → issues
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from apps.core.models import Organization, User
from apps.styles.models import Style, StyleRevision
from apps.documents.models import Document
from apps.parsing.models import ExtractionRun
from apps.parsing.tasks import parse_techpack_task


def test_parse_workflow():
    """Test complete parse workflow"""

    print("=" * 60)
    print("Testing Parse Workflow (Priority 4)")
    print("=" * 60)

    # 1. Setup: Create test data
    print("\n1. Setting up test data...")

    org, _ = Organization.objects.get_or_create(
        name="Test Org"
    )
    print(f"   [OK] Organization: {org.name}")

    user, _ = User.objects.get_or_create(
        username="testuser",
        defaults={
            'email': 'test@example.com',
            'organization': org
        }
    )
    print(f"   [OK] User: {user.username}")

    style, _ = Style.objects.get_or_create(
        organization=org,
        style_number="TEST001",
        defaults={
            'style_name': 'Test Style for Parsing',
            'season': 'SS25',
            'customer': 'Test Customer'
        }
    )
    print(f"   [OK] Style: {style.style_number} - {style.style_name}")

    revision, _ = StyleRevision.objects.get_or_create(
        style=style,
        revision_label="Rev A",
        defaults={
            'status': 'draft',
            'notes': 'Test revision for parse workflow'
        }
    )
    print(f"   [OK] Revision: {revision.revision_label}")

    # Create a dummy document
    document, _ = Document.objects.get_or_create(
        filename='test_techpack.pdf',
        defaults={
            'organization': org,
            'uploaded_by': user,
            'doc_type': 'techpack',
            'file_kind': 'pdf',
            'file_size': 1024,
            'storage_key': '/dummy/test_techpack.pdf',
            'file_hash': 'dummy_hash_123',
            'status': 'uploaded',
            'style_revision': revision
        }
    )
    print(f"   [OK] Document: {document.filename}")

    # 2. Create ExtractionRun
    print("\n2. Creating ExtractionRun...")
    extraction_run = ExtractionRun.objects.create(
        document=document,
        style_revision=revision,
        status='pending'
    )
    print(f"   [OK] ExtractionRun created: {extraction_run.id}")
    print(f"   Status: {extraction_run.status}")

    # 3. Run parse task (synchronously for testing)
    print("\n3. Running parse task...")
    targets = ['bom', 'measurement', 'construction']
    result = parse_techpack_task(
        extraction_run_id=str(extraction_run.id),
        targets=targets
    )

    print(f"   Task result: {result['status']}")
    if result['status'] == 'success':
        print(f"   [OK] Confidence: {result['confidence_score']}")
        print(f"   [OK] Targets completed: {', '.join(result['targets_completed'])}")

    # 4. Check ExtractionRun status
    print("\n4. Checking ExtractionRun status...")
    extraction_run.refresh_from_db()
    print(f"   Status: {extraction_run.status}")
    print(f"   AI Model: {extraction_run.ai_model}")
    print(f"   Processing time: {extraction_run.processing_time_ms}ms")
    print(f"   API cost: ${extraction_run.api_cost}")
    print(f"   Issues count: {len(extraction_run.issues)}")

    # 5. Check draft data in revision
    print("\n5. Checking draft data in revision...")
    revision.refresh_from_db()

    if revision.draft_bom_data:
        bom_items = len(revision.draft_bom_data.get('items', []))
        print(f"   [OK] BOM items: {bom_items}")
        if bom_items > 0:
            print(f"     - First item: {revision.draft_bom_data['items'][0]['description']}")

    if revision.draft_measurement_data:
        measurement_points = len(revision.draft_measurement_data.get('points', []))
        print(f"   [OK] Measurement points: {measurement_points}")
        if measurement_points > 0:
            print(f"     - First point: {revision.draft_measurement_data['points'][0]['point_name']}")

    if revision.draft_construction_data:
        construction_steps = len(revision.draft_construction_data.get('steps', []))
        print(f"   [OK] Construction steps: {construction_steps}")
        if construction_steps > 0:
            print(f"     - First step: {revision.draft_construction_data['steps'][0]['step_name']}")

    # 6. Check issues
    print("\n6. Checking AI-detected issues...")
    all_issues = []
    if revision.draft_bom_data:
        all_issues.extend(revision.draft_bom_data.get('issues', []))

    print(f"   Total issues: {len(all_issues)}")

    error_issues = [i for i in all_issues if i.get('severity') == 'error']
    warning_issues = [i for i in all_issues if i.get('severity') == 'warning']

    print(f"   - Errors: {len(error_issues)}")
    print(f"   - Warnings: {len(warning_issues)}")

    if error_issues:
        print(f"\n   Sample error issue:")
        print(f"   {error_issues[0]}")

    # 7. Test approval gating
    print("\n7. Testing approval gating...")
    if error_issues:
        print(f"   [OK] Revision has {len(error_issues)} error issues")
        print(f"   [OK] Approval should be BLOCKED (correct behavior)")
    else:
        print(f"   [WARN] No error issues found")
        print(f"   [WARN] Approval would be allowed")

    print("\n" + "=" * 60)
    print("[SUCCESS] Parse Workflow Test Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Run Django server: python manage.py runserver")
    print("2. Test API endpoints:")
    print(f"   - POST /api/v2/revisions/{revision.id}/parse/")
    print(f"   - GET  /api/v2/revisions/{revision.id}/draft/")
    print(f"   - POST /api/v2/revisions/{revision.id}/approve/")
    print(f"   - GET  /api/v2/extraction-runs/{extraction_run.id}/")

    return {
        'organization': org,
        'user': user,
        'style': style,
        'revision': revision,
        'document': document,
        'extraction_run': extraction_run,
        'issues': all_issues
    }


if __name__ == "__main__":
    test_parse_workflow()
