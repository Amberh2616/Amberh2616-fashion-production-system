"""
测试 GPT-4o Vision detail: low vs high 的差异
"""
import os
import sys
import json
import base64
import fitz  # PyMuPDF

# 设置 Django 环境
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

import django
django.setup()

from django.conf import settings as django_settings
from openai import OpenAI

# 获取 API key
OPENAI_API_KEY = django_settings.OPENAI_API_KEY

# PDF 文件路径
PDF_PATH = "demo_data/techpacks/LW1FLWS TECH PACK.pdf"
TEST_PAGE = 3  # 测试第 3 页（通常有较多标注）


def extract_page_image(pdf_path: str, page_num: int, dpi: int = 300) -> str:
    """提取 PDF 页面为 base64 图片"""
    doc = fitz.open(pdf_path)
    page = doc.load_page(page_num - 1)

    # 转换为高分辨率图片
    pix = page.get_pixmap(matrix=fitz.Matrix(dpi/72, dpi/72))
    img_bytes = pix.tobytes("png")
    doc.close()

    return base64.b64encode(img_bytes).decode('utf-8')


def extract_with_vision(img_base64: str, detail: str) -> dict:
    """使用 GPT-4o Vision 提取文字"""
    client = OpenAI(api_key=OPENAI_API_KEY)

    prompt = """Extract ALL visible text from this technical drawing page.

Include:
1. All body text and labels
2. Dimension measurements (e.g., "5.5\" from CB")
3. Arrow callouts and annotations
4. Table content
5. Any handwritten notes
6. Small text in corners (style numbers, dates, etc.)

Return a JSON object:
{
    "total_items": <number>,
    "items": [
        {"text": "...", "type": "label|dimension|note|table|other"},
        ...
    ]
}

Extract EVERY piece of text you can see. Be thorough."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_base64}",
                        "detail": detail
                    }
                }
            ]
        }],
        max_tokens=4000,
        temperature=0.1
    )

    result_text = response.choices[0].message.content
    usage = response.usage

    # 清理 markdown
    if "```json" in result_text:
        result_text = result_text.split("```json")[1].split("```")[0].strip()
    elif "```" in result_text:
        result_text = result_text.split("```")[1].split("```")[0].strip()

    try:
        data = json.loads(result_text)
    except:
        data = {"total_items": 0, "items": [], "raw": result_text}

    return {
        "detail": detail,
        "data": data,
        "tokens": {
            "prompt": usage.prompt_tokens,
            "completion": usage.completion_tokens,
            "total": usage.total_tokens
        }
    }


def main():
    print(f"\n{'='*60}")
    print(f"GPT-4o Vision Detail Comparison Test")
    print(f"{'='*60}")
    print(f"PDF: {PDF_PATH}")
    print(f"Page: {TEST_PAGE}")
    print(f"{'='*60}\n")

    # 提取图片（300 DPI）
    print("📷 提取 PDF 页面 (300 DPI)...")
    img_base64 = extract_page_image(PDF_PATH, TEST_PAGE, dpi=300)
    print(f"   图片大小: {len(img_base64) // 1024} KB (base64)\n")

    # 测试 LOW detail
    print("🔍 测试 detail: LOW...")
    result_low = extract_with_vision(img_base64, "low")
    print(f"   提取项目数: {result_low['data'].get('total_items', len(result_low['data'].get('items', [])))}")
    print(f"   Tokens: {result_low['tokens']}")

    # 测试 HIGH detail
    print("\n🔍 测试 detail: HIGH...")
    result_high = extract_with_vision(img_base64, "high")
    print(f"   提取项目数: {result_high['data'].get('total_items', len(result_high['data'].get('items', [])))}")
    print(f"   Tokens: {result_high['tokens']}")

    # 比较结果
    print(f"\n{'='*60}")
    print("📊 比较结果")
    print(f"{'='*60}")

    low_count = result_low['data'].get('total_items', len(result_low['data'].get('items', [])))
    high_count = result_high['data'].get('total_items', len(result_high['data'].get('items', [])))

    print(f"\n| 指标 | LOW | HIGH | 差异 |")
    print(f"|------|-----|------|------|")
    print(f"| 提取项目数 | {low_count} | {high_count} | +{high_count - low_count} |")
    print(f"| Prompt Tokens | {result_low['tokens']['prompt']} | {result_high['tokens']['prompt']} | +{result_high['tokens']['prompt'] - result_low['tokens']['prompt']} |")
    print(f"| Completion Tokens | {result_low['tokens']['completion']} | {result_high['tokens']['completion']} | +{result_high['tokens']['completion'] - result_low['tokens']['completion']} |")

    # 成本计算
    low_cost = (result_low['tokens']['prompt'] * 2.5 + result_low['tokens']['completion'] * 10) / 1_000_000
    high_cost = (result_high['tokens']['prompt'] * 2.5 + result_high['tokens']['completion'] * 10) / 1_000_000

    print(f"| 预估成本 | ${low_cost:.4f} | ${high_cost:.4f} | +${high_cost - low_cost:.4f} |")

    # 保存详细结果
    output = {
        "pdf": PDF_PATH,
        "page": TEST_PAGE,
        "low": result_low,
        "high": result_high
    }

    with open("vision_detail_comparison.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 详细结果已保存到 vision_detail_comparison.json")

    # 显示 HIGH 提取的部分内容
    print(f"\n{'='*60}")
    print("📝 HIGH Detail 提取内容（前 20 项）")
    print(f"{'='*60}")

    items = result_high['data'].get('items', [])
    for i, item in enumerate(items[:20]):
        text = item.get('text', '')[:50]
        item_type = item.get('type', 'unknown')
        print(f"  {i+1}. [{item_type}] {text}")

    if len(items) > 20:
        print(f"  ... 还有 {len(items) - 20} 项")


if __name__ == "__main__":
    main()
