# Phase 2-1 真正完成 - 修復計劃

**目標**：讓 Phase 2-1 達到「真正 Done」標準，不是感覺完成

**總時間**：2-3 小時

---

## 🎯 核心原則（用戶要求）

> **Phase 2 輸出的資料，一旦標記為 confirmed，Phase 3 不得修改其語意，只能引用或複製。**

---

## ❌ 當前缺口總結

### 資料層
1. ❌ BOMItem/Measurement/ConstructionStep 缺少 `verified_by`, `verified_at`
2. ❌ 缺少 `translation_status` 欄位
3. ❌ DraftReviewItem 與最終資料斷裂（無法追溯）

### UI 層
4. ⚠️ 確認狀態視覺化不足（UI 上看不出哪些已確認）

### 邊界
5. ❌ 沒有 Phase 2/3 邊界宣言文檔

---

## ✅ P0 任務（必做 - 2 小時）

### Task 1: 添加審核追蹤欄位（30 分鐘）

**目標**：讓 BOMItem/Measurement/ConstructionStep 知道「誰、何時確認的」

**修改文件**：
- `backend/apps/styles/models.py`
  - 添加 `verified_by` (ForeignKey to User, nullable)
  - 添加 `verified_at` (DateTimeField, nullable)
- Migration
- Serializers

**修改範圍**：
```python
# BOMItem, Measurement, ConstructionStep 都添加：
verified_by = models.ForeignKey(
    'core.User',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='verified_%(class)s_items'
)
verified_at = models.DateTimeField(null=True, blank=True)
```

---

### Task 2: 添加翻譯狀態欄位（30 分鐘）

**目標**：讓每筆資料知道翻譯狀態

**選項 A（推薦 - 快速）**：
- 添加 `translation_status` (CharField)
- Choices: 'pending', 'confirmed'

**選項 B（更乾淨 - 改動大）**：
- 分離欄位：`original_name` + `translated_name`
- 不推薦（Phase 2 收尾階段避免大改）

**修改文件**：
- `backend/apps/styles/models.py`
  ```python
  TRANSLATION_STATUS_CHOICES = [
      ('pending', 'Pending Translation'),
      ('confirmed', 'Translation Confirmed'),
  ]

  # BOMItem
  translation_status = models.CharField(
      max_length=20,
      choices=TRANSLATION_STATUS_CHOICES,
      default='pending'
  )

  # Measurement, ConstructionStep 同理
  ```

---

### Task 3: UI 視覺化確認狀態（30 分鐘）

**目標**：讓用戶一眼看出「這段我確認過了」

**修改文件**：
- `frontend/components/review/BlockOverlayItem.tsx`

**添加視覺指標**：
- ✓ 圖示（verified 狀態）
- 顏色變化（綠色邊框 = verified）
- Tooltip 顯示「Verified by {user} at {time}」

**偽代碼**：
```tsx
const isVerified = block.status === 'verified';

const borderColor = missing
  ? "red"
  : isVerified
    ? "green"
    : isSelected
      ? "blue"
      : "gray";

{isVerified && (
  <div className="absolute top-1 right-1">
    <CheckCircle className="w-4 h-4 text-green-600" />
  </div>
)}
```

---

### Task 4: 寫 Phase 2/3 邊界宣言（10 分鐘）

**目標**：明確定義 Phase 2 輸出的不可變性

**修改文件**：
- `CLAUDE.md`

**添加章節**：
```markdown
## Phase 2/3 邊界規則 🔒

### Phase 2 輸出定義

**Confirmed 資料**：
- `is_verified = True` AND `translation_status = 'confirmed'`
- 必須有 `verified_by` 和 `verified_at`

### Phase 3 使用規則

**✅ 允許**：
- 讀取 Phase 2 confirmed 資料
- 複製到 Phase 3 模型（如 T2PO, MWO）
- 快照到版本化資料（如 CostLine）

**❌ 禁止**：
- 修改 Phase 2 confirmed 資料的語意
- 自動回寫到 BOMItem/Measurement/ConstructionStep
- AI 自動覆蓋已確認的翻譯

### 例外情況

**如果需要修改**：
- 創建新的 Revision（Rev B, Rev C）
- 或手動 unverify → 修改 → re-verify
```

