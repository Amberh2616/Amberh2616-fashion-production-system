# TRIM-RULES-LIBRARY v1.0
**Last Updated:** 2025-12-17
**Purpose:** 定義 20 條常用輔料（Trim）用量計算規則，用於 Pre-Estimate 階段。
**Usage:** 在沒有樣衣實測數據時，系統可使用這些規則 + 款式 Measurement 自動估算輔料用量。
**Status:** Phase 1 MVP - 20 條核心規則

---

## Rule Categories

### 🔹 Category A: Elastic (鬆緊帶) - 7 rules
### 🔹 Category B: Binding/Tape (包邊/織帶) - 5 rules
### 🔹 Category C: Drawcord (拉繩) - 2 rules
### 🔹 Category D: Strap (肩帶/織帶) - 3 rules
### 🔹 Category E: Zipper (拉鍊) - 1 rule
### 🔹 Category F: Fixed Count Items (固定數量) - 2 rules

---

## Rule Format

```json
{
  "rule_id": "TRIM-001",
  "rule_name": "Waist Elastic (Standard Overlap)",
  "material_category": "elastic",
  "material_subcategory": "knit_elastic",
  "rule_type": "formula",
  "formula": "waist_opening + overlap",
  "formula_params": {
    "overlap": 2.5
  },
  "required_measurement_points": ["waist_opening"],
  "output_uom": "cm/pc",
  "confidence_level": 0.75,
  "applicability": "Pants, Shorts, Skirts with elastic waist",
  "notes": "Standard overlap for sewn-in elastic waistband",
  "active": true,
  "created_at": "2025-12-17"
}
```

---

## 🔹 Category A: Elastic (鬆緊帶)

### TRIM-001: Waist Elastic (Standard Overlap)
```json
{
  "rule_id": "TRIM-001",
  "rule_name": "Waist Elastic (Standard Overlap)",
  "material_category": "elastic",
  "material_subcategory": "knit_elastic",
  "rule_type": "formula",
  "formula": "waist_opening + overlap",
  "formula_params": {"overlap": 2.5},
  "required_measurement_points": ["waist_opening"],
  "output_uom": "cm/pc",
  "confidence_level": 0.75,
  "applicability": "Pants, Shorts, Skirts with elastic waist",
  "notes": "Standard overlap for sewn-in elastic waistband. For exposed elastic, use 3-4cm overlap."
}
```

### TRIM-002: Leg Opening Elastic
```json
{
  "rule_id": "TRIM-002",
  "rule_name": "Leg Opening Elastic",
  "material_category": "elastic",
  "material_subcategory": "knit_elastic",
  "rule_type": "formula",
  "formula": "leg_opening + overlap",
  "formula_params": {"overlap": 2.0},
  "required_measurement_points": ["leg_opening"],
  "output_uom": "cm/pc",
  "confidence_level": 0.72,
  "applicability": "Shorts, Underwear with elastic leg opening",
  "notes": "Smaller overlap due to smaller circumference"
}
```

### TRIM-003: Armhole Elastic (Sleeveless)
```json
{
  "rule_id": "TRIM-003",
  "rule_name": "Armhole Elastic",
  "material_category": "elastic",
  "material_subcategory": "knit_elastic",
  "rule_type": "formula",
  "formula": "(armhole_length * 2) + (overlap * 2)",
  "formula_params": {"overlap": 2.0},
  "required_measurement_points": ["armhole_length"],
  "output_uom": "cm/pc",
  "confidence_level": 0.70,
  "applicability": "Sleeveless tops, Tanks with elastic armhole",
  "notes": "Multiply by 2 for both armholes, plus overlap for each"
}
```

### TRIM-004: Elastic Strap (Adjustable)
```json
{
  "rule_id": "TRIM-004",
  "rule_name": "Elastic Strap with Slider",
  "material_category": "elastic",
  "material_subcategory": "elastic_strap",
  "rule_type": "formula",
  "formula": "(strap_length * 2) + adjustment_allowance",
  "formula_params": {"adjustment_allowance": 10.0},
  "required_measurement_points": ["strap_length"],
  "output_uom": "cm/pc",
  "confidence_level": 0.68,
  "applicability": "Sports bra, Tank with adjustable straps",
  "notes": "Extra 10cm for adjustment range via slider"
}
```

