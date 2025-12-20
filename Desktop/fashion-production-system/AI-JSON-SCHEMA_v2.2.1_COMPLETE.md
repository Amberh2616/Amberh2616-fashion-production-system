# AI-JSON-SCHEMA v2.2.1 (Complete)
**Last Updated:** 2025-12-17  
**Goal:** 定義 AI 任務（抽取/解析/翻譯/產單/解析 marker）的輸入輸出格式，統一 Evidence + Confidence + Validation。  
**Scope:** Phase 1 MVP + 用量成熟度設計（Marker + Trim Measurement）。

---

## 0) Global primitives

### 0.1 Evidence
```json
{
  "evidence": [
    {
      "source_type": "pdf",
      "document_id": "uuid",
      "page": 3,
      "bbox": [72.1, 155.2, 520.0, 240.3],
      "text": "Nulu Fabric ...",
      "image_ref": null,
      "confidence": 0.86
    }
  ]
}
```
- `bbox` = PDF coordinate (x1,y1,x2,y2) in points
- 若是圖表/圖片來源：`image_ref` 可指向截圖 id（由後端產生）

### 0.2 FieldConfidence
```json
{
  "field_confidence": {
    "material_name": 0.92,
    "consumption_method": 0.70,
    "supplier": 0.55
  }
}
```

### 0.3 Issue
```json
{
  "issues": [
    {
      "type": "missing_field",
      "severity": "error",
      "entity_type": "BOMItem",
      "entity_key": "bom_items[0]",
      "field": "supplier",
      "message": "Supplier not found in document",
      "suggested_fix": {"action":"ask_user","prompt":"請指定供應商"},
      "evidence": []
    }
  ]
}
```

---

## 1) Task: Tech Pack Parsing (BOM + Measurement + Construction)
### 1.1 Input
```json
{
  "task": "techpack_parse",
  "revision_id": "uuid",
  "documents": [
    {"document_id":"uuid","role":"primary","content_type":"application/pdf"}
  ],
  "targets": ["bom","measurement","construction"],
  "language": {"source":"en","target":"zh-TW"},
  "hints": {
    "brand": "lululemon",
    "unit_preference": "metric_first",
    "season": "SP25"
  }
}
```

### 1.2 Output (top-level)
```json
{
  "task": "techpack_parse",
  "revision_id": "uuid",
  "status": "completed",
  "summary": {"confidence": 0.84, "strategy_used": "vision_llm"},
  "bom": { },
  "measurement": { },
  "construction": { },
  "issues": [ ],
  "cost": {"usd": 1.23, "model": "gpt-4o", "calls": 4},
  "raw_snapshots": [ {"kind":"model_output","storage_key":"...json"} ]
}
```

---

## 2) BOM Extraction schema
### 2.1 BOM Output
```json
{
  "bom": {
    "currency": "USD",
    "items": [
      {
        "line_no": 1,
        "category": "fabric",
        "material_name": "Nulu Fabric",
        "material_code": "LW1FLWS",
        "supplier_name": "Eclat",
        "color": "Black",
        "color_code": "BLK",
        "placement": ["body"],
        "consumption": {
          "value": null,
          "uom": "yard/pc",
          "method": "marker_report",
          "estimated_value": 2.5,
          "rule": null
        },
        "notes": "",
        "evidence": [ ],
        "field_confidence": { },
        "overall_confidence": 0.88
      }
    ]
  }
}
```

### 2.2 Consumption.method enum
- `manual`
- `fixed_per_pc`
- `rule_based`
- `marker_report`
- `sample_measurement`

---

## 3) Measurement (Size spec) extraction schema
### 3.1 Output
```json
{
  "measurement": {
    "unit": "cm",
    "sizes": ["XS","S","M","L","XL"],
    "points": [
      {
        "point_code": "P01",
        "point_name": "Chest Width",
        "values": {"XS":40.0,"S":42.0,"M":44.0,"L":46.0,"XL":48.0},
        "tolerance": {"plus":0.5,"minus":0.5},
        "how_to_measure": "Measure straight 1" below armhole",
        "evidence": [ ],
        "field_confidence": { },
        "overall_confidence": 0.90
      }
    ]
  }
}
```

### 3.2 Validation hints
Back-end should validate:
- sizes set consistent across points
- numeric types parseable
- tolerances present or defaulted

---

## 4) Construction extraction schema
### 4.1 Output
```json
{
  "construction": {
    "steps": [
      {
        "step_no": 1,
        "section": "BODY",
        "instruction": "Sew side seams with 4-thread overlock",
        "stitch_type": "overlock_4t",
        "machine": "overlock",
        "notes": "",
        "qc_points": [
          {"type":"appearance","message":"No puckering, even seam allowance"}
        ],
        "evidence": [ ],
        "field_confidence": { },
        "overall_confidence": 0.82
      }
    ]
  }
}
```

---

## 5) Task: Draft Review suggestion (ChangePlan)
AI 可以在 Review UI 內提供「建議修正」，但**不直接覆寫 verified**。

### 5.1 Input
```json
{
  "task":"review_suggest_fixes",
  "revision_id":"uuid",
  "open_issues":[
    {"id":"uuid","type":"missing_field","entity_key":"bom_items[0]","field":"supplier"}
  ],
  "context": {
    "known_suppliers":["Eclat","YKK","TrimCo"]
  }
}
```

