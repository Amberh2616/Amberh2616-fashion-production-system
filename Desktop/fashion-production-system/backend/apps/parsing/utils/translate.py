"""
Translation Utils

MVP: 語言判斷 + stub 翻譯
Phase 2: 接 GPT / 翻譯 API
"""

import re


def is_chinese(text: str) -> bool:
    """
    檢測文字是否包含中文字元

    Args:
        text: 待檢測文字

    Returns:
        bool: True 如果包含中文
    """
    # Unicode 範圍：CJK Unified Ideographs
    chinese_pattern = re.compile(r'[\u4e00-\u9fff]+')
    return bool(chinese_pattern.search(text))


def machine_translate(text: str) -> str:
    """
    機器翻譯

    Args:
        text: 原文

    Returns:
        str: 中文翻譯（如果原文已是中文，回傳空字串）

    Rules:
    - 如果原文已是中文 → 回傳 "" (前端不顯示翻譯欄位)
    - 如果原文是英文 → 翻譯成中文
    """
    # Critical Issue #1 修正：中文原文判斷
    if is_chinese(text):
        return ""  # 前端會判斷空字串 → 不顯示翻譯欄位

    # ✅ OpenAI 翻譯
    try:
        from openai import OpenAI
        import os

        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            # 沒有 API key，回傳原文
            return text

        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a fashion industry translator. Translate English to Traditional Chinese. Keep technical terms accurate."},
                {"role": "user", "content": text}
            ],
            temperature=0.3,  # 降低隨機性，提高一致性
            max_tokens=200
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        # 翻譯失敗，回傳原文
        print(f"Translation failed: {e}")
        return text