### TRIM-005: Cuff Elastic (Sleeve)
```json
{
  "rule_id": "TRIM-005",
  "rule_name": "Cuff Elastic",
  "material_category": "elastic",
  "material_subcategory": "knit_elastic",
  "rule_type": "formula",
  "formula": "(cuff_opening * 2) + (overlap * 2)",
  "formula_params": {"overlap": 1.5},
  "required_measurement_points": ["cuff_opening"],
  "output_uom": "cm/pc",
  "confidence_level": 0.73,
  "applicability": "Long sleeve tops, Jackets with elastic cuff",
  "notes": "Multiply by 2 for both sleeves"
}
```

### TRIM-006: Neckline Elastic (Sports Bra)
```json
{
  "rule_id": "TRIM-006",
  "rule_name": "Neckline Elastic",
  "material_category": "elastic",
  "material_subcategory": "plush_elastic",
  "rule_type": "formula",
  "formula": "neckline_opening + overlap",
  "formula_params": {"overlap": 2.0},
  "required_measurement_points": ["neckline_opening"],
  "output_uom": "cm/pc",
  "confidence_level": 0.70,
  "applicability": "Sports bra, Lingerie with elastic neckline",
  "notes": "Usually plush elastic for comfort"
}
```

### TRIM-007: Underbust Elastic (Sports Bra)
```json
{
  "rule_id": "TRIM-007",
  "rule_name": "Underbust Elastic",
  "material_category": "elastic",
  "material_subcategory": "silicone_elastic",
  "rule_type": "formula",
  "formula": "underbust_width * 2 + overlap",
  "formula_params": {"overlap": 3.0},
  "required_measurement_points": ["underbust_width"],
  "output_uom": "cm/pc",
  "confidence_level": 0.72,
  "applicability": "Sports bra, Fitted bra-style tops",
  "notes": "Multiply by 2 for full circumference, typically silicone elastic for grip"
}
```

---

## 🔹 Category B: Binding/Tape (包邊/織帶)

### TRIM-008: Neckline Binding
```json
{
  "rule_id": "TRIM-008",
  "rule_name": "Neckline Binding",
  "material_category": "binding",
  "material_subcategory": "knit_binding",
  "rule_type": "formula",
  "formula": "neckline_length + seam_allowance",
  "formula_params": {"seam_allowance": 3.0},
  "required_measurement_points": ["neckline_length"],
  "output_uom": "cm/pc",
  "confidence_level": 0.78,
  "applicability": "T-shirts, Tanks, Dresses with binding finish",
  "notes": "3cm allowance for seam overlap and trimming"
}
```

### TRIM-009: Armhole Binding (Sleeveless)
```json
{
  "rule_id": "TRIM-009",
  "rule_name": "Armhole Binding",
  "material_category": "binding",
  "material_subcategory": "knit_binding",
  "rule_type": "formula",
  "formula": "(armhole_length * 2) + (seam_allowance * 2)",
  "formula_params": {"seam_allowance": 3.0},
  "required_measurement_points": ["armhole_length"],
  "output_uom": "cm/pc",
  "confidence_level": 0.76,
  "applicability": "Sleeveless tops, Vests with binding finish",
  "notes": "Multiply by 2 for both armholes"
}
```

### TRIM-010: Hem Binding (Bottom)
```json
{
  "rule_id": "TRIM-010",
  "rule_name": "Hem Binding",
  "material_category": "binding",
  "material_subcategory": "knit_binding",
  "rule_type": "formula",
  "formula": "hem_width + seam_allowance",
  "formula_params": {"seam_allowance": 3.0},
  "required_measurement_points": ["hem_width"],
  "output_uom": "cm/pc",
  "confidence_level": 0.77,
  "applicability": "Tops, Jackets with binding hem finish",
  "notes": "Measured at garment bottom opening"
}
```

### TRIM-011: Sleeve Opening Binding
```json
{
  "rule_id": "TRIM-011",
  "rule_name": "Sleeve Opening Binding",
  "material_category": "binding",
  "material_subcategory": "knit_binding",
  "rule_type": "formula",
  "formula": "(sleeve_opening * 2) + (seam_allowance * 2)",
  "formula_params": {"seam_allowance": 2.5},
  "required_measurement_points": ["sleeve_opening"],
  "output_uom": "cm/pc",
  "confidence_level": 0.74,
  "applicability": "Short sleeve, Long sleeve with binding finish",
  "notes": "Multiply by 2 for both sleeves"
}
```

