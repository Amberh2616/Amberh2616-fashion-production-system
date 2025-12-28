#!/usr/bin/env python
"""Check BOM import quality"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.styles.models import Style, StyleRevision, BOMItem
from collections import Counter

style = Style.objects.get(style_number='LW1FLWS')
rev = StyleRevision.objects.get(style=style, revision_label='Rev A')
items = BOMItem.objects.filter(revision=rev).order_by('category', 'item_number')

print(f'\n總共：{items.count()} 筆 BOM items\n')

# 按類別統計
by_category = Counter([item.category for item in items])
print('📊 按類別統計：')
for cat, count in by_category.items():
    print(f'  {cat}: {count}')

# 檢查有 consumption 的項目
with_cons = items.exclude(consumption__isnull=True).exclude(consumption=0)
no_cons = items.filter(consumption__isnull=True) | items.filter(consumption=0)
print(f'\n✅ 有用量（consumption）：{with_cons.count()} 筆')
print(f'❌ 無用量（consumption）：{no_cons.count()} 筆')

# 顯示所有有效項目（有 consumption 的）
print(f'\n有用量的項目：')
for item in with_cons:
    cons = f'{item.consumption} {item.unit}' if item.consumption else 'N/A'
    price = f'${item.unit_price}' if item.unit_price else 'N/A'
    print(f'{item.item_number:2d}. [{item.category:10s}] {item.material_name[:40]:40s} | {cons:15s} | {price:8s}')

# 顯示無效項目（無 consumption 的）
print(f'\n無用量的項目（前 5 筆）：')
for item in no_cons[:5]:
    print(f'{item.item_number:2d}. [{item.category:10s}] {item.material_name[:60]:60s}')