### 5.2 Output
```json
{
  "task":"review_suggest_fixes",
  "revision_id":"uuid",
  "change_plan":[
    {
      "target":"BOMItem",
      "match": {"line_no":1,"material_name":"Nulu Fabric"},
      "patch": {"supplier_name":"Eclat"},
      "confidence": 0.72,
      "reason": "Supplier mentioned in header table",
      "evidence": [ ]
    }
  ]
}
```

---

## 6) Task: Marker Report parsing (fabric consumption confirmation)
### 6.1 Input
```json
{
  "task":"marker_parse",
  "marker_report_id":"uuid",
  "document": {"document_id":"uuid","content_type":"application/vnd.ms-excel"},
  "sales_order_item": {
    "id":"uuid",
    "size_breakdown": {"XS":200,"S":400,"M":600,"L":500,"XL":300}
  },
  "expected_uom":"yard/pc"
}
```

### 6.2 Output
```json
{
  "task":"marker_parse",
  "marker_report_id":"uuid",
  "status":"completed",
  "parsed_data": {
    "fabric_width_in": 60,
    "marker_length_yard": 4.2,
    "efficiency_pct": 85.3,
    "consumption_per_size": {"XS":2.2,"S":2.3,"M":2.5,"L":2.7,"XL":2.9},
    "weighted_avg": 2.38,
    "calc_note": "weighted by size_breakdown"
  },
  "backfill": {
    "target_category":"fabric",
    "new_confirmed_value": 2.38,
    "consumption_status":"confirmed",
    "source":"marker_report"
  },
  "issues":[ ],
  "cost": {"usd": 0.40, "model": "gpt-4o-mini", "calls": 1},
  "evidence":[ ]
}
```

---

## 7) Task: Trim estimate via rule library (Pre-Estimate)
### 7.1 Input
```json
{
  "task":"trim_estimate",
  "rule": {
    "rule_id":"uuid",
    "formula":"waist_opening + overlap",
    "params": {"overlap":2.5},
    "required_measurement_points":["waist_opening"]
  },
  "measurements": {
    "waist_opening": 66.0
  },
  "target_uom":"cm/pc"
}
```

### 7.2 Output
```json
{
  "task":"trim_estimate",
  "status":"completed",
  "result": {
    "pre_estimate_value": 68.5,
    "uom":"cm/pc",
    "source":"rule_based",
    "confidence": 0.75
  },
  "issues":[ ]
}
```

---

## 8) Task: Sample Trim Measurement backfill (Confirmed)
### 8.1 Input
```json
{
  "task":"trim_measurement_backfill",
  "sales_order_item_id":"uuid",
  "measurements":[
    {"order_item_bom_id":"uuid","measured_value":68.5,"uom":"cm/pc","notes":"含 overlap 2cm"}
  ]
}
```

### 8.2 Output
```json
{
  "task":"trim_measurement_backfill",
  "status":"completed",
  "backfill_log":[
    {"order_item_bom_id":"uuid","old_confirmed":null,"new_confirmed":68.5,"status":"success"}
  ]
}
```

---

## 9) Task: Generate MWO PDF (Manufacturing Work Order)
### 9.1 Input
```json
{
  "task":"mwo_generate",
  "sales_order_item_id":"uuid",
  "template":"mwo_standard_v1",
  "language":"zh-TW",
  "include": {"bom":true,"measurement":true,"construction":true,"qc_points":true}
}
```

### 9.2 Output
```json
{
  "task":"mwo_generate",
  "status":"completed",
  "mwo_id":"uuid",
  "document_id":"uuid",
  "pages": 6,
  "issues":[ ]
}
```

---

## 10) Task: Generate PO Drafts + Export PDF
### 10.1 PO drafts generation output
```json
{
  "task":"po_generate_drafts",
  "sales_order_item_id":"uuid",
  "po_type":"RFQ",
  "result": {
    "po_ids":["uuid1","uuid2"],
    "unassigned_po_id":"uuid3"
  },
  "issues":[
    {"type":"missing_supplier","severity":"warn","message":"3 items need supplier assignment"}
  ]
}
```

### 10.2 PO export pdf output
```json
{
  "task":"po_export_pdf",
  "po_id":"uuid",
  "status":"completed",
  "document_id":"uuid",
  "issues":[ ]
}
```

---

## 11) Prompt template guidelines (Phase 1)
> 這裡只定「模板結構」，不把你的商業內容寫死，避免後續格式變動。

### 11.1 Vision extraction prompt skeleton
```json
{
  "system": "You are a garment tech pack parser...",
  "input": {
    "document_images": ["page1.png","page2.png"],
    "targets": ["bom","measurement","construction"],
    "output_schema_version": "2.2.1",
    "language_target": "zh-TW",
    "terminology": {
      "stitch_types": ["301 lockstitch","bartack","overlock"],
      "units": ["cm","inch","yard","m","pcs"]
    }
  },
  "output_requirements": {
    "must_include_evidence": true,
    "must_flag_unknown": true,
    "do_not_hallucinate": true
  }
}
```

---

## 12) Confidence + validation rules (server-side)
Server must:
- Reject writes that attempt to set verified fields without user action (unless system actor).
- Create DraftReviewItem when:
  - missing required fields (supplier, uom, category, etc.)
  - confidence < threshold (default 0.70)
  - conflicts detected (two pages give different value)
- Enforce gating for Production PO.

---
