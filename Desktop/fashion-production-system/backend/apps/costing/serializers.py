"""
Costing Serializers
Phase 2-2I: 版本策略 - Guard Rules
"""

from decimal import Decimal
from rest_framework import serializers
from .models import CostSheet, CostLine


# A/B Fields Definition (版本策略)
A_FIELDS = {
    "labor_cost",
    "overhead_cost",
    "freight_cost",
    "packaging_cost",
    "testing_cost",
    "notes",
}

B_FIELDS = {"margin_pct", "wastage_pct"}


class CostLineSerializer(serializers.ModelSerializer):
    """
    CostLine serializer（read-only，顯示快照）
    """

    class Meta:
        model = CostLine
        fields = [
            'id',
            'bom_item',
            'material_name',
            'supplier',
            'category',
            'unit',
            'consumption',
            'unit_price',
            'line_cost',
            'sort_order',
        ]
        read_only_fields = fields  # Phase 1: 全部 read-only


class CostSheetListSerializer(serializers.ModelSerializer):
    """
    CostSheet list serializer（版本列表用）
    """
    costing_type_display = serializers.CharField(
        source='get_costing_type_display',
        read_only=True
    )

    class Meta:
        model = CostSheet
        fields = [
            'id',
            'revision',
            'costing_type',
            'costing_type_display',
            'version_no',
            'is_current',
            'material_cost',
            'total_cost',
            'unit_price',
            'created_at',
        ]
        read_only_fields = fields


class CostSheetDetailSerializer(serializers.ModelSerializer):
    """
    CostSheet detail serializer（包含 nested lines）
    """
    lines = CostLineSerializer(many=True, read_only=True)
    costing_type_display = serializers.CharField(
        source='get_costing_type_display',
        read_only=True
    )

    class Meta:
        model = CostSheet
        fields = [
            'id',
            'revision',
            'costing_type',
            'costing_type_display',
            'version_no',
            'is_current',
            # 成本輸入
            'labor_cost',
            'overhead_cost',
            'freight_cost',
            'packaging_cost',
            'testing_cost',
            # 定價參數
            'margin_pct',
            'wastage_pct',
            # 計算結果
            'material_cost',
            'total_cost',
            'unit_price',
            # 元數據
            'notes',
            'created_at',
            'updated_at',
            # Nested lines
            'lines',
        ]
        read_only_fields = [
            'id',
            'version_no',
            'material_cost',
            'total_cost',
            'unit_price',
            'created_at',
            'updated_at',
            'lines',
        ]


class CostSheetCreateSerializer(serializers.Serializer):
    """
    Create CostSheet serializer（用於 Generate API）
    """
    costing_type = serializers.ChoiceField(
        choices=['sample', 'bulk'],
        required=True
    )
    labor_cost = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        required=False
    )
    overhead_cost = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        required=False
    )
    freight_cost = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        required=False
    )
    packaging_cost = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        required=False
    )
    testing_cost = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        required=False
    )
    margin_pct = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=30,
        required=False
    )
    wastage_pct = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=5,
        required=False
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True
    )

    def validate(self, attrs):
        """Validate margin and wastage ranges"""
        if attrs["margin_pct"] < 0 or attrs["margin_pct"] >= 100:
            raise serializers.ValidationError({
                "margin_pct": "Must be in [0, 100)."
            })
        if attrs["wastage_pct"] < 0 or attrs["wastage_pct"] > 100:
            raise serializers.ValidationError({
                "wastage_pct": "Must be in [0, 100]."
            })
        return attrs


class CostSheetPatchSerializer(serializers.ModelSerializer):
    """
    PATCH serializer - 版本策略 Guard Rules

    只允許 A-fields (同版本可修改)
    禁止 B-fields (必須新版本)
    """

    class Meta:
        model = CostSheet
        fields = [
            # A fields (allowed in PATCH)
            'labor_cost',
            'overhead_cost',
            'freight_cost',
            'packaging_cost',
            'testing_cost',
            'notes',
            # B fields (included to detect & block)
            'margin_pct',
            'wastage_pct',
        ]

    def validate(self, attrs):
        """
        Guard Rule: PATCH 禁止修改 margin_pct 或 wastage_pct
        """
        incoming = set(attrs.keys())

        # Block B fields
        if incoming & B_FIELDS:
            raise serializers.ValidationError({
                "version_policy": "margin_pct and wastage_pct require a new version. "
                                  "Use POST /revisions/{id}/cost-sheets/ to create a new version."
            })

        # Ensure only A fields
        illegal = incoming - A_FIELDS
        if illegal:
            raise serializers.ValidationError({
                "fields": f"Illegal fields in PATCH: {sorted(list(illegal))}"
            })

        # Validate numeric fields >= 0
        for f in ["labor_cost", "overhead_cost", "freight_cost", "packaging_cost", "testing_cost"]:
            if f in attrs and attrs[f] is not None and Decimal(str(attrs[f])) < 0:
                raise serializers.ValidationError({f: "Must be >= 0"})

        return attrs


class CostSheetDuplicateSerializer(serializers.Serializer):
    """
    Duplicate serializer - 創建新版本（僅改 margin/wastage）

    Optional endpoint: 不重建 CostLines，只用新的 margin/wastage
    """
    margin_pct = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=True
    )
    wastage_pct = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        required=True
    )
    notes = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True
    )

    def validate(self, attrs):
        """Validate margin and wastage ranges"""
        if attrs["margin_pct"] < 0 or attrs["margin_pct"] >= 100:
            raise serializers.ValidationError({
                "margin_pct": "Must be in [0, 100)."
            })
        if attrs["wastage_pct"] < 0 or attrs["wastage_pct"] > 100:
            raise serializers.ValidationError({
                "wastage_pct": "Must be in [0, 100]."
            })
        return attrs
