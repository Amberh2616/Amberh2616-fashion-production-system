"""
Test script for BOM → PO Phase 1 new fields
Run: python manage.py shell < test_bom_po_phase1.py
"""

from apps.core.models import Organization, User
from apps.styles.models import Style, StyleRevision, BOMItem
from apps.orders.models import SalesOrder, SalesOrderItem
from apps.consumption.models import OrderItemBOM
from apps.procurement.models import Supplier, PurchaseOrder
from django.utils import timezone
from decimal import Decimal

print("\n" + "="*60)
print("Testing BOM → PO Phase 1 New Fields")
print("="*60 + "\n")

# Get or create test organization
org, _ = Organization.objects.get_or_create(
    name="Test Org",
    defaults={'code': 'TEST'}
)
print(f"✓ Organization: {org.name}")

# Create test style and revision
style, _ = Style.objects.get_or_create(
    organization=org,
    style_number="TEST001",
    defaults={
        'style_name': 'Test Tank',
        'season': 'SS25'
    }
)
print(f"✓ Style: {style.style_number} - {style.style_name}")

revision, _ = StyleRevision.objects.get_or_create(
    style=style,
    revision_label="Rev A",
    defaults={'status': 'approved'}
)
print(f"✓ Revision: {revision.revision_label}")

# Test 1: BOMItem with supplier_article_no
print("\n" + "-"*60)
print("TEST 1: BOMItem.supplier_article_no")
print("-"*60)

bom_item, created = BOMItem.objects.get_or_create(
    revision=revision,
    item_number=1,
    defaults={
        'category': 'fabric',
        'material_name': 'Nulu Fabric',
        'supplier': 'Eclat Textile',
        'supplier_article_no': 'ECL-NL-001-BLK',  # ⭐ NEW FIELD
        'consumption': Decimal('1.5'),
        'consumption_maturity': 'pre_estimate',
        'unit': 'yards'
    }
)

if created:
    print(f"✅ Created new BOMItem")
else:
    # Update if exists
    bom_item.supplier_article_no = 'ECL-NL-001-BLK'
    bom_item.save()
    print(f"✅ Updated existing BOMItem")

print(f"   Material: {bom_item.material_name}")
print(f"   Supplier: {bom_item.supplier}")
print(f"   Supplier Article No: {bom_item.supplier_article_no} ⭐")

# Create test order
sales_order, _ = SalesOrder.objects.get_or_create(
    organization=org,
    order_number="SO-TEST-001",
    defaults={
        'customer_name': 'Test Customer',
        'order_date': timezone.now().date(),
        'status': 'confirmed'
    }
)
print(f"\n✓ Sales Order: {sales_order.order_number}")

order_item, _ = SalesOrderItem.objects.get_or_create(
    sales_order=sales_order,
    style_revision=revision,
    defaults={
        'color': 'Black',
        'quantity': 1000,
        'unit_price': Decimal('25.00')
    }
)
print(f"✓ Order Item: {order_item.style_revision} - {order_item.color}")

# Test 2: OrderItemBOM with three-stage values and new source fields
print("\n" + "-"*60)
print("TEST 2: OrderItemBOM Three-Stage Values + Source Tracking")
print("-"*60)

order_bom, created = OrderItemBOM.objects.get_or_create(
    order_item=order_item,
    template_bom_item=bom_item,
    defaults={
        'consumption_per_piece': Decimal('1.5'),
        'consumption_maturity': 'pre_estimate',
        'total_consumption': Decimal('1500.0'),
        # ⭐ NEW FIELDS
        'pre_estimate_value': Decimal('1.5'),
        'confirmed_value': None,  # Not confirmed yet
        'locked_value': None,  # Not locked yet
        'source_type': 'tech_pack',
        'source_ref': f'BOMItem-{bom_item.id}'
    }
)

if created:
    print(f"✅ Created new OrderItemBOM")
else:
    # Update if exists
    order_bom.pre_estimate_value = Decimal('1.5')
    order_bom.source_type = 'tech_pack'
    order_bom.source_ref = f'BOMItem-{bom_item.id}'
    order_bom.save()
    print(f"✅ Updated existing OrderItemBOM")

