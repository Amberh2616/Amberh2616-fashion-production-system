# UI 驗收 Fail → 修法速查表（Draft Review UI）

**版本：** v2.2.1
**日期：** 2025-12-21
**範圍：** Phase 3 UI 驗收故障排除
**目標：** 看到 FAIL 立刻知道先查哪裡、怎麼改、改完如何驗證

---

## 1) PDF 載不出來（A1 FAIL）

### 現象

* 白畫面 / Loading 卡住
* console：`CORS`、`Failed to fetch`、`Unexpected server response (0)`、`Invalid PDF structure`

### 最常見根因 & 修法

**(1) CORS**

* 前端 `localhost:3000` 讀 `127.0.0.1:8000/media/...` 被擋
* **修法（dev）**：Django 加 CORS allow

  * `django-cors-headers`
  * `CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]`

**✅ 你的狀態：已配置**
```python
# backend/config/settings/development.py
CORS_ALLOW_ALL_ORIGINS = True  # Line 35
```

**(2) file_url 回傳的是相對路徑**

* 前端拿到 `/media/...` 但以 `localhost:3000` 解析 → 404
* **修法**：後端 serializer 回絕對 URL（你已做 file_url）
* **驗證**：直接在瀏覽器開 file_url 能下載/顯示 PDF

**✅ 你的狀態：已實作**
```python
# apps/parsing/serializers.py
file_url = serializers.SerializerMethodField()
def get_file_url(self, obj):
    request = self.context.get('request')
    return request.build_absolute_uri(obj.file.url) if obj.file else None
```

**(3) Content-Type 錯**

* PDF 回應 header 不是 `application/pdf`
* **修法**：確認 Django media serving/反向代理設定
* **驗證**：Network 看 Response Headers

**✅ 你的狀態：Media serving 已配置**
```python
# backend/config/urls.py
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## 2) Page 4 顯示錯頁（A2 FAIL）

### 現象

* UI 顯示的是 Page 1 或其他頁
* Page number 切換不準

### 修法

* react-pdf `Page` 的 `pageNumber` 是 **1-based**
* 你要傳 `4` 才是 Page 4（不是 3）

✅ 驗證：標題「FRONT / INSIDE BRA VIEW」出現

---

## 3) bbox 高亮「上下顛倒」（C1 FAIL 典型）

### 現象

* 高亮框全部在奇怪位置
* 看起來像 y 軸翻轉（上面的框跑到下面）

### 根因

* bbox 的 y 來源混用：

  * pdfplumber：`top/bottom` 是「距離頁面上緣」
  * 你若改成用 fitz/PyMuPDF 或某些工具的座標（可能是下緣為 0）就會顛倒

### 修法（要選一種座標系統並統一）

**你現在用 pdfplumber → 正確做法：用 `top/bottom` 當 y**

```python
# apps/parsing/utils/pdf.py (已實作)
bbox_y = word["top"]
bbox_height = word["bottom"] - word["top"]
```

如果你拿到的是「下緣為 0」的座標系，轉換公式：

```python
# y0,y1 是以 bottom 為 0 的座標
top = page_height - y1
bottom = page_height - y0
```

✅ 驗證：任選 1 個 callout，框必須貼在原文附近

---

## 4) bbox 高亮「水平/垂直位移」（C1 FAIL）

### 現象

* 框大致在附近，但整體偏移固定距離
* 或框跟著滾動/縮放會飄

### 根因 & 修法

**(1) overlay 沒跟同一個定位容器**

* 你把 overlay 放在 scroll container 外面，導致 offset 累積
* **修法**：overlay 必須放在與 `<Page/>` 同一個 `relative` 容器內、使用 `absolute inset-0`

**(2) scale 沒乘 / 乘錯**

* pdfjs render scale 改變，但 bbox 沒乘
* **修法**：`left/top/width/height` 全都要 `* scale`

✅ 驗證：zoom 0.8x / 1.5x 之後框仍貼合

---

## 5) bbox 高亮「大小不對」（框太大/太小）（C1 FAIL）

### 現象

* 框偏大，吃掉附近空白
* 或只蓋到部分文字

### 根因

* 你用的是 `extract_words`：每個 word 的 bbox 可能很碎
* 或你把多個 words merge 時 bbox 計算錯

### 修法（MVP 推薦）

* Phase 3 先用「你目前 parse 出的 block bbox」（已經是最小可用）
* 若 bbox 偏鬆：可在 UI 減 padding（不要在 DB 改）

  * UI 上加 `inset`（例如 left+1, top+1, width-2, height-2）

✅ 驗證：9/9 blocks 框都合理貼近內容

---

## 6) Sidebar 點選 block，但 PDF 沒高亮（C1/C3 FAIL）

### 根因

* selectedBlockId state 沒傳到 bbox layer
* block.id 不一致（string vs uuid object）

### 修法

* UI 統一使用 `string` id
* 點 sidebar：`setSelectedBlockId(block.id)`
* BBoxLayer：`isSelected = b.id === selectedBlockId`

✅ 驗證：點不同 block，只有一個 selected 框存在

---

## 7) PATCH 失敗（D2 FAIL）

### 現象

* 400 / 403 / 415 / 500
* 後端回：`This field is required`、`Unsupported media type`

### 根因 & 修法

**(1) Content-Type 不對**

* **修法**：PATCH 必須 `Content-Type: application/json`

**(2) payload 欄位不在 PatchSerializer**

* **修法**：只能送 `edited_text`（+ 你允許的 `status`）

  * 不要送 `translated_text/source_text/bbox`

**✅ 你的狀態：已實作 DraftBlockPatchSerializer**
```python
# apps/parsing/serializers.py
class DraftBlockPatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = DraftBlock
        fields = ["edited_text", "status"]
