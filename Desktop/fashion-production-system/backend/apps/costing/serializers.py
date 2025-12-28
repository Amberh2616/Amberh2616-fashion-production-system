"""
Costing Serializers
"""

from rest_framework import serializers
from .models import CostSheet, CostLine


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


class CostSheetUpdateSerializer(serializers.ModelSerializer):
    """
    Update CostSheet serializer（只允許修改 summary 欄位）
    """

    class Meta:
        model = CostSheet
        fields = [
            'labor_cost',
            'overhead_cost',
            'freight_cost',
            'packaging_cost',
            'testing_cost',
            'margin_pct',
            'wastage_pct',
            'notes',
        ]
