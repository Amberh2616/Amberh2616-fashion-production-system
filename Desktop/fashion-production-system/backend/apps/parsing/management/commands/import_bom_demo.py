"""
Import BOM from demo PDF file
"""

from django.core.management.base import BaseCommand
from apps.core.models import Organization
from apps.styles.models import Style, StyleRevision, BOMItem
from decimal import Decimal
import pdfplumber


class Command(BaseCommand):
    help = 'Import BOM from demo data PDF'

    def handle(self, *args, **options):
        bom_path = 'demo_data/bom/Spring2025_APACNuluSpaghettiCamiContrastNecklineTankwithBraBRLycraLW1FLWS_SabrinaFashionIndustrialCorporation_2024-Mar2.pdf'

        self.stdout.write('\n📄 讀取 BOM PDF...')

        # 提取所有頁面的 BOM 表格（Page 2-6）
        all_rows = []
        with pdfplumber.open(bom_path) as pdf:
            # Page 2-6 包含 BOM（fabric, trim, labels, packaging）
            for page_num in range(1, 6):  # Pages 2-6 (index 1-5)
                try:
                    page = pdf.pages[page_num]
                    tables = page.extract_tables()

                    if not tables:
                        continue

                    # 找到最大的表格（BOM 主表）
                    main_table = max(tables, key=len)
                    all_rows.extend(main_table)

                    self.stdout.write(f'✓ Page {page_num + 1}: 提取 {len(main_table)} 行')
                except Exception as e:
                    self.stdout.write(f'⚠️  Page {page_num + 1} 跳過: {str(e)}')
                    continue

        self.stdout.write(f'\n✅ 總共提取 {len(all_rows)} 行\n')

        # 使用合併後的資料
        bom_table = all_rows

        # 創建或取得 Style 和 Revision
        org = Organization.objects.first()
        if not org:
            self.stdout.write(self.style.ERROR('❌ 找不到 Organization'))
            return

        style, created = Style.objects.get_or_create(
            organization=org,
            style_number='LW1FLWS',
            defaults={
                'style_name': 'Nulu Spaghetti Cami Contrast Neckline Tank with Bra',
                'season': 'Spring 2025',
                'customer': 'lululemon'
            }
        )

        if created:
            self.stdout.write(f'✅ 創建 Style: {style.style_number}')
        else:
            self.stdout.write(f'✓ Style 已存在: {style.style_number}')

        revision, created = StyleRevision.objects.get_or_create(
            style=style,
            revision_label='Rev A',
            defaults={'status': 'draft'}
        )

        if created:
            self.stdout.write(f'✅ 創建 Revision: {revision.revision_label}')
        else:
            self.stdout.write(f'✓ Revision 已存在: {revision.revision_label}')

        # 刪除舊的 BOM items
        deleted_count = BOMItem.objects.filter(revision=revision).count()
        if deleted_count > 0:
            BOMItem.objects.filter(revision=revision).delete()
            self.stdout.write(f'🗑️  刪除 {deleted_count} 筆舊 BOM items\n')

        # 解析 BOM 表格
        self.stdout.write('📋 解析 BOM 表格...\n')

        # 找到 header row（包含 "Supplier Article" 或 "Placement"）
        header_row_idx = None
        for idx, row in enumerate(bom_table):
            row_text = ' '.join([str(cell) for cell in row if cell])
            if 'Supplier Article' in row_text or ('Placement' in row_text and 'Material' in row_text):
                header_row_idx = idx
                self.stdout.write(f'✓ 找到 header row {idx}: {row[:4]}')
                break

        if header_row_idx is None:
            # Debug: 顯示所有行
            self.stdout.write('\n🔍 Debug: 顯示所有行找 header...')
            for idx, row in enumerate(bom_table[:5]):
                self.stdout.write(f'  Row {idx}: {row[:4]}')
            self.stdout.write(self.style.ERROR('\n❌ 找不到表格 header'))
            return

        self.stdout.write(f'✓ Header 在第 {header_row_idx} 行')

        # 解析 header，找出各欄位的索引（使用固定位置，更可靠）
        # 根據實際 PDF 結構定義欄位位置
        col_indices = {
            'placement': 2,              # Placement
            'supplier_article_no': 3,    # Supplier Article #
            'material_status': 5,        # Material Status
            'material': 6,               # Material
            'supplier': 7,               # Supplier
            'total_leadtime': 9,         # Total Leadtime
            'usage': 12,                 # Usage
            'bom_uom': 13,              # BOM UOM
            'price_per_unit': 14,       # Price Per Unit
            'color_1': 16,              # First color column
            'color_2': 18,              # Second color column
        }

        self.stdout.write(f'✓ 使用固定欄位位置: {len(col_indices)} 個欄位\n')

        # 解析資料行
        item_number = 1
        current_category = 'fabric'  # 預設類別
        created_items = []

        for row_idx in range(header_row_idx + 1, len(bom_table)):
            row = bom_table[row_idx]

            # 檢查是否是類別標題（fabric, trim, packaging, label）
            first_cell = ' '.join(str(row[0]).split()).lower() if row[0] else ''
            if first_cell in ['fabric', 'trim', 'packaging', 'label']:
                current_category = first_cell
                self.stdout.write(f'\n📂 類別: {current_category.upper()}')
                continue

            # 跳過空行
            if not any(cell and str(cell).strip() for cell in row):
                continue

            # 提取欄位
            try:
                placement = row[col_indices['placement']] if len(row) > col_indices['placement'] else ''
                supplier_article_no = row[col_indices['supplier_article_no']] if len(row) > col_indices['supplier_article_no'] else ''
                material_status = row[col_indices['material_status']] if len(row) > col_indices['material_status'] else ''
                material = row[col_indices['material']] if len(row) > col_indices['material'] else ''
                supplier = row[col_indices['supplier']] if len(row) > col_indices['supplier'] else ''
                total_leadtime = row[col_indices['total_leadtime']] if len(row) > col_indices['total_leadtime'] else ''
                usage = row[col_indices['usage']] if len(row) > col_indices['usage'] else ''
                bom_uom = row[col_indices['bom_uom']] if len(row) > col_indices['bom_uom'] else ''
                price_per_unit = row[col_indices['price_per_unit']] if len(row) > col_indices['price_per_unit'] else ''
                color_1 = row[col_indices['color_1']] if len(row) > col_indices['color_1'] else ''
                color_2 = row[col_indices['color_2']] if len(row) > col_indices['color_2'] else ''

                # 清理資料
                def clean_cell(cell):
                    if cell is None or cell == '':
                        return ''
                    return ' '.join(str(cell).split())

                placement = clean_cell(placement)
                supplier_article_no = clean_cell(supplier_article_no)
                material = clean_cell(material)
                supplier = clean_cell(supplier)
                material_status_clean = clean_cell(material_status)
                total_leadtime_clean = clean_cell(total_leadtime)
                usage_clean = clean_cell(usage)
                bom_uom_clean = clean_cell(bom_uom)
                price_clean = clean_cell(price_per_unit)
                color_1_clean = clean_cell(color_1)
                color_2_clean = clean_cell(color_2)

                # 跳過沒有物料名稱的行
                if not material or len(material) < 3:
                    continue

                # 判斷 consumption maturity（根據 material status）
                if 'approved' in material_status_clean.lower():
                    consumption_maturity = 'confirmed'
                else:
                    consumption_maturity = 'pre_estimate'

                # 處理 color（合併兩個 color 欄位）
                colors = []
                if color_1_clean:
                    colors.append(color_1_clean)
                if color_2_clean and color_2_clean != color_1_clean:
                    colors.append(color_2_clean)
                color_final = ', '.join(colors) if colors else ''

                # 處理 usage（轉換為 Decimal）
                try:
                    consumption_value = Decimal(usage_clean.replace('$', '').replace(',', '')) if usage_clean else None
                except:
                    consumption_value = None

                # 跳過沒有有效 consumption 的項目（None 或 0）
                if consumption_value is None or consumption_value == 0:
                    continue

                # 處理 price（轉換為 Decimal）
                try:
                    price_value = Decimal(price_clean.replace('$', '').replace(',', '')) if price_clean else None
                except:
                    price_value = None

                # 處理 leadtime（轉換為 Integer）
                try:
                    leadtime_value = int(total_leadtime_clean) if total_leadtime_clean and total_leadtime_clean.isdigit() else None
                except:
                    leadtime_value = None

                # 創建 BOMItem
                bom_item = BOMItem.objects.create(
                    revision=revision,
                    item_number=item_number,
                    category=current_category,
                    material_name=material[:200],
                    supplier=supplier[:100] if supplier else '',
                    supplier_article_no=supplier_article_no[:100] if supplier_article_no else '',
                    color=color_final[:100] if color_final else '',
                    material_status=material_status_clean[:100] if material_status_clean else '',
                    placement=[placement] if placement else [],
                    consumption=consumption_value,
                    consumption_maturity=consumption_maturity,
                    unit=bom_uom_clean if bom_uom_clean else ('yards' if current_category == 'fabric' else 'pcs'),
                    unit_price=price_value,
                    leadtime_days=leadtime_value,
                    is_verified=False
                )

                created_items.append(bom_item)

                # 顯示（包含完整資訊）
                status_emoji = '✅' if consumption_maturity == 'confirmed' else '📊'

                # 準備顯示文字
                color_display = f'[{color_final[:15]}]' if color_final else ''
                usage_display = f'{consumption_value} {bom_uom_clean}' if consumption_value else 'N/A'
                price_display = f'${price_value}' if price_value else 'N/A'
                leadtime_display = f'{leadtime_value}d' if leadtime_value else 'N/A'

                self.stdout.write(
                    f'{status_emoji} {item_number:2d}. {material[:28]:28s} '
                    f'| Art#: {supplier_article_no:15s} '
                    f'| {color_display:17s} '
                    f'| Usage: {usage_display:12s} '
                    f'| LT: {leadtime_display:5s} '
                    f'| ${price_display:7s}'
                )

                item_number += 1

            except Exception as e:
                self.stdout.write(f'⚠️  跳過第 {row_idx} 行: {str(e)}')
                continue

        # 總結
        self.stdout.write('\n' + '='*70)
        self.stdout.write(self.style.SUCCESS(f'\n✅ 成功導入 {len(created_items)} 筆 BOM items'))
        self.stdout.write(f'   Style: {style.style_number} - {style.style_name}')
        self.stdout.write(f'   Revision: {revision.revision_label}')

        # 按類別統計
        from collections import Counter
        category_counts = Counter([item.category for item in created_items])
        self.stdout.write(f'\n📊 分類統計:')
        for category, count in category_counts.items():
            self.stdout.write(f'   {category.capitalize()}: {count}')

        maturity_counts = Counter([item.consumption_maturity for item in created_items])
        self.stdout.write(f'\n🔍 用量成熟度:')
        for maturity, count in maturity_counts.items():
            emoji = '✅' if maturity == 'confirmed' else '📊'
            self.stdout.write(f'   {emoji} {maturity.replace("_", " ").title()}: {count}')

        self.stdout.write(f'\n查看結果: http://127.0.0.1:8000/admin/styles/bomitem/')
        self.stdout.write('')
