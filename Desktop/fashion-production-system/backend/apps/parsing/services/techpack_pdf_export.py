"""
Tech Pack 雙語 PDF 匯出服務
使用 Pillow (PIL) 在 PDF 圖片上繪製中文翻譯，然後轉回 PDF
"""

from django.http import HttpResponse
import fitz  # PyMuPDF
import os
from pathlib import Path
import logging
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO

logger = logging.getLogger(__name__)


# 查找系統中文字體
def find_chinese_font():
    """
    查找可用的中文字體（Pillow 使用）
    """
    font_paths = [
        "C:/Windows/Fonts/simsunb.ttf",   # 宋體粗體
        "C:/Windows/Fonts/msyh.ttf",      # 微軟雅黑
        "C:/Windows/Fonts/simhei.ttf",    # 黑體
        "C:/Windows/Fonts/simkai.ttf",    # 楷體
    ]

    for font_path in font_paths:
        if os.path.exists(font_path):
            logger.info(f"Found Chinese font for Pillow: {font_path}")
            return font_path

    logger.error("No Chinese TTF font found!")
    return None


class TechPackBilingualPDFExporter:
    """Export Tech Pack with bilingual translation overlays"""

    def __init__(self, tech_pack_revision, font_size=24):
        """
        Args:
            tech_pack_revision: TechPackRevision instance
            font_size: 中文字體大小 (預設 24pt，最小 16pt 才能正確顯示中文)
        """
        self.revision = tech_pack_revision
        # 確保字體大小至少 16pt，否則 Pillow 無法渲染中文
        self.font_size = max(16, font_size)

    def export(self):
        """
        Export bilingual Tech Pack PDF (原始 PDF + 中文疊加)
        使用 Pillow 在圖片上繪製中文，保證中文顯示正確

        Returns:
            HttpResponse with PDF file
        """
        # 查找中文字體
        chinese_font_path = find_chinese_font()
        if not chinese_font_path:
            raise Exception("Chinese font not found.")

        # 加載 Pillow 字體
        try:
            pil_font = ImageFont.truetype(chinese_font_path, self.font_size)
            logger.info(f"Loaded font: {chinese_font_path}, size: {self.font_size}")

            # 測試字體是否能渲染中文
            test_img = Image.new('RGB', (200, 100), color='white')
            test_draw = ImageDraw.Draw(test_img)
            test_draw.text((10, 10), "測試中文", font=pil_font, fill=(0, 0, 200))

            # Windows 環境保存測試圖片
            import tempfile
            test_path = os.path.join(tempfile.gettempdir(), f"font_test_{self.font_size}.png")
            test_img.save(test_path)
            logger.info(f"Font test image saved: {test_path}")

        except Exception as e:
            logger.error(f"Failed to load font: {e}")
            raise Exception(f"Failed to load Chinese font: {e}")

        # 打開原始 PDF
        pdf_doc = fitz.open(self.revision.file.path)

        # 用於存儲處理後的圖片
        processed_images = []

        # 處理每一頁
        for page_data in self.revision.pages.all().order_by('page_number'):
            page = pdf_doc.load_page(page_data.page_number - 1)

            # 1. 將 PDF 頁面轉換為高解析度圖片
            mat = fitz.Matrix(2, 2)  # 2x 解析度
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")

            # 2. 用 Pillow 打開圖片
            img = Image.open(BytesIO(img_data))
            draw = ImageDraw.Draw(img)

            # 3. 獲取該頁所有 blocks（按位置排序）
            blocks = page_data.blocks.all().order_by('bbox_y', 'bbox_x')

            # 用於沒有正確 bbox 的 blocks，垂直排列
            fallback_y = 50  # 從頂部 50px 開始
            fallback_x = 50  # 左邊距 50px
            drawn_count = 0

            logger.info(f"Page {page_data.page_number}: Processing {blocks.count()} blocks")

            for block in blocks:
                chinese_text = block.edited_text or block.translated_text
                if not chinese_text or not chinese_text.strip():
                    logger.debug(f"Block {block.id}: No Chinese text, skipping")
                    continue

                # 檢查是否有有效的 bbox
                has_valid_bbox = (block.bbox_x != 0 or block.bbox_y != 0)

                if has_valid_bbox:
                    # 有正確位置：放在原位
                    x = block.bbox_x * 2
                    y = block.bbox_y * 2
                    text_y = y - 4
                    if text_y < 10:
                        text_y = y + self.font_size * 2
                    logger.debug(f"Block at ({x}, {text_y}): {chinese_text[:20]}")
                else:
                    # 沒有正確位置：垂直排列在左側
                    x = fallback_x
                    text_y = fallback_y
                    fallback_y += self.font_size * 2 + 5  # 每行間隔 5px
                    logger.info(f"Fallback position ({x}, {text_y}): {chinese_text[:20]}")

                # 4. 在圖片上繪製中文文字
                try:
                    draw.text(
                        (x, text_y),
                        chinese_text,
                        font=pil_font,
                        fill=(255, 0, 0)  # 紅色 RGB（更明顯）
                    )
                    drawn_count += 1
                except Exception as e:
                    logger.error(f"Failed to draw text '{chinese_text}': {e}")

            logger.info(f"Page {page_data.page_number}: Drew {drawn_count} Chinese texts")

            # 調試：保存第1頁到文件
            if page_data.page_number == 1:
                debug_path = f"C:/Users/AMBER/Desktop/fashion-production-system/debug_page1_after_draw.png"
                img.save(debug_path)
                logger.info(f"DEBUG: Saved page 1 to {debug_path}")

            # 5. 將處理後的圖片保存到內存
            img_bytes = BytesIO()
            img.save(img_bytes, format='PNG')
            processed_images.append(img_bytes.getvalue())

        pdf_doc.close()

        # 6. 用 PyMuPDF 創建新 PDF，插入圖片
        try:
            output_pdf = fitz.open()  # 創建空白 PDF

            for img_bytes in processed_images:
                # 獲取圖片尺寸
                img = Image.open(BytesIO(img_bytes))
                w, h = img.size

                # 創建新頁面（尺寸與圖片相同）
                page = output_pdf.new_page(width=w, height=h)

                # 將圖片插入到頁面
                page.insert_image(page.rect, stream=img_bytes)

            # 轉換為字節
            pdf_bytes = output_pdf.tobytes()
            output_pdf.close()

        except Exception as e:
            logger.error(f"Failed to create PDF with PyMuPDF: {e}")
            raise Exception(f"Failed to create PDF: {e}")

        # 創建 HTTP 響應
        filename = f"{self.revision.filename.replace('.pdf', '')}_bilingual.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        return response


def export_techpack_bilingual_pdf(tech_pack_revision, font_size=16):
    """
    便捷函數：匯出雙語 Tech Pack PDF

    Args:
        tech_pack_revision: TechPackRevision instance
        font_size: 中文字體大小 (預設 16pt，最小 16pt)

    Returns:
        HttpResponse with PDF file
    """
    exporter = TechPackBilingualPDFExporter(tech_pack_revision, font_size)
    return exporter.export()
