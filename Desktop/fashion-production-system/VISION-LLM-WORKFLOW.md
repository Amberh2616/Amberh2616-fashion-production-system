# Vision LLM 提取流程說明

## 📊 完整流程（What We Did）

### Step 1: PDF → 圖片
```python
# 使用 pdfplumber 將 PDF 頁面轉換為高清圖片
page.to_image(resolution=150)  # 150 DPI 高清
# → 轉為 PNG 格式
# → Base64 編碼
```

### Step 2: 圖片 → GPT-4o Vision API
```python
# 發送給 OpenAI GPT-4o Vision
client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "提取所有文字（包括圖形標註）"},
                {"type": "image_url", "image_url": f"data:image/png;base64,{img}"}
            ]
        }
    ]
)
```

### Step 3: AI 識別文字
GPT-4o Vision 會：
1. **OCR 識別**所有可見文字（包括圖片中的）
2. **分類**文字類型（header/body/annotation/dimension/callout）
3. **返回 JSON 格式**結果

```json
[
  {"text": "logo placed on wearers left", "type": "body"},
  {"text": "5.5\" from mid of logo to CB", "type": "dimension"},
  ...
]
```

### Step 4: 翻譯 + 保存
```python
# 逐個翻譯（使用 GPT-4o Mini）
for block in extracted:
    translation = machine_translate(block['text'])  # 另一個 API 呼叫

    # 保存到數據庫
    DraftBlock.objects.create(
        source_text=block['text'],
        translated_text=translation
    )
```

---

## 💰 Token 消耗分析

### Page 7 實際消耗（剛才的執行）：

**1. Vision API 呼叫（1次）**
- Input Tokens: ~2,000 tokens
  - Prompt: ~200 tokens（"請提取所有文字..."）
  - 圖片: ~1,800 tokens（150 DPI PNG ≈ 1-2MB）
- Output Tokens: ~500 tokens（返回 31 個文字塊的 JSON）
- **成本**: $0.01 - 0.02

**2. 翻譯 API 呼叫（23次）**
- 每個新 block 翻譯 1 次
- 每次: ~50 input + 80 output tokens
- 23 次 × 130 tokens = ~3,000 tokens
- **成本**: $0.005 - 0.01

**總成本: ~$0.015 - 0.03 / 頁**

---

## 🔄 完整 Tech Pack 成本估算

### 假設：7 頁 Tech Pack

**方法 1: 只用 pdfplumber（原本的做法）**
- 提取文字層: 免費
- 翻譯: 121 blocks × 130 tokens ≈ $0.02
- **總成本: $0.02**
- ❌ **無法提取圖形標註**

**方法 2: 混合模式（推薦）** ⭐
- pdfplumber 提取文字層: 免費
- Vision 只處理有圖形標註的頁面（如 Page 7）: $0.02
- 翻譯: 144 blocks (121+23) × 130 tokens ≈ $0.025
- **總成本: $0.045**
- ✅ **完整提取所有文字**

**方法 3: 全頁 Vision（最貴）**
- Vision 處理 7 頁: 7 × $0.02 = $0.14
- 翻譯: 200+ blocks ≈ $0.04
- **總成本: $0.18**
- ✅ **最完整，但成本高**

---

## 🎯 建議策略（成本優化）

### Phase 1: 智能混合模式（推薦）

```python
def parse_tech_pack_smart(pdf_path):
    for page_num in range(1, total_pages + 1):
        # 1️⃣ 先用 pdfplumber 提取
        pdfplumber_blocks = extract_with_pdfplumber(page, page_num)

        # 2️⃣ 檢查是否需要 Vision
        if has_technical_drawings(page):  # 有圖紙標註？
            vision_blocks = extract_with_vision(pdf_path, page_num)
            # 合併（去重）
            all_blocks = merge_blocks(pdfplumber_blocks, vision_blocks)
        else:
            all_blocks = pdfplumber_blocks

        # 3️⃣ 翻譯
        translate_blocks(all_blocks)
```

**判斷規則：**
- ✅ **需要 Vision**: Page 4-7（通常有圖紙標註）
- ❌ **不需要**: Page 1-3（BOM/尺寸表/工序，純表格）

**成本**: $0.04 - 0.06 / Tech Pack（7頁）

---

## 📈 規模化成本（300 款/季）

### 情境：1 個 Merchandiser 管理 300 款

**每季 Tech Pack 處理：**
- 300 款 × $0.05 = **$15**
- 時間節省: 300 款 × 30 分鐘 = 150 小時 → **自動化省下 3-4 週工時**

**vs 人工成本：**
- 人工處理: 150 小時 × $30/hr = $4,500
- AI 處理: $15
- **ROI: 300x**

---

## 🔧 技術細節（Token 計算）

### Vision API Token 計算公式

**圖片 Token 數 = (width × height) / tile_size**

```
150 DPI Tech Pack Page (8.5" × 11"):
- 寬度: 1275 px
- 高度: 1650 px
- Tile size: 512 × 512 = 262,144 px
- Tiles needed: (1275 × 1650) / 262,144 ≈ 8 tiles
- Tokens: 8 × 255 = 2,040 tokens
```

**加上 detail="high" 模式:**
- 低解析度預覽: +85 tokens
- 高解析度 tiles: 8 × 255 = 2,040 tokens
- **總計: ~2,125 tokens / 頁**

### 翻譯 API Token 計算

```
平均 Block:
- 原文: "logo placed on wearer's left" (5 words)
- Input: ~50 tokens
- 翻譯: "標誌放置在穿著者的左側" (10 chars)
- Output: ~80 tokens
- 總計: 130 tokens / block
```

---

## 💡 優化建議

### 1. 批次翻譯（降低成本 30%）
```python
# 不要一個一個翻譯
for block in blocks:
    translate(block.text)  # ❌ 23 次 API 呼叫

# 批次翻譯
batch_translate([b.text for b in blocks])  # ✅ 1 次 API 呼叫
```

### 2. Cache 翻譯結果
```python
# 常見詞彙不重複翻譯
if text in translation_cache:
    return translation_cache[text]
```

### 3. 只 Vision 必要頁面
```python
# 判斷哪些頁面需要 Vision
need_vision = ["PAGE 04", "PAGE 05", "PAGE 06", "PAGE 07"]  # 圖紙頁
```

---

## 📊 實際數據（Page 7）

剛才的執行日誌顯示：
- Vision API: 1 次呼叫（~$0.02）
- 翻譯 API: 23 次呼叫（~$0.005）
- **總成本: ~$0.025**
- **時間: 約 40 秒**

vs 人工:
- 手動提取標註文字: 10-15 分鐘
- 手動翻譯: 5-10 分鐘
- **總時間: 15-25 分鐘**

**時間節省: 30x**
**成本: $0.025 vs $10（人工成本）**

---

## 🎯 結論

**Vision LLM 提取：**
- ✅ 完整提取（包括圖形標註）
- ✅ 成本可控（$0.02-0.05/頁）
- ✅ 速度快（40秒/頁）
- ✅ 準確度高（GPT-4o Vision）

**適用場景：**
- Tech Pack 圖紙頁（Page 4-7）
- 有箭頭標註、尺寸說明的頁面
- OCR 無法處理的複雜排版

**不適用：**
- 純表格頁面（BOM/尺寸表）→ 用 pdfplumber 免費提取
- 純文字頁面 → 用 pdfplumber 免費提取
