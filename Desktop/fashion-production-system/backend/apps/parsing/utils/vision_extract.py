"""
Vision LLM - Extract text from Tech Pack images (including annotations)
使用 GPT-4o Vision 提取圖片中的所有文字（包括標註）
"""

import base64
from openai import OpenAI
from django.conf import settings


def extract_text_from_pdf_page_vision(pdf_path: str, page_number: int) -> list[dict]:
    """
    使用 GPT-4o Vision 提取 PDF 頁面中的所有文字（包括圖形標註）

    Args:
        pdf_path: PDF 檔案路徑
        page_number: 頁碼（1-indexed）

    Returns:
        List of extracted text blocks with approximate positions
        [
            {"text": "logo placed on wearer's left", "type": "annotation"},
            {"text": "5.5\" from mid of logo to CB", "type": "dimension"},
            ...
        ]
    """
    import pdfplumber
    from PIL import Image
    import io

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    # 1️⃣ 將 PDF 頁面轉為圖片
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_number - 1]

        # 轉換為 PIL Image
        im = page.to_image(resolution=150)
        pil_image = im.original

        # 轉為 base64
        buffered = io.BytesIO()
        pil_image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

    # 2️⃣ 使用 GPT-4o Vision 提取文字
    prompt = """You are analyzing a technical fashion specification document (Tech Pack).

Please extract ALL text visible on this page, including:
1. Headers and titles
2. Body text and descriptions
3. **Dimension annotations** (arrows with measurements like "5.5\" from mid of logo to CB")
4. **Callout labels** (text pointing to specific parts of drawings)
5. **Notes and instructions** (any text on or near diagrams)

Return the text as a JSON array. Each item should have:
- "text": the extracted text (preserve original case and punctuation)
- "type": one of ["header", "body", "annotation", "dimension", "callout", "note"]

Focus especially on text that appears ON or NEAR the technical drawings (arrows, dimension lines, labels).

Return ONLY the JSON array, no explanation."""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{img_base64}",
                            "detail": "high"
                        }
                    }
                ]
            }
        ],
        max_tokens=2000,
        temperature=0.1
    )

    # 3️⃣ 解析回應
    import json
    result_text = response.choices[0].message.content

    # 提取 JSON（可能被包在 ```json ... ``` 中）
    if "```json" in result_text:
        result_text = result_text.split("```json")[1].split("```")[0].strip()
    elif "```" in result_text:
        result_text = result_text.split("```")[1].split("```")[0].strip()

    extracted_blocks = json.loads(result_text)

    return extracted_blocks