---

## ⏰ 時間分配

| Task | 預估時間 | 累計時間 |
|------|---------|---------|
| Task 1: 審核追蹤欄位 | 30 min | 0.5 hr |
| Task 2: 翻譯狀態欄位 | 30 min | 1.0 hr |
| Task 3: UI 視覺化 | 30 min | 1.5 hr |
| Task 4: 邊界宣言 | 10 min | 1.7 hr |
| **緩衝時間** | 30 min | **2.0 hr** |

**總計**：2 小時（含緩衝）

---

## 📝 P1 任務（可延後）

### Task 5: 來源追蹤（1 小時）

**目標**：追溯每筆資料從 PDF 哪裡來

**添加欄位**：
```python
source_document = models.ForeignKey('documents.Document', ...)
source_page = models.IntegerField(null=True)
source_block_id = models.CharField(max_length=50, blank=True)
```

---

### Task 6: DraftReviewItem 關聯（1 小時）

**目標**：追溯審核歷史

**添加欄位**：
```python
# BOMItem, Measurement, ConstructionStep
source_review_item = models.ForeignKey(
    'parsing.DraftReviewItem',
    on_delete=models.SET_NULL,
    null=True,
    blank=True
)
```

---

## ✅ 完成標準（自我測試）

完成 P0 任務後，回答這 3 個問題：

### 1️⃣ Demo 信心
**問**：「如果現在要 demo 給別人看，我敢不敢說這是 Phase 2 完整交付？」

**答**：
- ✅ 能看到誰確認的、何時確認的
- ✅ 能看到翻譯狀態
- ✅ UI 上清楚顯示確認狀態
- ✅ 有明確的邊界文檔

→ **YES**

---

### 2️⃣ 回頭修改風險
**問**：「Phase 3 寫到一半，我會不會回頭動 parsing / 翻譯邏輯？」

**答**：
- ✅ Phase 2 confirmed 資料有明確定義
- ✅ Phase 3 只能讀取、不能修改
- ✅ 邊界清晰

→ **NO（不會回頭改）**

---

### 3️⃣ 半年後理解度
**問**：「半年後我回來看，還看得懂這些欄位為什麼存在嗎？」

**答**：
- ✅ 每個欄位有明確用途
- ✅ 有邊界文檔說明
- ✅ 有審核追蹤

→ **YES**

---

## 🚀 執行順序

1. **Task 4 先做**（10 分鐘）
   - 寫邊界宣言 → 心理契約成立 → 腦袋輕 30%

2. **Task 1 + Task 2**（1 小時）
   - 資料層修復（migration 一次搞定）

3. **Task 3**（30 分鐘）
   - UI 視覺化

4. **測試驗證**（30 分鐘）
   - 跑一遍完整流程
   - 回答 3 個自我測試問題

---

## ✅ 完成後狀態

```
Phase 2-1: BOM 完善          [============] 100% ✅
  ├─ Inline edit consumption  ✅
  ├─ Edit drawer             ✅
  ├─ Search & sort           ✅
  ├─ Verification tracking   ✅ NEW
  ├─ Translation status      ✅ NEW
  ├─ UI confirmation visual  ✅ NEW
  └─ Phase 2/3 boundary doc  ✅ NEW

Phase 2-2: Costing System    [============] 100% ✅
  └─ All features complete

→ Phase 2 完整交付 ✅
→ 可以乾淨地進入 Phase 3 ✅
```

---

**準備好了嗎？** 🚀

開始執行？或者你想先討論修復方案？