print(f"   Template BOM: {order_bom.template_bom_item.material_name}")
print(f"   Consumption Maturity: {order_bom.consumption_maturity}")
print(f"   Pre-Estimate Value: {order_bom.pre_estimate_value} ⭐")
print(f"   Confirmed Value: {order_bom.confirmed_value} ⭐")
print(f"   Locked Value: {order_bom.locked_value} ⭐")
print(f"   Source Type: {order_bom.source_type} ⭐")
print(f"   Source Ref: {order_bom.source_ref} ⭐")

# Simulate marker report confirmation
print("\n   Simulating Marker Report confirmation...")
order_bom.confirmed_value = Decimal('1.45')  # More accurate from marker
order_bom.consumption_maturity = 'confirmed'
order_bom.source_type = 'marker'
order_bom.source_ref = 'MARKER-2024-001'
order_bom.save()

print(f"   ✅ Updated to confirmed:")
print(f"      Confirmed Value: {order_bom.confirmed_value} ⭐")
print(f"      Source: {order_bom.source_type} ({order_bom.source_ref}) ⭐")

# Test 3: PurchaseOrder with po_type
print("\n" + "-"*60)
print("TEST 3: PurchaseOrder.po_type")
print("-"*60)

supplier, _ = Supplier.objects.get_or_create(
    organization=org,
    name="Eclat Textile",
    defaults={
        'supplier_code': 'ECLAT',
        'supplier_type': 'fabric'
    }
)
print(f"✓ Supplier: {supplier.name}")

# RFQ PO
po_rfq, created = PurchaseOrder.objects.get_or_create(
    organization=org,
    po_number="PO-RFQ-001",
    defaults={
        'po_type': 'rfq',  # ⭐ NEW FIELD
        'supplier': supplier,
        'status': 'draft',
        'po_date': timezone.now().date(),
        'expected_delivery': timezone.now().date(),
        'total_amount': Decimal('1500.00')
    }
)

if created:
    print(f"✅ Created RFQ PO")
else:
    po_rfq.po_type = 'rfq'
    po_rfq.save()
    print(f"✅ Updated RFQ PO")

print(f"   PO Number: {po_rfq.po_number}")
print(f"   PO Type: {po_rfq.get_po_type_display()} ⭐")
print(f"   Status: {po_rfq.status}")

# Production PO
po_prod, created = PurchaseOrder.objects.get_or_create(
    organization=org,
    po_number="PO-PROD-001",
    defaults={
        'po_type': 'production',  # ⭐ NEW FIELD
        'supplier': supplier,
        'status': 'draft',
        'po_date': timezone.now().date(),
        'expected_delivery': timezone.now().date(),
        'total_amount': Decimal('1450.00')
    }
)

if created:
    print(f"✅ Created Production PO")
else:
    po_prod.po_type = 'production'
    po_prod.save()
    print(f"✅ Updated Production PO")

print(f"   PO Number: {po_prod.po_number}")
print(f"   PO Type: {po_prod.get_po_type_display()} ⭐")
print(f"   Status: {po_prod.status}")

# Summary
print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"✅ BOMItem.supplier_article_no: {bom_item.supplier_article_no}")
print(f"✅ OrderItemBOM three-stage values:")
print(f"   - pre_estimate_value: {order_bom.pre_estimate_value}")
print(f"   - confirmed_value: {order_bom.confirmed_value}")
print(f"   - locked_value: {order_bom.locked_value}")
print(f"✅ OrderItemBOM source tracking:")
print(f"   - source_type: {order_bom.source_type}")
print(f"   - source_ref: {order_bom.source_ref}")
print(f"✅ PurchaseOrder.po_type:")
print(f"   - RFQ: {po_rfq.po_type}")
print(f"   - Production: {po_prod.po_type}")

print("\n🎉 All Phase 1 fields working correctly!")
print("\nNext: Access Django Admin at http://127.0.0.1:8000/admin/")
print("      to verify the fields are visible in the UI.\n")
