"""
BOM Extractor Service
Uses pdfplumber to extract BOM tables from PDF pages
"""

import pdfplumber
from decimal import Decimal, InvalidOperation
from typing import List, Dict
from apps.styles.models import StyleRevision, BOMItem
import logging

logger = logging.getLogger(__name__)


def extract_bom_from_pages(
    pdf_path: str,
    page_numbers: List[int],
    revision: StyleRevision
) -> int:
    """
    從指定頁面提取 BOM 表格

    Args:
        pdf_path: PDF 檔案路徑
        page_numbers: BOM 表格所在頁碼（1-indexed）
        revision: 目標 StyleRevision

    Returns:
        創建的 BOMItem 數量
    """
    logger.info(f"Extracting BOM from pages {page_numbers} in {pdf_path}")

    # 1. 提取所有表格行
    all_rows = []
    with pdfplumber.open(pdf_path) as pdf:
        for page_num in page_numbers:
            page = pdf.pages[page_num - 1]  # 轉為 0-indexed
            tables = page.extract_tables()

            if tables:
                # 選擇最大的表格（通常是主表）
                main_table = max(tables, key=len)
                all_rows.extend(main_table)
                logger.info(f"Page {page_num}: Extracted {len(main_table)} rows")

    logger.info(f"Total rows extracted: {len(all_rows)}")

    # 2. 解析表格並創建 BOMItem
    created_count = 0
    item_number = 1
    current_category = 'fabric'  # Default category

    for row in all_rows:
        # 判斷是否為 category header
        first_cell = str(row[0]).lower().strip() if row and row[0] else ''

        if first_cell in ['fabric', 'trim', 'packaging', 'label']:
            current_category = first_cell
            logger.debug(f"Category changed to: {current_category}")
            continue

        # 跳過 header rows
        if 'supplier article' in str(row).lower() or 'material name' in str(row).lower():
            continue

        # 跳過空行
        if not any(row):
            continue

        # 解析欄位（基於 Lululemon BOM 格式）
        # 典型欄位：[Item#, Color, Size, Supplier Article#, Our Article#, Material Name, Supplier, ...]
        try:
            material_name = clean_cell(row[5]) if len(row) > 5 else ''

            # 過濾無效行
            if not material_name or len(material_name) < 3:
                continue

            supplier = clean_cell(row[6]) if len(row) > 6 else ''
            supplier_article_no = clean_cell(row[3]) if len(row) > 3 else ''

            # 用量和單位
            consumption = parse_decimal(row[11]) if len(row) > 11 else Decimal('0')
            unit = clean_cell(row[12]) if len(row) > 12 else 'pcs'

            # 單價
            unit_price = parse_decimal(row[13]) if len(row) > 13 else None

            # 翻譯 material_name
            from apps.parsing.utils.translate import machine_translate
            material_name_zh = machine_translate(material_name)

            # 創建 BOMItem（is_verified=False，待驗證）
            BOMItem.objects.create(
                organization=revision.organization,
                revision=revision,
                item_number=item_number,
                category=current_category,
                material_name=material_name[:200],
                material_name_zh=material_name_zh[:200],  # ⭐ 中文翻譯
                supplier=supplier[:200],
                supplier_article_no=supplier_article_no[:100],
                consumption=consumption,
                unit=unit[:20],
                unit_price=unit_price,
                is_verified=False,  # ⭐ 待人工驗證
                ai_confidence=0.85,  # pdfplumber 提取信心度
            )

            item_number += 1
            created_count += 1
            logger.debug(f"Created BOMItem: {material_name}")

        except Exception as e:
            logger.warning(f"Failed to parse row: {row[:3]}... Error: {str(e)}")
            continue

    logger.info(f"BOM extraction completed: {created_count} items created")
    return created_count


def clean_cell(value) -> str:
    """清理表格單元格內容"""
    if value is None:
        return ''

    text = str(value).strip()

    # 移除換行符
    text = text.replace('\n', ' ').replace('\r', ' ')

    # 移除多餘空格
    text = ' '.join(text.split())

    return text


def parse_decimal(value) -> Decimal:
    """解析 Decimal 值"""
    if value is None:
        return Decimal('0')

    try:
        # 移除非數字字元（保留小數點和負號）
        clean_value = ''.join(c for c in str(value) if c.isdigit() or c in '.-')

        if not clean_value or clean_value in ['-', '.', '-.']:
            return Decimal('0')

        return Decimal(clean_value)
    except (InvalidOperation, ValueError):
        return Decimal('0')
