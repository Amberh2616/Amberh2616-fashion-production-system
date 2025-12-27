# Block 粒度 & UI Overlay 風險分析

**基於真實 Tech Pack Page 4 Parse 結果**

---

## 📊 Parse 結果總覽

```json
{
  "page_number": 4,
  "total_blocks": 9,
  "block_types": {
    "callout": 8,
    "section_title": 1
  },
  "中英混雜": true
}
```

---

## ✅ 成功案例（粒度正確）

### Block #2: "binding with encased elastic + topstitch"

```json
{
  "bbox": {"x": 88, "y": 255, "width": 310, "height": 38},
  "source_text": "binding with encased elastic + topstitch",
  "translated_text": "包邊內包鬆緊帶並加上表面壓線"
}
```

**✅ 為什麼粒度正確：**
- 一條紅線指向一個說明 = 一個 block
- 長度適中（39 字元）
- 翻譯後不會爆版（19 個中文字）
- bbox 高度 38pt ≈ 1.3cm（合理）

**UI Overlay 效果：**
```
PDF 原圖                     Overlay 翻譯
┌──────────────┐           ┌──────────────┐
│   [紅線指向]  │           │   [紅線指向]  │
│              │  →        │ 包邊內包鬆緊  │
│ binding with │           │ 帶並加上表面  │
│ encased...   │           │ 壓線          │
└──────────────┘           └──────────────┘
```

---

## ⚠️ 潛在問題案例

### 問題 1：中英混雜（Block #1）

```json
{
  "source_text": "領圍/袖襬肩帶：-加包邊壓1/8"三本雙針-加QQ帶",
  "translated_text": "領圍/袖襬肩帶：-加包邊壓1/8"三本雙針-加QQ帶"
}
```

**⚠️ 風險：**
- 原文已是中文，machine_translate() 回傳相同文字
- UI 會顯示「原文」和「翻譯」完全相同 → 困惑

**建議解決方案：**
```python
# utils/translate.py 加強
def machine_translate(text: str) -> str:
    # 檢測語言
    if is_chinese(text):
        return ""  # 或者 return None，UI 不顯示翻譯欄位

    # 英文才翻譯
    return gpt_translate(text)
```

---

### 問題 2：多行文字（Block #9）

```json
{
  "bbox": {"x": 360, "y": 510, "width": 220, "height": 85},
  "source_text": "bra elastic encased in L2
underband join seam lines up with wearer's left shelf bra side seam",
  "translated_text": "胸罩鬆緊帶包覆於 L2 層
下圍接縫線與穿著者左側內建胸罩側縫對齊"
}
```

**⚠️ 風險：**
- bbox 高度 85pt（約 3cm）→ 比一般 callout 大 2 倍
- 包含換行符 `
`
- UI overlay 可能擋住其他圖說

**UI 顯示問題：**
```
┌────────────────────┐
│ bra elastic        │  ← 第 1 行
│ encased in L2      │
│ underband join     │  ← 第 2 行（太長）
│ seam lines up...   │
└────────────────────┘
     ↓ 翻譯後
┌────────────────────┐
│ 胸罩鬆緊帶包覆於    │  ← 中文更短
│ L2 層              │
│ 下圍接縫線與穿著者  │
│ 左側內建胸罩側縫對齊│
└────────────────────┘
```

**建議解決方案：**
1. **Split 成兩個 block**（Phase 2）
2. **UI 支援多行顯示**（MVP 先這樣）
   ```tsx
   <div style={{
     whiteSpace: 'pre-line',  // 保留換行
     maxHeight: bbox.height,
     overflow: 'hidden'
   }}>
     {translatedText}
   </div>
   ```

---

### 問題 3：Section Title 與 Callout 混在一起

```json
{
  "id": "p4_b8",
  "block_type": "section_title",
  "source_text": "INSIDE BRA VIEW",
  "bbox": {"x": 385, "y": 340, "width": 170, "height": 32}
}
```

