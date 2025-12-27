# BOM → PO Design Critical Corrections
**Date:** 2025-12-27
**Status:** ⚠️ MUST IMPLEMENT - Prevents Future Rework

---

## ✅ Original Design (Correct Parts)

1. **Three-layer architecture** ✅
   - BOMItem (template)
   - OrderItemBOM (order instance)
   - POLine (procurement, frozen)

2. **supplier_article_no field** ✅
   - Critical for material identification

3. **POLine COPY freeze** ✅
   - PO is legal/financial document, must not be polluted

4. **Production PO gating: confirmed/locked** ✅
   - Risk management core

5. **Phased implementation (Phase 1-5)** ✅
   - Manual first, then automation

---

## ⚠️ 5 Critical Corrections (MUST FIX)

### 1. supplier_article_no NOT ENOUGH - Need Supplier Normalization

**Problem:**
```python
supplier: CharField  # "Eclat", "ECLAT", "Eclat Textile" treated as different
→ PO grouping will be broken
```

**Solution:**
- PurchaseOrder.supplier already FK ✅ (good)
- BOMItem / OrderItemBOM need normalization

**Phase 1 Minimum Fix:**
- Keep CharField for now
- Add `supplier_name_normalized` field OR
- Start using `supplier_fk` (can do in Phase 2)
- **Use supplier mapping table during PO generation**

**New Fields:**
```python
# BOMItem
supplier_fk = ForeignKey(Supplier, null=True, blank=True)  # Optional for Phase 1
supplier_name_normalized = CharField(max_length=200, blank=True)  # For grouping

# OrderItemBOM (same)
supplier_fk = ForeignKey(Supplier, null=True, blank=True)
supplier_name_normalized = CharField(max_length=200, blank=True)
```

---

### 2. OrderItemBOM total_* Fields Need Recalculation + Lock

**Problem:**
- quantity changed, per_piece changed → total not updated
- OR total updated → old PO shouldn't change

**Solution:**
```python
class OrderItemBOM(models.Model):
    # ... existing fields ...

    def recalc_totals(self):
        """Recalculate totals when per_piece or unit_price changes"""
        if self.consumption_maturity == "locked":
            raise ValidationError("Cannot modify locked consumption")

        self.total_consumption = self.sales_order_item.total_quantity * self.consumption_per_piece
        self.total_cost = self.total_consumption * self.unit_price
        self.save()

    def save(self, *args, **kwargs):
        # Auto-recalc on save (unless locked)
        if self.consumption_maturity != "locked":
            self.total_consumption = self.sales_order_item.total_quantity * self.consumption_per_piece
            self.total_cost = self.total_consumption * self.unit_price
        super().save(*args, **kwargs)
```

**Requirements:**
- Auto-recalc on save
- Lock mechanism prevents changes after locked
- POLine copies frozen values (already designed ✅)

---

### 3. RFQ Gating - DO NOT ALLOW unknown

**Problem:**
```
Current design: RFQ allows unknown ❌
→ Will generate garbage POs (no quantity = cannot quote)
```

**Corrected Gating Rules:**

| PO Type    | Fabric Maturity           | Trim Maturity             | Allow | Reason                        |
|------------|---------------------------|---------------------------|-------|-------------------------------|
| RFQ        | pre_estimate              | pre_estimate              | ✅    | OK - Estimated for quote      |
| RFQ        | confirmed                 | confirmed                 | ✅    | OK - Better with evidence     |
| RFQ        | locked                    | locked                    | ✅    | OK - Can quote even if locked |
| RFQ        | **unknown**               | **unknown**               | ❌    | **REJECT - No qty to quote**  |
| Production | confirmed                 | confirmed                 | ✅    | OK - Has evidence             |
| Production | locked                    | locked                    | ✅    | OK - Locked is safest         |
| Production | unknown / pre_estimate    | unknown / pre_estimate    | ❌    | REJECT - No evidence          |

**Validation Logic:**
```python
def can_generate_rfq_po(order_item_bom_list):
    """RFQ requires at least pre_estimate"""
    for bom in order_item_bom_list:
        if bom.consumption_maturity == "unknown":
            # Option A: Skip this line with warning
            warnings.append(f"{bom.material_name} skipped (unknown consumption)")
            # Option B: Reject entire PO
            return False, f"{bom.material_name} 用量未知，無法詢價"
    return True, "OK"

def can_generate_production_po(order_item_bom_list):
    """Production requires confirmed/locked"""
    for bom in order_item_bom_list:
        if bom.category in ["fabric", "trim"]:
            if bom.consumption_maturity not in ["confirmed", "locked"]:
                return False, f"{bom.material_name} 用量未確認"
    return True, "OK"
```

---

### 4. PurchaseOrder Needs currency Field

**Problem:**
- Tech pack / supplier quotes may use USD/NTD/CNY
- Without currency: total_amount meaningless, unit_price cannot compare

**Solution:**
```python
class PurchaseOrder(models.Model):
    # ... existing fields ...
    currency = models.CharField(
        max_length=3,
        choices=[
            ('USD', 'USD'),
            ('NTD', 'TWD/NTD'),
            ('CNY', 'CNY'),
            ('EUR', 'EUR'),
        ],
        default='USD'
    )
    # total_amount now makes sense with currency context
```

**POLine:**
- Inherits currency from PO (no need to add to POLine)
- `unit_price` is in PO currency
- `line_total` is in PO currency

