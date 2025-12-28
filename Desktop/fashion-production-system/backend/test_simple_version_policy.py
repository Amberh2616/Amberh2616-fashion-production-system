"""
Phase 2-2I: Version Policy Acceptance Testing (Simplified)
===========================================================
Uses existing revision with BOM data for quick testing.

Usage:
    python manage.py shell < test_simple_version_policy.py
"""

from decimal import Decimal
import json
from django.test import RequestFactory
from django.contrib.auth import get_user_model

from apps.styles.models import StyleRevision
from apps.costing.models import CostSheet
from apps.costing.views import cost_sheets_list_create, cost_sheet_detail_update, cost_sheet_duplicate

User = get_user_model()

print("\n" + "="*70)
print("Phase 2-2I: Version Policy Acceptance Tests (Simplified)")
print("="*70)

# Use existing revision with BOM
REVISION_ID = 'abbfd005-159b-4ad8-a3cc-87c73098fc81'

try:
    revision = StyleRevision.objects.get(id=REVISION_ID)
    print(f"\n✅ Using existing revision: {revision.id}")
    print(f"   Style: {revision.style.style_number if revision.style else 'N/A'}")
    print(f"   BOM items: {revision.bom_items.count()}")
except StyleRevision.DoesNotExist:
    print(f"\n❌ Revision {REVISION_ID} not found!")
    print("   Please run the import_bom_demo.py command first.")
    exit(1)

# Get or create test user
user, created = User.objects.get_or_create(
    username='test_vp_user',
    defaults={'email': 'test_vp@example.com'}
)
print(f"✅ Using user: {user.username}")

# Clean up old test cost sheets
CostSheet.objects.filter(revision=revision, costing_type='sample').delete()
print("✅ Cleaned up old test cost sheets")

# Create test CostSheet v1
factory = RequestFactory()

print("\n📋 Creating test CostSheet v1...")
request = factory.post(
    f'/api/v2/revisions/{revision.id}/cost-sheets/',
    data=json.dumps({
        'costing_type': 'sample',
        'labor_cost': '12.00',
        'overhead_cost': '3.00',
        'freight_cost': '2.50',
        'packaging_cost': '1.50',
        'testing_cost': '0.50',
        'margin_pct': '30.00',
        'wastage_pct': '5.00',
        'notes': 'Test v1'
    }),
    content_type='application/json'
)
request.user = user

response = cost_sheets_list_create(request, revision_id=str(revision.id))
if response.status_code == 201:
    cost_sheet_v1 = CostSheet.objects.get(revision=revision, costing_type='sample', version_no=1)
    print(f"✅ Created CostSheet v1 (ID: {cost_sheet_v1.id})")
    print(f"   - Labor: ${cost_sheet_v1.labor_cost}")
    print(f"   - Margin: {cost_sheet_v1.margin_pct}%")
    print(f"   - Material Cost: ${cost_sheet_v1.material_cost}")
    print(f"   - Total Cost: ${cost_sheet_v1.total_cost}")
    print(f"   - Unit Price: ${cost_sheet_v1.unit_price}")
    print(f"   - Lines: {cost_sheet_v1.lines.count()}")
else:
    print(f"❌ Failed to create CostSheet: {response.status_code}")
    print(str(response.data if hasattr(response, 'data') else response.content))
    exit(1)

print("\n" + "="*70)
print("Starting Tests...")
print("="*70)

# ============================================================================
# TEST 1: PATCH with B-field → 409 Conflict
# ============================================================================
print("\n📝 TEST 1: PATCH with B-field (margin_pct) → 409 Conflict")
print("-" * 70)

request = factory.patch(
    f'/api/v2/cost-sheets/{cost_sheet_v1.id}/',
    data=json.dumps({'margin_pct': '25.00'}),
    content_type='application/json'
)
request.user = user

response = cost_sheet_detail_update(request, cost_sheet_id=cost_sheet_v1.id)

if response.status_code == 409:
    print("✅ TEST 1 PASSED")
    print(f"   - Got 409 Conflict as expected")
    print(f"   - Error: {response.data.get('error')}")
    print(f"   - Message: {response.data.get('message')}")
    test1_passed = True
else:
    print(f"❌ TEST 1 FAILED")
    print(f"   - Expected 409, got {response.status_code}")
    test1_passed = False

# ============================================================================
# TEST 2: PATCH with A-field only → 200 OK
# ============================================================================
print("\n📝 TEST 2: PATCH with A-field (labor_cost) → 200 OK")
print("-" * 70)

old_labor = cost_sheet_v1.labor_cost
old_total = cost_sheet_v1.total_cost
old_version_no = cost_sheet_v1.version_no