### TRIM-012: Pocket Opening Binding
```json
{
  "rule_id": "TRIM-012",
  "rule_name": "Pocket Opening Binding",
  "material_category": "binding",
  "material_subcategory": "woven_tape",
  "rule_type": "formula",
  "formula": "pocket_opening_width + seam_allowance",
  "formula_params": {"seam_allowance": 2.0},
  "required_measurement_points": ["pocket_opening_width"],
  "output_uom": "cm/pc",
  "confidence_level": 0.72,
  "applicability": "Pants, Jackets with bound pocket opening",
  "notes": "Per pocket, multiply by pocket count"
}
```

---

## 🔹 Category C: Drawcord (拉繩)

### TRIM-013: Waist Drawcord
```json
{
  "rule_id": "TRIM-013",
  "rule_name": "Waist Drawcord",
  "material_category": "drawcord",
  "material_subcategory": "round_cord",
  "rule_type": "formula",
  "formula": "waist_opening + extra_length",
  "formula_params": {"extra_length": 40.0},
  "required_measurement_points": ["waist_opening"],
  "output_uom": "cm/pc",
  "confidence_level": 0.70,
  "applicability": "Pants, Shorts, Skirts with drawstring waist",
  "notes": "Extra 40cm for tying and adjustment"
}
```

### TRIM-014: Hood Drawcord
```json
{
  "rule_id": "TRIM-014",
  "rule_name": "Hood Drawcord",
  "material_category": "drawcord",
  "material_subcategory": "round_cord",
  "rule_type": "formula",
  "formula": "hood_opening + extra_length",
  "formula_params": {"extra_length": 30.0},
  "required_measurement_points": ["hood_opening"],
  "output_uom": "cm/pc",
  "confidence_level": 0.68,
  "applicability": "Hoodies, Jackets with hood drawstring",
  "notes": "Extra 30cm for functional adjustment"
}
```

---

## 🔹 Category D: Strap (肩帶/織帶)

### TRIM-015: Bra Strap (Fixed Length)
```json
{
  "rule_id": "TRIM-015",
  "rule_name": "Bra Strap Fixed",
  "material_category": "strap",
  "material_subcategory": "knit_strap",
  "rule_type": "formula",
  "formula": "(strap_length * 2) + seam_allowance",
  "formula_params": {"seam_allowance": 4.0},
  "required_measurement_points": ["strap_length"],
  "output_uom": "cm/pc",
  "confidence_level": 0.75,
  "applicability": "Sports bra, Tank with fixed straps",
  "notes": "Multiply by 2 for both straps, 2cm allowance per end"
}
```

### TRIM-016: Crossback Strap (X-shape)
```json
{
  "rule_id": "TRIM-016",
  "rule_name": "Crossback Strap",
  "material_category": "strap",
  "material_subcategory": "knit_strap",
  "rule_type": "formula",
  "formula": "(strap_length * 1.4 * 2) + seam_allowance",
  "formula_params": {"seam_allowance": 4.0},
  "required_measurement_points": ["strap_length"],
  "output_uom": "cm/pc",
  "confidence_level": 0.65,
  "applicability": "Sports bra with X-back design",
  "notes": "1.4 multiplier for diagonal cross path"
}
```

### TRIM-017: Waist Tie (Side Tie)
```json
{
  "rule_id": "TRIM-017",
  "rule_name": "Waist Tie",
  "material_category": "strap",
  "material_subcategory": "woven_tape",
  "rule_type": "fixed",
  "fixed_value": 45.0,
  "formula_params": {},
  "required_measurement_points": [],
  "output_uom": "cm/pc",
  "confidence_level": 0.80,
  "applicability": "Wrap tops, Side-tie garments",
  "notes": "Standard 45cm per tie, multiply by tie count (usually 2-4)"
}
```

---

## 🔹 Category E: Zipper (拉鍊)

### TRIM-018: Center Front Zipper
```json
{
  "rule_id": "TRIM-018",
  "rule_name": "Center Front Zipper",
  "material_category": "zipper",
  "material_subcategory": "coil_zipper",
  "rule_type": "formula",
  "formula": "front_length + seam_allowance",
  "formula_params": {"seam_allowance": 2.0},
  "required_measurement_points": ["front_length"],
  "output_uom": "cm/pc",
  "confidence_level": 0.82,
  "applicability": "Jackets, Hoodies with center front zipper",
  "notes": "Typically 5# or 3# coil zipper"
}
```

---

## 🔹 Category F: Fixed Count Items (固定數量)

