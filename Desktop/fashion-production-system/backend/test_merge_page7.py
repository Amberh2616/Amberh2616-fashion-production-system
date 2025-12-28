#!/usr/bin/env python
"""
測試 Page 7 智能合併算法
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.parsing.models_blocks import Revision, RevisionPage, DraftBlock
import pdfplumber
from apps.parsing.utils.pdf import normalize_bbox
from apps.parsing.utils.text_merger import smart_merge_words
from django.db import transaction


def test_page7_merge():
    # 1️⃣ 準備
    revision_id = 'd3be25b0-01e5-4e3d-afe8-ca9578f1ebb2'
    page_num = 7

    revision = Revision.objects.get(id=revision_id)
    pdf_path = revision.file.path

    print(f"📄 Testing: {revision.filename}, Page {page_num}")

    # 2️⃣ 清空舊 blocks
    page_obj, created = RevisionPage.objects.get_or_create(
        revision=revision,
        page_number=page_num
    )
    old_count = DraftBlock.objects.filter(page=page_obj).count()
    DraftBlock.objects.filter(page=page_obj).delete()
    print(f"🗑️  Cleared {old_count} old blocks")

    # 3️⃣ 解析 Page 7
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_num - 1]

        # 擷取 words
        words = page.extract_words(
            use_text_flow=False,
            keep_blank_chars=False,
            x_tolerance=2,
            y_tolerance=2,
        )

        # 過濾（簡化版：保留所有 > 2 字元的）
        filtered_words = [w for w in words if len(w['text'].strip()) >= 2]

        # 排序
        filtered_words.sort(key=lambda w: (w['top'], w['x0']))

        print(f"📝 Extracted {len(filtered_words)} words")

        # 4️⃣ 使用新的智能合併
        merged = smart_merge_words(filtered_words)

        print(f"🔗 Merged into {len(merged)} blocks")

        # 5️⃣ 寫入 DB
        with transaction.atomic():
            for item in merged:
                bbox = normalize_bbox(
                    x0=item['x0'],
                    y0=item['top'],
                    x1=item['x1'],
                    y1=item['bottom'],
                )
                DraftBlock.objects.create(
                    page=page_obj,
                    source_text=item['text'],
                    bbox_x=bbox['x'],
                    bbox_y=bbox['y'],
                    bbox_width=bbox['width'],
                    bbox_height=bbox['height'],
                )

        print("✅ Blocks saved to DB")

    # 6️⃣ 檢查結果
    blocks = DraftBlock.objects.filter(page=page_obj).order_by('bbox_y', 'bbox_x')
    print(f"\n📊 Total blocks: {blocks.count()}")

    # 顯示所有 blocks
    print("\n📄 All blocks:")
    for i, b in enumerate(blocks, 1):
        text = b.source_text[:80] + "..." if len(b.source_text) > 80 else b.source_text
        print(f"{i:2d}. {text}")

    # 檢查 dimension blocks
    dimension_blocks = [
        b for b in blocks
        if '"' in b.source_text or 'from' in b.source_text.lower()
    ]
    print(f"\n📏 Dimension-related blocks: {len(dimension_blocks)}")
    if dimension_blocks:
        print("\nDimension blocks:")
        for i, b in enumerate(dimension_blocks, 1):
            print(f"{i}. {b.source_text}")

    return {
        'total_blocks': blocks.count(),
        'dimension_blocks': len(dimension_blocks),
        'improvement': f"{old_count} → {blocks.count()}"
    }


if __name__ == "__main__":
    result = test_page7_merge()
    print(f"\n🎯 Result: {result}")