```

**(3) CSRF / Auth（如果你之後開權限）**

* dev 先 `AllowAny`（你已做）
* 或加 token

**✅ 你的狀態：已配置 AllowAny**
```python
# backend/config/settings/development.py
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.AllowAny",  # MVP: No auth required
    ],
}
```

✅ 驗證：PATCH 回來 `status=edited`，且 edited_text 有值

---

## 8) PATCH 成功，但刷新後不見了（D3 FAIL）

### 根因

* 前端 optimistic state 沒更新 or refresh 沒打到正確 revision
* 或後端其實沒有保存（serializer.save 沒跑到）

### 修法

**前端**

* Save 後 `await refresh()`（你 MVP 可以這樣）
* 或 local state 直接替換該 block

**後端**

* DraftBlockViewSet 的 `partial_update` 要 `serializer.save()`
* 並回傳更新後 block

✅ 驗證：F5 重整後仍存在

---

## 9) 多行 block 顯示亂掉（D4 FAIL）

### 現象

* `\n` 被顯示成一行
* 文字擠在一起

### 修法

* 原文顯示用 `pre` + `whitespace-pre-wrap`
* 翻譯欄位用 textarea（本來就保留換行）

✅ 驗證：含 `\n` 的 block 顯示成兩行以上

---

## 10) UI 很卡（E1 FAIL）

### 根因

* 每次選 block 都觸發整頁 rerender + PDF 重載
* 或 revision JSON 太大時每次 refresh 都重拉整份

### 修法（Phase 3 最小）

* 選 block 不要 refresh revision
* 只在 Save 後 refresh
* PDF viewer component 用 `memo`（或把 sidebar state 跟 pdf viewer state 分離）

✅ 驗證：連點 5 次 block 不會卡死

---

## 最快 Debug 流程（照這個順序最省時間）

### 1. 先確認 PDF 能用 file_url 打開
**不用 UI，直接瀏覽器**
- 打開 `http://127.0.0.1:8000/api/v2/revisions/{id}/`
- 複製 `file_url` 值
- 在新分頁貼上 → 應該能下載/顯示 PDF

### 2. 確認 GET revision 的 Page 4 blocks bbox 數值合理
**檢查 bbox 數值範圍**
- `bbox_y` 應該在 0 到 page_height（約 792pt for A4）
- `bbox_x` 應該在 0 到 page_width（約 612pt for A4）
- `bbox_height` 不應該超過頁面高度

### 3. UI 只做 bbox 框（不貼字）
**先驗證定位，再做內容**
- 第一版：只畫空的 `<div>` 框（border: 2px solid red）
- 確認位置準確後，再加 hover/click/tooltip

### 4. 先不做 tooltip / overlay 翻譯
**避免擋住與漂移干擾 debug**
- Phase 3 只在 Sidebar 顯示翻譯
- 等 bbox 定位完全正確後，再考慮 overlay tooltip

---

## 當前系統狀態檢查

### ✅ 已完成配置（不需修改）
- CORS: `CORS_ALLOW_ALL_ORIGINS = True`
- Media Serving: `static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)`
- Permissions: `AllowAny` (dev)
- file_url: `build_absolute_uri()` 實作
- DraftBlockPatchSerializer: 只允許 `edited_text` + `status`
- bbox 正規化: `normalize_bbox()` 使用 pdfplumber `top/bottom`

### 🚧 待驗證（Phase 3 驗收）
- A1: PDF 實際載入
- C1: bbox 定位準確性
- D2: PATCH 流程完整性
- D3: 資料持久化
- E1: 互動效能

---

## 快速參考：關鍵檔案位置

### Backend
- CORS 設定: `backend/config/settings/development.py:35`
- URL 配置: `backend/config/urls.py:47`
- Media 設定: `backend/config/settings/base.py:104`
- Serializers: `backend/apps/parsing/serializers.py`
- bbox utils: `backend/apps/parsing/utils/pdf.py`

### Frontend
- API URL: `frontend/.env.local:2`
- API client: `frontend/lib/api/` (待建立)
- Draft Review UI: `frontend/app/revisions/[revisionId]/` (待建立)

---

**遇到第一個 FAIL？** 貼出現象 + console 錯誤，可立刻獲得對症修法！