**Phase 1 Minimum:**
- Add currency field with default='USD'
- Phase 2 can add currency conversion if needed

---

### 5. Unit Standardization Strategy

**Problem:**
Will encounter mixed formats:
- yd/pc, yard, yards
- cm, mm
- m, meter

**Solution:**

**Phase 1 - Store Standard Values:**
```python
UNIT_CHOICES = [
    ('yd', 'Yard'),
    ('m', 'Meter'),
    ('cm', 'Centimeter'),
    ('pc', 'Piece'),
    ('set', 'Set'),
    ('kg', 'Kilogram'),
]

class BOMItem(models.Model):
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    # Store as 'yd', display as 'Yard' or 'yard/pc'
```

**Frontend Display:**
```typescript
const UNIT_LABELS = {
  yd: 'yard/pc',
  m: 'meter/pc',
  cm: 'cm/pc',
  pc: 'pcs',
  set: 'sets',
  kg: 'kg'
};
```

**Import/Parse Strategy:**
- Parse: "yards" → normalize to "yd"
- Parse: "meter" → normalize to "m"
- Display: Show user-friendly label

**Phase 2 (Optional):**
- Add unit conversion table
- Support "yd → m" conversion for comparison

---

## 📋 Updated Field List (Phase 1 Migration)

### BOMItem (3 new fields)
```python
supplier_article_no = CharField(max_length=100)  # ✅ Original
supplier_name_normalized = CharField(max_length=200, blank=True)  # 🆕 Correction #1
supplier_fk = ForeignKey(Supplier, null=True, blank=True)  # 🆕 Optional
```

### OrderItemBOM (8 new fields)
```python
# Original design (6 fields)
material_name = CharField(max_length=200)
supplier = CharField(max_length=200)
supplier_article_no = CharField(max_length=100)
category = CharField(max_length=50)
source_type = CharField(max_length=50, choices=SOURCE_CHOICES)
source_ref = CharField(max_length=200, null=True, blank=True)

# Corrections (2 additional fields)
supplier_name_normalized = CharField(max_length=200, blank=True)  # 🆕 #1
supplier_fk = ForeignKey(Supplier, null=True, blank=True)  # 🆕 Optional
```

### PurchaseOrder (2 new fields)
```python
po_type = CharField(max_length=20, choices=[('rfq', 'RFQ'), ('production', 'Production')])  # ✅ Original
currency = CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')  # 🆕 Correction #4
```

### POLine (1 new field)
```python
supplier_article_no = CharField(max_length=100)  # ✅ Original
# currency inherited from PO, no need to add
```

---

## 🚀 Updated Implementation Plan

### Phase 1: Model Field Additions (0.5 day) - REVISED

**Add to migration:**
1. BOMItem:
   - supplier_article_no ✅
   - supplier_name_normalized 🆕
   - supplier_fk (optional) 🆕

2. OrderItemBOM:
   - material_name, supplier, supplier_article_no, category ✅
   - source_type, source_ref ✅
   - supplier_name_normalized 🆕
   - supplier_fk (optional) 🆕
   - **Add save() method for auto-recalc** 🆕

3. PurchaseOrder:
   - po_type ✅
   - currency 🆕

4. POLine:
   - supplier_article_no ✅

**Add validators:**
```python
# In services/procurement/validators.py
def validate_rfq_consumption(order_item_bom_list):
    """RFQ requires at least pre_estimate"""
    for bom in order_item_bom_list:
        if bom.consumption_maturity == "unknown":
            raise ValidationError(
                f"{bom.material_name} 用量未知，無法詢價 (unknown not allowed for RFQ)"
            )
```

**Add to settings:**
```python
# In config/settings/base.py
UNIT_CHOICES = [
    ('yd', 'Yard'),
    ('m', 'Meter'),
    ('cm', 'Centimeter'),
    ('pc', 'Piece'),
    ('set', 'Set'),
    ('kg', 'Kilogram'),
]

CURRENCY_CHOICES = [
    ('USD', 'USD'),
    ('NTD', 'TWD/NTD'),
    ('CNY', 'CNY'),
    ('EUR', 'EUR'),
]
```

---

## ✅ Validation Checklist Before Starting

Before writing migration code, confirm:

- [ ] BOMItem location: `apps/styles/models.py` ?
- [ ] OrderItemBOM location: `apps/consumption/models.py` ?
- [ ] PurchaseOrder location: `apps/procurement/models.py` ?
- [ ] POLine location: `apps/procurement/models.py` ?
- [ ] All 5 corrections understood
- [ ] Ready to implement corrected version

---

## 📝 Why These Corrections Matter

### Correction #1 (Supplier Normalization)
**Without:** PO grouping broken, same supplier split into multiple POs
**With:** Clean grouping, one PO per actual supplier

### Correction #2 (Auto-recalc + Lock)
**Without:** Manual mistakes, totals drift from reality
**With:** Always correct, locked = truly locked

### Correction #3 (RFQ Unknown Reject)
**Without:** Garbage POs sent to suppliers (no quantities)
**With:** Clean RFQs, suppliers can actually quote

### Correction #4 (Currency)
**Without:** Cannot compare prices, totals meaningless
**With:** Clear financial reporting, can compare quotes

### Correction #5 (Unit Standard)
**Without:** "yard" vs "yd" vs "yards" = data mess
**With:** Clean data, easy to display and convert

---

**Next Action:** Confirm model locations, then I provide corrected migration code.