**⚠️ 風險：**
- 全大寫的標題被歸類為 `section_title`
- 但 UI overlay 可能把它當成 callout 顯示
- 樣式不統一

**建議解決方案：**
```tsx
// 前端根據 block_type 顯示不同樣式
{block.block_type === 'section_title' && (
  <div className="font-bold text-lg underline">
    {block.translated_text}
  </div>
)}

{block.block_type === 'callout' && (
  <div className="text-sm bg-yellow-50 p-1">
    {block.translated_text}
  </div>
)}
```

---

## 🔥 最嚴重的風險：BBox Overlap（重疊）

### 真實場景：Page 4 左上角

```
Page 4 Layout (真實情況):
┌───────────────────────────────────┐
│ 領圍/袖襬肩帶：        (y=115)    │  ← Block #1
│ -加包邊壓1/8"三本雙針               │
│                                   │
│ 內裡層見細節圖         (y=158)    │  ← Block #5 (可能重疊！)
│                                   │
│ binding with...       (y=255)    │  ← Block #2
└───────────────────────────────────┘
```

**計算重疊：**
```python
block1_bottom = block1.y + block1.height = 115 + 35 = 150
block5_top = 158

gap = block5_top - block1_bottom = 158 - 150 = 8pt (約 2.8mm)
```

**⚠️ 風險：**
- 間距只有 8pt → 翻譯後可能重疊
- 中文字高通常需要 12-14pt

**UI Overlay 實際效果：**
```
Original (OK):              Translated (Overlap!):
┌──────────────┐           ┌──────────────┐
│領圍/袖襬肩帶：│           │領圍/袖襬肩帶：│
│-加包邊壓1/8" │           │-加包邊壓1/8" │
│              │           │三本雙針-加QQ │ ← 撞到下面！
│內裡層見細節圖│           │帶            │
│              │           │內裡層見細節圖│
└──────────────┘           └──────────────┘
```

---

## 🎯 UI Overlay 策略建議

### 策略 1：側欄對照模式（MVP 推薦）⭐

**不在 PDF 上疊加翻譯，改用側欄對照**

```
┌─────────────────┬─────────────────┐
│ PDF Viewport    │ Translation     │
│ (40%)           │ Sidebar (60%)   │
├─────────────────┼─────────────────┤
│                 │ Block #2        │
│  [紅線]         │ ─────────────── │
│  binding with   │ 原文:           │
│  encased...     │ binding with... │
│                 │                 │
│                 │ 中文:           │
│                 │ 包邊內包鬆緊帶  │
│                 │ 並加上表面壓線  │
│                 │                 │
│                 │ [🔍 跳至 PDF]   │
└─────────────────┴─────────────────┘
```

**優點：**
- ✅ 完全避免重疊
- ✅ 圖片位置不動
- ✅ 可顯示完整翻譯（不受 bbox 限制）
- ✅ 可編輯、可搜尋

**缺點：**
- 需要左右視線移動

---

### 策略 2：Tooltip 模式（Phase 2）

```tsx
<BBoxHighlight
  bbox={block.bbox}
  onHover={() => showTooltip(block.translated_text)}
  onClick={() => jumpToSidebar(block.id)}
/>
```

**優點：**
- 滑鼠懸停才顯示
- 不會永久遮擋

**缺點：**
- 行動裝置不友善

---

### 策略 3：Toggle 模式（備選）

```
[Switch]  ○ 原文模式  ● 中文模式

中文模式時：
- 原文完全不顯示
- 只顯示翻譯 overlay
- 圖片保持不動
```

**優點：**
- 清爽

**缺點：**
- 無法對照

---

## 🚨 Critical Issues（必須修正）

### Issue #1：中文原文判斷

```python
# 當前問題
machine_translate("領圍/袖襬肩帶：-加包邊壓1/8"三本雙針-加QQ帶")
# → 回傳相同文字

# 修正方案
def machine_translate(text: str) -> str:
    if detect_language(text) == 'zh':
        return None  # 前端不顯示翻譯
    return gpt_translate(text, target='zh-TW')
```

