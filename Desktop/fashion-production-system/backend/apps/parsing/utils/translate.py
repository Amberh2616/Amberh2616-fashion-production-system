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


def get_translation_client():
    """
    取得翻譯用的 OpenAI client

    支援：
    - OpenAI API（預設）
    - LM Studio（OPENAI_BASE_URL=http://localhost:1234/v1）
    - Ollama（OPENAI_BASE_URL=http://localhost:11434/v1）
    """
    from openai import OpenAI
    import os

    base_url = os.getenv('OPENAI_BASE_URL')
    api_key = os.getenv('OPENAI_API_KEY')

    # 本地模型不需要真正的 API key
    if base_url and 'localhost' in base_url:
        api_key = api_key or 'not-needed'

    if base_url:
        return OpenAI(api_key=api_key, base_url=base_url)
    else:
        # 使用 OpenAI 預設端點
        return OpenAI(api_key=api_key)


def get_translation_model() -> str:
    """取得翻譯模型名稱"""
    import os
    return os.getenv('TRANSLATION_MODEL', 'gpt-4o-mini')


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

    環境變數：
    - OPENAI_BASE_URL: API 端點（預設 OpenAI，可改 LM Studio/Ollama）
    - TRANSLATION_MODEL: 模型名稱（預設 gpt-4o-mini）
    """
    # Critical Issue #1 修正：中文原文判斷
    if is_chinese(text):
        return ""  # 前端會判斷空字串 → 不顯示翻譯欄位

    # ✅ 翻譯（支援 OpenAI / LM Studio / Ollama）
    try:
        client = get_translation_client()
        model = get_translation_model()

        response = client.chat.completions.create(
            model=model,
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


def batch_translate(texts: list[str]) -> list[str]:
    """
    批量翻譯（顯著提升速度）

    Args:
        texts: 原文列表

    Returns:
        list[str]: 翻譯列表（與原文列表對應）

    Performance:
    - 單次翻譯 50 個文本：1 次 API 調用（3-5 秒）
    - vs 逐一翻譯：50 次 API 調用（50-100 秒）
    - 速度提升：10-20 倍
    """
    if not texts:
        return []

    # 過濾空文本和中文文本
    results = []
    texts_to_translate = []
    indices_to_translate = []

    for i, text in enumerate(texts):
        if not text or not text.strip():
            results.append("")
        elif is_chinese(text):
            results.append("")
        else:
            results.append(None)  # Placeholder
            texts_to_translate.append(text)
            indices_to_translate.append(i)

    # 如果沒有需要翻譯的文本，直接返回
    if not texts_to_translate:
        return results

    # 批量翻譯
    try:
        import json

        client = get_translation_client()
        model = get_translation_model()

        # 構建 JSON 格式提示
        prompt = f"""Translate the following English texts to Traditional Chinese. Return a JSON array with the same number of items.

Input:
{json.dumps(texts_to_translate, ensure_ascii=False)}

Output format: ["translation1", "translation2", ...]

Rules:
- Keep technical terms accurate
- Preserve formatting
- Return ONLY the JSON array"""

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a fashion industry translator. Translate English to Traditional Chinese."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=4000  # 增加 token 限制以支持批量
        )

        # 解析回應
        result_text = response.choices[0].message.content.strip()

        # 清理 markdown 格式
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.split("```")[1].split("```")[0].strip()

        translations = json.loads(result_text)

        # 填充結果
        for i, idx in enumerate(indices_to_translate):
            if i < len(translations):
                results[idx] = translations[i]
            else:
                results[idx] = texts[idx]  # Fallback

        return results

    except Exception as e:
        # 翻譯失敗，回傳原文
        print(f"Batch translation failed: {e}")
        for i in indices_to_translate:
            results[i] = texts[i]
        return results
