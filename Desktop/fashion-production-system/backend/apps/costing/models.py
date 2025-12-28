"""
Costing Models
Phase 2: Sample Costing / Bulk Costing (BULK PO 之前)
Phase 2-2I: 版本策略封進系統
"""

from decimal import Decimal, ROUND_HALF_UP
from django.db import models, transaction
from django.conf import settings
from apps.styles.models import StyleRevision, BOMItem


class CostSheet(models.Model):
    """
    成本表頭（Sample/Bulk 報價）

    Phase 2 邊界：
    - ✅ Sample Costing（樣品報價）
    - ✅ Bulk Costing（大貨報價）
    - ❌ 不關聯 BULK PO（Phase 4）
    """

    COSTING_TYPE_CHOICES = [
        ('sample', 'Sample Costing'),
        ('bulk', 'Bulk Costing'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('archived', 'Archived'),
    ]

    # 關聯
    revision = models.ForeignKey(
        StyleRevision,
        on_delete=models.CASCADE,
        related_name='cost_sheets'
    )

    # 類型與版本
    costing_type = models.CharField(
        max_length=20,
        choices=COSTING_TYPE_CHOICES,
        help_text='Sample or Bulk costing'
    )
    version_no = models.IntegerField(
        help_text='Version number (1, 2, 3...)'
    )
    is_current = models.BooleanField(
        default=True,
        help_text='Is this the current version?'
    )

    # 成本輸入（人工）
    labor_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Labor cost per unit'
    )
    overhead_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Overhead cost per unit'
    )
    freight_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Freight cost per unit'
    )
    packaging_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Packaging cost per unit'
    )
    testing_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Testing cost per unit'
    )

    # 定價參數
    margin_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('30.00'),
        help_text='Margin percentage (e.g., 30.00 for 30%)'
    )
    wastage_pct = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('5.00'),
        help_text='Global wastage percentage (Phase 1: applies to all lines)'
    )

    # 計算結果快照（Decimal 4 位小數）
    material_cost = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text='Total material cost (sum of line_cost)'
    )
    total_cost = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text='Total COGS (material + labor + overhead + freight + packaging + testing)'
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text='Final unit price (Sample price or FOB price)'
    )

    # 元數據
    notes = models.TextField(
        blank=True,
        help_text='Notes for this costing version'
    )

    # 狀態與審計（Phase 2-2I: 版本策略）
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        help_text='Status: draft/sent/archived'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cost_sheets_created',
        help_text='User who created this version'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cost_sheets_updated',
        help_text='User who last updated this version'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cost_sheets'
        ordering = ['-version_no']
        unique_together = ['revision', 'costing_type', 'version_no']
        indexes = [
            models.Index(fields=['revision', 'costing_type', 'is_current']),
        ]

    def __str__(self):
        return f"{self.revision.filename} - {self.get_costing_type_display()} v{self.version_no}"

    @classmethod
    def get_next_version_no(cls, revision, costing_type):
        """Get next version number for this revision and costing type"""
        last_version = cls.objects.filter(
            revision=revision,
            costing_type=costing_type
        ).order_by('-version_no').first()

        return (last_version.version_no + 1) if last_version else 1

    def calculate_totals(self):
        """
        計算總額（使用 Decimal + quantize 避免浮點誤差）

        微調點 1: 使用 Decimal.quantize 保證精確度
        """
        # Material cost (sum of line costs)
        lines_total = sum(
            (line.line_cost for line in self.lines.all()),
            Decimal('0.0000')
        )
        self.material_cost = lines_total.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)

        # Total COGS
        cogs = (
            self.material_cost +
            self.labor_cost +
            self.overhead_cost +
            self.freight_cost +
            self.packaging_cost +
            self.testing_cost
        )
        self.total_cost = cogs.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)

        # Unit price (FOB or Sample price)
        if self.margin_pct > 0:
            divisor = (Decimal('1.00') - (self.margin_pct / Decimal('100.00')))
            if divisor > 0:
                self.unit_price = (self.total_cost / divisor).quantize(
                    Decimal('0.0001'),
                    rounding=ROUND_HALF_UP
                )
            else:
                self.unit_price = self.total_cost
        else:
            self.unit_price = self.total_cost


class CostLine(models.Model):
    """
    成本表明細（快照，Phase 1 read-only）

    設計原則：
    - 快照 BOM 當下的 consumption、unit_price
    - Phase 1 不允許編輯（要改回 BOM 改）
    - 保存計算結果避免重算誤差
    """

    # 關聯
    cost_sheet = models.ForeignKey(
        CostSheet,
        on_delete=models.CASCADE,
        related_name='lines'
    )
    bom_item = models.ForeignKey(
        BOMItem,
        on_delete=models.PROTECT,
        help_text='Reference to original BOM item (for traceability)'
    )

    # 快照（報價當下的事實）
    material_name = models.CharField(
        max_length=255,
        help_text='Material name snapshot'
    )
    supplier = models.CharField(
        max_length=255,
        help_text='Supplier snapshot'
    )
    category = models.CharField(
        max_length=50,
        help_text='Category snapshot (fabric/trim/packaging/label)'
    )
    unit = models.CharField(
        max_length=20,
        help_text='Unit snapshot (Yard/Meter/PCS)'
    )

    # 核心數據快照
    consumption = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        help_text='Consumption per garment (snapshot)'
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        help_text='Unit price snapshot'
    )

    # 計算結果（保存避免誤差）
    # 微調點 1: line_cost 在創建時計算並保存
    line_cost = models.DecimalField(
        max_digits=12,
        decimal_places=4,
        help_text='Line cost = consumption × unit_price × (1 + wastage%)'
    )

    # 排序（微調點 2: 獨立管理，不依賴 item_number）
    sort_order = models.IntegerField(
        default=0,
        help_text='Display order (0-based index)'
    )

    class Meta:
        db_table = 'cost_lines'
        ordering = ['sort_order']
        indexes = [
            models.Index(fields=['cost_sheet', 'sort_order']),
        ]

    def __str__(self):
        return f"{self.material_name} - ${self.line_cost}"

    @classmethod
    def calculate_line_cost(cls, consumption, unit_price, wastage_pct):
        """
        計算 line_cost（靜態方法，可重用）

        微調點 1: 使用 Decimal + quantize

        Formula: consumption × unit_price × (1 + wastage_pct/100)
        """
        consumption = Decimal(str(consumption))
        unit_price = Decimal(str(unit_price))
        wastage_pct = Decimal(str(wastage_pct))

        multiplier = Decimal('1.00') + (wastage_pct / Decimal('100.00'))
        line_cost = consumption * unit_price * multiplier

        return line_cost.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP)
