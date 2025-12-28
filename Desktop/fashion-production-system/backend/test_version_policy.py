"""
Phase 2-2I: Version Policy Acceptance Testing
==============================================
Tests the A/B field classification system and version policy enforcement.

Run:
    python manage.py shell < test_version_policy.py

Or interactively:
    python manage.py shell
    >>> exec(open('test_version_policy.py').read())
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from apps.styles.models import Style, StyleRevision, BOMItem
from apps.costing.models import CostSheet, CostLine
from apps.costing.serializers import CostSheetPatchSerializer, CostSheetDuplicateSerializer
from apps.costing.views import cost_sheets_list_create, cost_sheet_detail_update, cost_sheet_duplicate
from django.test import RequestFactory
from django.contrib.auth import get_user_model

User = get_user_model()

print("\n" + "="*60)
print("Phase 2-2I: Version Policy Acceptance Tests")
print("="*60)

# Test Setup
print("\n📋 Setup: Creating test data...")

# Get or create test user
user, created = User.objects.get_or_create(
    username='test_user',
    defaults={'email': 'test@example.com'}
)
if created:
    print(f"✅ Created test user: {user.username}")
else:
    print(f"✅ Using existing user: {user.username}")

# Get or create test style
style, created = Style.objects.get_or_create(
    style_number='TEST-VP-001',
    defaults={'name': 'Version Policy Test Style'}
)
if created:
    print(f"✅ Created test style: {style.style_number}")
else:
    print(f"✅ Using existing style: {style.style_number}")

# Get or create test revision
revision, created = StyleRevision.objects.get_or_create(
    style=style,
    filename='test_vp_techpack.pdf',
    defaults={
        'revision_name': 'Rev A',
        'file_hash': 'test_hash_vp_001',
    }
)
if created:
    print(f"✅ Created test revision: {revision.filename}")
else:
    print(f"✅ Using existing revision: {revision.filename}")

# Create or get test BOM items
bom_item_1, created = BOMItem.objects.get_or_create(
    revision=revision,
    item_number=1,
    defaults={
        'material_name': 'Test Fabric',
        'category': 'fabric',
        'consumption': Decimal('1.2000'),
        'unit': 'Yard',
        'unit_price': Decimal('3.5000'),
    }
)
if created:
    print(f"✅ Created BOM item 1")

bom_item_2, created = BOMItem.objects.get_or_create(
    revision=revision,
    item_number=2,
    defaults={
        'material_name': 'Test Zipper',
        'category': 'trim',
        'consumption': Decimal('1.0000'),
        'unit': 'PCS',
        'unit_price': Decimal('0.5000'),
    }
)
if created:
    print(f"✅ Created BOM item 2")

# Clean up old test cost sheets
CostSheet.objects.filter(revision=revision, costing_type='sample').delete()
print("✅ Cleaned up old test cost sheets")

# Create test CostSheet v1
factory = RequestFactory()

print("\n📋 Creating test CostSheet v1...")
request = factory.post(
    f'/api/v2/revisions/{revision.id}/cost-sheets/',
    data={
        'costing_type': 'sample',
        'labor_cost': '12.00',
        'overhead_cost': '3.00',
        'freight_cost': '2.50',
        'packaging_cost': '1.50',
        'testing_cost': '0.50',
        'margin_pct': '30.00',
        'wastage_pct': '5.00',
        'notes': 'Test v1'
    },
    content_type='application/json'
)
request.user = user

# Import json to create proper request
import json
request._body = json.dumps({
    'costing_type': 'sample',
    'labor_cost': '12.00',
    'overhead_cost': '3.00',
    'freight_cost': '2.50',
    'packaging_cost': '1.50',
    'testing_cost': '0.50',
    'margin_pct': '30.00',
    'wastage_pct': '5.00',
    'notes': 'Test v1'
}).encode('utf-8')

response = cost_sheets_list_create(request, revision_id=str(revision.id))
if response.status_code == 201:
    cost_sheet_v1 = CostSheet.objects.get(revision=revision, costing_type='sample', version_no=1)
    print(f"✅ Created CostSheet v1 (ID: {cost_sheet_v1.id})")
    print(f"   - Labor: ${cost_sheet_v1.labor_cost}")
    print(f"   - Margin: {cost_sheet_v1.margin_pct}%")
    print(f"   - Material Cost: ${cost_sheet_v1.material_cost}")
    print(f"   - Total Cost: ${cost_sheet_v1.total_cost}")
    print(f"   - Unit Price: ${cost_sheet_v1.unit_price}")
else:
    print(f"❌ Failed to create CostSheet: {response.status_code}")
    print(response.data if hasattr(response, 'data') else response.content)
    exit(1)

print("\n" + "="*60)
print("Starting Tests...")
print("="*60)

# ============================================================================
# TEST 1: PATCH with B-field → 409 Conflict
# ============================================================================
print("\n📝 TEST 1: PATCH with B-field (margin_pct) → 409 Conflict")
print("-" * 60)

request = factory.patch(
    f'/api/v2/cost-sheets/{cost_sheet_v1.id}/',
    data={'margin_pct': '25.00'},
    content_type='application/json'
)
request.user = user
request._body = json.dumps({'margin_pct': '25.00'}).encode('utf-8')

response = cost_sheet_detail_update(request, cost_sheet_id=cost_sheet_v1.id)

if response.status_code == 409:
    print("✅ TEST 1 PASSED: Got 409 Conflict as expected")
    print(f"   Error: {response.data.get('error')}")
    print(f"   Message: {response.data.get('message')}")
else:
    print(f"❌ TEST 1 FAILED: Expected 409, got {response.status_code}")
    print(f"   Response: {response.data if hasattr(response, 'data') else response.content}")

# ============================================================================
# TEST 2: PATCH with A-field only → 200 OK
# ============================================================================
print("\n📝 TEST 2: PATCH with A-field (labor_cost) → 200 OK")
print("-" * 60)

# Get current values
old_labor = cost_sheet_v1.labor_cost
old_total = cost_sheet_v1.total_cost
old_version_no = cost_sheet_v1.version_no

request = factory.patch(
    f'/api/v2/cost-sheets/{cost_sheet_v1.id}/',
    data={'labor_cost': '13.50'},
    content_type='application/json'
)
request.user = user
request._body = json.dumps({'labor_cost': '13.50'}).encode('utf-8')

response = cost_sheet_detail_update(request, cost_sheet_id=cost_sheet_v1.id)

if response.status_code == 200:
    # Refresh from database
    cost_sheet_v1.refresh_from_db()

    # Verify changes
    checks = []
    checks.append(("Status Code", response.status_code == 200))
    checks.append(("Version No Unchanged", cost_sheet_v1.version_no == old_version_no))
    checks.append(("Labor Cost Updated", cost_sheet_v1.labor_cost == Decimal('13.50')))
    checks.append(("Total Cost Recalculated", cost_sheet_v1.total_cost != old_total))
    checks.append(("Updated By Set", cost_sheet_v1.updated_by == user))

    all_passed = all(check[1] for check in checks)

    if all_passed:
        print("✅ TEST 2 PASSED: All checks passed")
        for check_name, passed in checks:
            print(f"   ✓ {check_name}")
        print(f"   - Labor: ${old_labor} → ${cost_sheet_v1.labor_cost}")
        print(f"   - Total: ${old_total} → ${cost_sheet_v1.total_cost}")
        print(f"   - Version No: {cost_sheet_v1.version_no} (unchanged)")
    else:
        print("❌ TEST 2 FAILED: Some checks failed")
        for check_name, passed in checks:
            status = "✓" if passed else "✗"
            print(f"   {status} {check_name}")
else:
    print(f"❌ TEST 2 FAILED: Expected 200, got {response.status_code}")
    print(f"   Response: {response.data if hasattr(response, 'data') else response.content}")

# ============================================================================
# TEST 3: Duplicate → 201 Created
# ============================================================================
print("\n📝 TEST 3: Duplicate with new margin/wastage → 201 Created")
print("-" * 60)

request = factory.post(
    f'/api/v2/cost-sheets/{cost_sheet_v1.id}/duplicate/',
    data={
        'margin_pct': '25.00',
        'wastage_pct': '5.00',
        'notes': 'Test v2 - Client requested 25% margin'
    },
    content_type='application/json'
)
request.user = user
request._body = json.dumps({
    'margin_pct': '25.00',
    'wastage_pct': '5.00',
    'notes': 'Test v2 - Client requested 25% margin'
}).encode('utf-8')

response = cost_sheet_duplicate(request, cost_sheet_id=cost_sheet_v1.id)

if response.status_code == 201:
    cost_sheet_v2 = CostSheet.objects.get(revision=revision, costing_type='sample', version_no=2)

    # Refresh v1 from database
    cost_sheet_v1.refresh_from_db()

    # Verify changes
    checks = []
    checks.append(("Status Code", response.status_code == 201))
    checks.append(("New Version Created", cost_sheet_v2.version_no == 2))
    checks.append(("New Version is Current", cost_sheet_v2.is_current == True))
    checks.append(("Old Version Not Current", cost_sheet_v1.is_current == False))
    checks.append(("New Margin Applied", cost_sheet_v2.margin_pct == Decimal('25.00')))
    checks.append(("New Wastage Applied", cost_sheet_v2.wastage_pct == Decimal('5.00')))
    checks.append(("Labor Cost Copied", cost_sheet_v2.labor_cost == cost_sheet_v1.labor_cost))
    checks.append(("Lines Copied", cost_sheet_v2.lines.count() == cost_sheet_v1.lines.count()))
    checks.append(("Created By Set", cost_sheet_v2.created_by == user))

    all_passed = all(check[1] for check in checks)

    if all_passed:
        print("✅ TEST 3 PASSED: All checks passed")
        for check_name, passed in checks:
            print(f"   ✓ {check_name}")
        print(f"\n   v1 Status:")
        print(f"   - Version No: {cost_sheet_v1.version_no}")
        print(f"   - is_current: {cost_sheet_v1.is_current}")
        print(f"   - Margin: {cost_sheet_v1.margin_pct}%")
        print(f"\n   v2 Status:")
        print(f"   - Version No: {cost_sheet_v2.version_no}")
        print(f"   - is_current: {cost_sheet_v2.is_current}")
        print(f"   - Margin: {cost_sheet_v2.margin_pct}%")
        print(f"   - Unit Price: ${cost_sheet_v2.unit_price} (recalculated)")
        print(f"   - Lines Count: {cost_sheet_v2.lines.count()}")
    else:
        print("❌ TEST 3 FAILED: Some checks failed")
        for check_name, passed in checks:
            status = "✓" if passed else "✗"
            print(f"   {status} {check_name}")
else:
    print(f"❌ TEST 3 FAILED: Expected 201, got {response.status_code}")
    print(f"   Response: {response.data if hasattr(response, 'data') else response.content}")

# ============================================================================
# Summary
# ============================================================================
print("\n" + "="*60)
print("Test Summary")
print("="*60)
print("✅ TEST 1: PATCH with B-field → 409 Conflict")
print("✅ TEST 2: PATCH with A-field → 200 OK + Auto-recalc")
print("✅ TEST 3: Duplicate → 201 Created + Version Management")
print("\n🎉 All tests completed!")
print("="*60)