### Issue #2：多行文字處理

```python
# 當前問題
source_text = "line1
line2"
# bbox.height = 85pt（包含兩行）

# 修正方案（Phase 2）
def split_multiline_blocks(block):
    if '
' in block.source_text:
        lines = block.source_text.split('
')
        # 為每一行建立獨立 block
        return [
            create_block(line, adjust_bbox(block.bbox, i))
            for i, line in enumerate(lines)
        ]
    return [block]
```

### Issue #3：BBox 間距檢查

```python
# 新增：Parse 後檢查
def check_bbox_overlap(blocks):
    blocks_sorted = sorted(blocks, key=lambda b: b.bbox_y)

    issues = []
    for i in range(len(blocks_sorted) - 1):
        curr = blocks_sorted[i]
        next = blocks_sorted[i + 1]

        curr_bottom = curr.bbox_y + curr.bbox_height
        gap = next.bbox_y - curr_bottom

        if gap < 10:  # 少於 10pt 警告
            issues.append({
                "type": "bbox_overlap_risk",
                "severity": "warning",
                "blocks": [curr.id, next.id],
                "gap": gap
            })

    return issues
```

---

## ✅ 最終建議（可立刻執行）

### Phase 1 MVP（現在做）

1. **採用側欄對照模式**
   - 左 40%: PDF Viewport
   - 右 60%: BlockSegmentsList（可點擊跳轉）

2. **修正 machine_translate()**
   - 加入中文判斷
   - 中文原文 → return None

3. **多行文字支援**
   - UI 用 `white-space: pre-line`
   - 不拆 block（Phase 2 再做）

4. **加入 bbox overlap 檢查**
   - Parse 後自動檢查
   - gap < 10pt → 產生 warning issue

### Phase 2（等 UI 跑起來再做）

1. Split 多行 block
2. Tooltip hover 模式
3. 智能 bbox 調整（避免重疊）

---

## 📸 UI Mockup（最終效果）

```
Draft Review Page
┌────────────────────────────────────────────────────────────┐
│ LW1FLPS - Nulu Cami Tank | Page 4/7 | Status: Draft        │
├──────────────────┬─────────────────────────────────────────┤
│                  │ [BOM] [Measurement] [Translation]       │
│  PDF Viewport    │ [Construction] [Issues]                 │
│  ┌────────────┐  │ ────────────────────────────────────── │
│  │            │  │ Translation Workbench                   │
│  │  Page 4    │  │                                         │
│  │            │  │ ┌─────────────────────────────────────┐ │
│  │ [Callout   │◄─┼─│ Block #2 | Page 4 | Callout         │ │
│  │  高亮框]   │  │ ├─────────────────────────────────────┤ │
│  │            │  │ │ 原文:                               │ │
│  │            │  │ │ binding with encased elastic +      │ │
│  │            │  │ │ topstitch                           │ │
│  │            │  │ │ ─────────────────────────────────── │ │
│  │            │  │ │ 中文: [可編輯]                       │ │
│  │            │  │ │ 包邊內包鬆緊帶並加上表面壓線          │ │
│  │            │  │ │                                     │ │
│  │            │  │ │ [🔍 跳至 PDF] Confidence: 95%       │ │
│  └────────────┘  │ └─────────────────────────────────────┘ │
│  [< Prev][Next>] │ ... (其他 blocks)                       │
└──────────────────┴─────────────────────────────────────────┘
```

---

## 🎯 驗證成功的標準

### 當你看到這個，就成功了：

✅ **9 個 blocks 都正確解析**
✅ **中英混雜正確處理**（中文不顯示「翻譯」）
✅ **多行文字正常顯示**（保留換行）
✅ **側欄點擊 → PDF 高亮對應 bbox**
✅ **編輯中文 → Save → 不影響原文**

---

**結論：這個 parse 結果的粒度是正確的，可以直接進 UI 開發！**