request = factory.patch(
    f'/api/v2/cost-sheets/{cost_sheet_v1.id}/',
    data=json.dumps({'labor_cost': '13.50'}),
    content_type='application/json'
)
request.user = user

response = cost_sheet_detail_update(request, cost_sheet_id=cost_sheet_v1.id)

if response.status_code == 200:
    cost_sheet_v1.refresh_from_db()

    checks = [
        cost_sheet_v1.version_no == old_version_no,
        cost_sheet_v1.labor_cost == Decimal('13.50'),
        cost_sheet_v1.total_cost != old_total,
        cost_sheet_v1.updated_by == user
    ]

    if all(checks):
        print("✅ TEST 2 PASSED")
        print(f"   - Status: 200 OK")
        print(f"   - Version No: {cost_sheet_v1.version_no} (unchanged)")
        print(f"   - Labor: ${old_labor} → ${cost_sheet_v1.labor_cost}")
        print(f"   - Total: ${old_total} → ${cost_sheet_v1.total_cost} (recalculated)")
        test2_passed = True
    else:
        print("❌ TEST 2 FAILED: Some checks failed")
        test2_passed = False
else:
    print(f"❌ TEST 2 FAILED: Expected 200, got {response.status_code}")
    test2_passed = False

# ============================================================================
# TEST 3: Duplicate → 201 Created
# ============================================================================
print("\n📝 TEST 3: Duplicate with new margin/wastage → 201 Created")
print("-" * 70)

request = factory.post(
    f'/api/v2/cost-sheets/{cost_sheet_v1.id}/duplicate/',
    data=json.dumps({
        'margin_pct': '25.00',
        'wastage_pct': '5.00',
        'notes': 'Test v2 - Client requested 25% margin'
    }),
    content_type='application/json'
)
request.user = user

response = cost_sheet_duplicate(request, cost_sheet_id=cost_sheet_v1.id)

if response.status_code == 201:
    cost_sheet_v2 = CostSheet.objects.get(revision=revision, costing_type='sample', version_no=2)
    cost_sheet_v1.refresh_from_db()

    checks = [
        cost_sheet_v2.version_no == 2,
        cost_sheet_v2.is_current == True,
        cost_sheet_v1.is_current == False,
        cost_sheet_v2.margin_pct == Decimal('25.00'),
        cost_sheet_v2.wastage_pct == Decimal('5.00'),
        cost_sheet_v2.labor_cost == cost_sheet_v1.labor_cost,
        cost_sheet_v2.lines.count() == cost_sheet_v1.lines.count(),
        cost_sheet_v2.created_by == user
    ]

    if all(checks):
        print("✅ TEST 3 PASSED")
        print(f"   - Status: 201 Created")
        print(f"\n   v1 Status:")
        print(f"   - Version No: {cost_sheet_v1.version_no}")
        print(f"   - is_current: {cost_sheet_v1.is_current}")
        print(f"   - Margin: {cost_sheet_v1.margin_pct}%")
        print(f"\n   v2 Status:")
        print(f"   - Version No: {cost_sheet_v2.version_no}")
        print(f"   - is_current: {cost_sheet_v2.is_current}")
        print(f"   - Margin: {cost_sheet_v2.margin_pct}%")
        print(f"   - Unit Price: ${cost_sheet_v2.unit_price}")
        print(f"   - Lines Count: {cost_sheet_v2.lines.count()}")
        test3_passed = True
    else:
        print("❌ TEST 3 FAILED: Some checks failed")
        test3_passed = False
else:
    print(f"❌ TEST 3 FAILED: Expected 201, got {response.status_code}")
    test3_passed = False

# ============================================================================
# Summary
# ============================================================================
print("\n" + "="*70)
print("Test Summary")
print("="*70)

if test1_passed:
    print("✅ TEST 1: PATCH with B-field → 409 Conflict")
else:
    print("❌ TEST 1: FAILED")

if test2_passed:
    print("✅ TEST 2: PATCH with A-field → 200 OK + Auto-recalc")
else:
    print("❌ TEST 2: FAILED")

if test3_passed:
    print("✅ TEST 3: Duplicate → 201 Created + Version Management")
else:
    print("❌ TEST 3: FAILED")

if test1_passed and test2_passed and test3_passed:
    print("\n🎉 All tests PASSED!")
    print("="*70)
    print("Phase 2-2I: Version Policy System is ready for production!")
    print("="*70 + "\n")
else:
    print("\n⚠️ Some tests FAILED. Please review the output above.")
    print("="*70 + "\n")