### TRIM-019: Care Label
```json
{
  "rule_id": "TRIM-019",
  "rule_name": "Care Label",
  "material_category": "label",
  "material_subcategory": "woven_label",
  "rule_type": "fixed",
  "fixed_value": 1.0,
  "formula_params": {},
  "required_measurement_points": [],
  "output_uom": "pcs/pc",
  "confidence_level": 0.95,
  "applicability": "All garments",
  "notes": "Standard 1 care label per garment, unless multi-label requirement"
}
```

### TRIM-020: Hang Tag (Price Tag)
```json
{
  "rule_id": "TRIM-020",
  "rule_name": "Hang Tag",
  "material_category": "label",
  "material_subcategory": "paper_tag",
  "rule_type": "fixed",
  "fixed_value": 1.0,
  "formula_params": {},
  "required_measurement_points": [],
  "output_uom": "pcs/pc",
  "confidence_level": 0.95,
  "applicability": "All garments for retail",
  "notes": "Standard 1 hang tag per garment"
}
```

---

## Usage Flow

### Step 1: Match Rule to BOM Item
```python
# Example: BOM item says "Knit Elastic, placement: waist"
matching_rules = search_rules(
    category="elastic",
    applicability_keywords=["waist"]
)
# Returns: TRIM-001
```

### Step 2: Check Required Measurements
```python
rule = get_rule("TRIM-001")
required = rule["required_measurement_points"]  # ["waist_opening"]

measurements = get_measurements_from_revision(revision_id)
if "waist_opening" in measurements:
    can_estimate = True
```

### Step 3: Calculate Pre-Estimate
```python
formula = "waist_opening + overlap"
params = {"overlap": 2.5}
waist_opening = measurements["waist_opening"]  # e.g., 66.0 cm

pre_estimate = eval_formula(formula, {
    "waist_opening": waist_opening,
    **params
})
# Result: 68.5 cm/pc
```

### Step 4: Write to OrderItemBOM
```python
order_item_bom.pre_estimate_value = 68.5
order_item_bom.consumption_uom = "cm/pc"
order_item_bom.consumption_status = "pre_estimate"
order_item_bom.consumption_source = "rule_based"
order_item_bom.trim_rule_id = "TRIM-001"
order_item_bom.confidence = 0.75
order_item_bom.save()
```

---

## Rule Confidence Levels

| Confidence | Meaning | Action |
|------------|---------|--------|
| 0.80 - 1.00 | High confidence (fixed items, simple formulas) | Safe for RFQ PO |
| 0.70 - 0.79 | Medium confidence (standard formulas) | Safe for RFQ, flag for verification |
| 0.60 - 0.69 | Low confidence (complex formulas, estimated multipliers) | Flag for sample measurement |
| < 0.60 | Very low confidence | Require sample measurement before Production PO |

---

## Expansion Notes (Phase 2)

**Additional rules to consider:**
- Thread consumption (by seam length + stitch density)
- Interlining (by pattern piece area + wastage)
- Piping (by seam length where applied)
- Button/Snap count (by style type + closure points)
- Hook & Loop (by closure length + overlap)
- Padding/Foam (by cup size + thickness)
- Silicone gripper (by hem/leg opening circumference)

**Machine Learning Integration (Future):**
- Learn correction patterns from sample measurements
- Auto-tune `overlap` and multiplier parameters per brand/style
- Confidence calibration based on historical accuracy

---

## API Integration Example

### Create a new rule via API
```http
POST /api/v2/trim-rules
Content-Type: application/json

{
  "rule_name": "Custom Waist Elastic",
  "material_category": "elastic",
  "rule_type": "formula",
  "formula": "waist_opening * 0.95 + overlap",
  "formula_params": {"overlap": 3.0},
  "required_measurement_points": ["waist_opening"],
  "output_uom": "cm/pc",
  "active": true,
  "notes": "Custom rule for stretchy waistband with gathered effect"
}
```

### Apply rule to estimate consumption
```http
POST /api/v2/trim-rules/estimate
Content-Type: application/json

{
  "rule_id": "TRIM-001",
  "measurements": {
    "waist_opening": 66.0
  }
}
```

Response:
```json
{
  "data": {
    "pre_estimate_value": 68.5,
    "uom": "cm/pc",
    "confidence": 0.75,
    "source": "rule_based",
    "rule_used": "TRIM-001"
  }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-17 | Initial 20 rules: Elastic (7), Binding (5), Drawcord (2), Strap (3), Zipper (1), Fixed (2) |

---

**End of TRIM-RULES-LIBRARY v1.0**
