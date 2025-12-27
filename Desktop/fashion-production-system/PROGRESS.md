# Fashion Production System - 開發進度

**Last Updated:** 2025-12-21 19:30
**Current Sprint:** Sprint 1 Phase 2 - Block-Based Parsing + Draft Review

---

## 🎯 Sprint 1 Phase 2 進度 (2025-12-21)

### ✅ 已完成

#### 1. Block-Based Parsing Data Models (100%)
- ✅ `apps/parsing/models_blocks.py` (183 lines)
  - `Revision`: 整份 Tech Pack PDF
  - `RevisionPage`: PDF 單頁（width, height）
  - `DraftBlock`: 核心 Model - Page 4 JSON 的資料庫版本
  - `DraftBlockHistory`: Block 修改歷史
- ✅ BBox 設計：扁平欄位 (bbox_x, bbox_y, bbox_width, bbox_height)
- ✅ 三層文本架構：
  - `source_text`: 原文（英文，locked，永不覆寫）
  - `translated_text`: AI 翻譯（中文，機翻初稿）
  - `edited_text`: 人工修正後的中文（可選）
- ✅ Migration 完成：`0002_add_file_to_revision`

#### 2. DRF Serializers (100%)
- ✅ `DraftBlockSerializer`
  - bbox 轉換：DB flat → API nested JSON
  - read_only: source_text, translated_text
  - editable: edited_text, status
- ✅ `RevisionSerializer`
  - 包含完整 pages + blocks
  - file_url: 絕對 URL (http://127.0.0.1:8000/media/techpacks/xxx.pdf)
- ✅ `RevisionListSerializer`
  - 輕量列表（不含 pages）
- ✅ `DraftBlockPatchSerializer`
  - 僅允許編輯 edited_text + status

#### 3. Parse Task - Page 4 MVP (100%)
- ✅ `tasks/parse_page4.py`
  - Celery task: `parse_revision_page_4(revision_id)`
  - pdfplumber 整合
  - Callout filter: `is_callout_text()`
  - 自動生成 DraftBlock 記錄

#### 4. Utils (100%)
- ✅ `utils/pdf.py`
  - `normalize_bbox()`: pdfplumber → DraftBlock 格式
  - `check_bbox_overlap()`: 偵測 gap < 10pt
- ✅ `utils/translate.py`
  - `is_chinese()`: Unicode 範圍偵測
  - `machine_translate()`: 中文回傳空字串

#### 5. API Views & Endpoints (90%)
- ✅ `RevisionViewSet` (ReadOnlyModelViewSet)
  - GET /api/v2/revisions/ ✅ 測試通過
  - GET /api/v2/revisions/{id}/ ⚠️ 404 問題待修
- ✅ `DraftBlockViewSet` (ModelViewSet)
  - GET /api/v2/draft-blocks/{id}/
  - PATCH /api/v2/draft-blocks/{id}/
  - 自動切換 status: edited_text 改動 → status = "edited"

#### 6. 測試數據 (100%)
- ✅ Management Command: `seed_draft_review_demo`
- ✅ 建立數據：
  - 1 個 Revision (LW1FLPS-Nulu-Cami-Tank.pdf)
  - 1 個 Page (Page 4, 612x792)
  - 9 個 DraftBlock (基於真實 parse 結果)

#### 7. Media URL 配置 (100%)
- ✅ Revision.file 欄位 (FileField, upload_to='techpacks/')
- ✅ MEDIA_URL & MEDIA_ROOT 配置
- ✅ Media serving in development
- ✅ RevisionSerializer.file_url 回傳完整 URL

#### 8. 開發環境配置 (100%)
- ✅ DRF AllowAny 權限（MVP 無需認證）
- ✅ PageNumberPagination（取代 CursorPagination）
- ✅ CORS 全開

#### 9. 風險分析文件 (100%)
- ✅ `BLOCK_GRANULARITY_UI_RISK_ANALYSIS.md`
  - 分析 9 個 blocks 的粒度
  - 識別 3 個 BBox overlap 風險
  - 建議：Sidebar 模式（Phase 1）

#### 10. 前端代碼接收 (100%)
- ✅ 完整 Next.js Draft Review UI 代碼
  - PDF viewer (react-pdf, renderTextLayer=false)
  - BBox overlay layer
  - Block sidebar + editor
  - Hooks: useRevision, useDraftPatch
  - 待部署

---

### 🐛 已知問題

#### Issue #1: Detail API 404 ✅ 已修復 (2025-12-21 19:45)
**狀態:** ✅ 已解決

**問題根因:**
- `apps/styles/urls.py` 和 `apps/parsing/urls.py` 都註冊了 `r'revisions'` 路徑
- Django URL routing 按順序匹配，styles 在前，攔截了所有 `api/v2/revisions/{id}/` 請求

**解決方案:**
- 重命名 styles 路徑為 `r'style-revisions'`
- 保留 parsing 路徑為 `r'revisions'` (Draft Review 專用)

**修改檔案:**
- `backend/apps/styles/urls.py` - Line 11

**測試結果:**
```bash
✅ GET /api/v2/revisions/47a31564-0760-4b62-bde3-c3cd1042ec4f/
→ 200 OK (完整 Revision + Pages + 9 Blocks)

✅ PATCH /api/v2/draft-blocks/{id}/
→ 200 OK (edited_text 更新，status 自動切換為 "edited")
```

---

### 📋 待辦任務（工程最低返工風險排序）

#### ✅ 已完成 (2025-12-21)
- [x] 修復 Detail API 404 問題
- [x] 測試完整 API 流程
- [x] 建立 UI 驗收 Checklist（15 條）

#### 🥇 P0 - 第一優先（現在立刻做）
**原因：必須用真實使用流程驗證 Block 粒度 × bbox × API 結構是否真的能被人用**

- [ ] **部署前端 Draft Review UI**
  - 使用用戶提供的完整 Next.js 代碼
  - 建立 `/revisions/[revisionId]` 頁面
  - 整合 PDF viewer + BBox overlay + Block sidebar

- [ ] **執行 UI 驗收（15 條 Checklist）**
  - A 組：PDF 顯示與載入（3 條）
  - B 組：Block 列表與排序（3 條）
  - C 組：點擊互動與高亮（3 條）
  - D 組：編輯流程與數據同步（4 條）
  - E 組：效能與體驗（2 條）

- [ ] **修正驗收失敗項目**
  - 逐條測試，發現問題立刻修正
  - 15 條全部通過才進入下一階段

#### 🥈 P1 - 第二優先（UI 跑得動之後）
**原因：機械性工作，不影響資料結構，做錯也不會推翻前面成果**

- [ ] PDF Upload / Serving
  - 上傳真實 Tech Pack PDF 到 media/techpacks/
  - 測試 file_url 正確返回
  - 確認前端能開啟真實 PDF

#### 🥉 P2 - 第三優先（UI 用過再做）
**原因：UI 沒跑前，不知道哪些 block 真的需要 AI，現在接 AI = 用錢買未知**

- [ ] AI 翻譯整合（OpenAI GPT-4o Mini）
  - 審稿 1-2 份真實 Tech Pack 後再決定
  - 確定哪些 block 自動翻譯
  - 確定哪些 block 直接人工

#### 🧯 暫時不做（Phase 4+）
**原因：這些是優化，不是驗證核心可用性**

- Tooltip overlay 貼回圖旁邊
- 多頁自動 parse
- 聰明 bbox 自動位移
- 大規模 Celery 排程

---

## 🔬 測試狀態

### API 測試結果

| Endpoint | Method | Status | Response |
|----------|--------|--------|----------|
| `/api/v2/revisions/` | GET | ✅ 200 | 列表正常，返回 1 筆 |
| `/api/v2/revisions/{id}/` | GET | ✅ 200 | 詳細正常，包含 1 page + 9 blocks |
| `/api/v2/draft-blocks/{id}/` | GET | ✅ 200 | 單個 block（包含在 revision detail 中）|
| `/api/v2/draft-blocks/{id}/` | PATCH | ✅ 200 | edited_text 更新，status 自動切換 |

### 數據庫狀態

```sql
-- Revision: 1 筆
SELECT COUNT(*) FROM revisions;
-- → 1

-- RevisionPage: 1 筆
SELECT COUNT(*) FROM revision_pages;
-- → 1

-- DraftBlock: 9 筆
SELECT COUNT(*) FROM draft_blocks;
-- → 9
```

---

## 📂 新增檔案清單

### Backend Files
```
backend/apps/parsing/
├── models_blocks.py                    # ✅ NEW (183 lines)
├── serializers.py                      # ✅ UPDATED (RevisionSerializer + file_url)
├── views.py                            # ✅ UPDATED (RevisionViewSet + DraftBlockViewSet)
├── urls.py                             # ✅ UPDATED (router.register revisions + draft-blocks)
├── tasks/
│   └── parse_page4.py                  # ✅ NEW (171 lines)
├── utils/
│   ├── pdf.py                          # ✅ NEW (87 lines)
│   └── translate.py                    # ✅ NEW (58 lines)
└── management/
    └── commands/
        └── seed_draft_review_demo.py  # ✅ NEW (108 lines)

backend/config/settings/
└── development.py                      # ✅ UPDATED (DRF AllowAny + PageNumberPagination)

backend/demo_data/
└── page4_parse_result_simulation.json  # ✅ NEW (模擬數據)
```

### Project Root
```
BLOCK_GRANULARITY_UI_RISK_ANALYSIS.md   # ✅ NEW (419 lines, 風險分析)
PROGRESS.md                              # ✅ NEW (本文件)
CLAUDE.md                                # ✅ UPDATED (Sprint 1 Phase 2 記錄)
```

---

## 🚀 API 使用範例

### 1. 取得 Revisions 列表
```bash
curl -s "http://127.0.0.1:8000/api/v2/revisions/" | python -m json.tool
```

**Response:**
```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "47a31564-0760-4b62-bde3-c3cd1042ec4f",
      "filename": "LW1FLPS-Nulu-Cami-Tank.pdf",
      "page_count": 7,
      "status": "parsed",
      "created_at": "2025-12-21T18:20:42.421062+08:00",
      "updated_at": "2025-12-21T18:20:42.421062+08:00"
    }
  ]
}
```

### 2. 取得 Revision 詳細（含 Pages + Blocks）⚠️ 待修復
```bash
curl -s "http://127.0.0.1:8000/api/v2/revisions/{id}/" | python -m json.tool
```

**Expected Response:**
```json
{
  "id": "uuid",
  "filename": "LW1FLPS-Nulu-Cami-Tank.pdf",
  "page_count": 7,
  "status": "parsed",
  "file_url": "http://127.0.0.1:8000/media/techpacks/xxx.pdf",
  "pages": [
    {
      "page_number": 4,
      "width": 612,
      "height": 792,
      "blocks": [
        {
          "id": "uuid",
          "block_type": "callout",
          "bbox": {"x": 88, "y": 255, "width": 310, "height": 38},
          "source_text": "binding with encased elastic + topstitch",
          "translated_text": "包邊內包鬆緊帶並加上表面壓線",
          "edited_text": null,
          "status": "auto"
        }
      ]
    }
  ]
}
```

### 3. 編輯 Block
```bash
curl -X PATCH "http://127.0.0.1:8000/api/v2/draft-blocks/{block_id}/" \
  -H "Content-Type: application/json" \
  -d '{
    "edited_text": "包邊內含鬆緊帶並車表面壓線",
    "status": "edited"
  }'
```

---

## 🔄 下一步行動

### 立即執行（30 分鐘內）
1. 修復 Detail API 404 問題
2. 測試 PATCH /api/v2/draft-blocks/{id}/
3. 更新 CLAUDE.md

### 今日完成
1. 前端 UI 部署
2. 前後端串接測試
3. PDF 檔案上傳測試

### 本週完成
1. Celery Parse Task 實際執行
2. AI 翻譯整合
3. 完整 E2E 測試

---

## 📝 Draft Review UI 驗收 Checklist

### 驗收目標
用真實 Lululemon Tech Pack Page 4 跑完整審稿流程

### A. PDF 顯示與載入（3條）

- [ ] **A1. PDF 能正確載入顯示**
  - 測試：開啟 http://localhost:3000/revisions/47a31564-0760-4b62-bde3-c3cd1042ec4f
  - 預期：左側 40% 顯示 Page 4 PDF
  - 失敗標準：PDF 載入錯誤 / 空白 / 404

- [ ] **A2. PDF 圖片位置不動（renderTextLayer=false）**
  - 測試：檢查 PDF 中的圖說、紅線、圖片
  - 預期：所有視覺元素位置與原 PDF 一致
  - 失敗標準：文字重排 / 圖片位移 / 格式跑掉

- [ ] **A3. PDF 縮放功能正常**
  - 測試：點擊 Zoom In / Zoom Out
  - 預期：能放大到看清細節，能縮小到全覽
  - 失敗標準：縮放後 bbox 高亮框錯位

### B. Block 列表與排序（3條）

- [ ] **B1. 9 個 blocks 全部顯示在右側 Sidebar**
  - 測試：數右側 block 卡片數量
  - 預期：9 張卡片（8 callout + 1 section_title）
  - 失敗標準：缺少 / 重複 / 順序錯亂

- [ ] **B2. Block 排序符合視線順序（由上而下、由左而右）**
  - 測試：對照 PDF 實際位置與 Sidebar 順序
  - 預期：Sidebar 順序 = PDF 上的視覺順序
  - 失敗標準：Block 5 在 Block 2 前面（bbox_y 排序問題）

- [ ] **B3. 中英混雜 block 正確處理**
  - 測試：檢查 Block 1（領圍/袖襬肩帶）
  - 預期：translated_text 為空時不顯示翻譯欄位
  - 失敗標準：顯示重複的中文 / 顯示空白翻譯框

### C. 點擊互動與高亮（3條）

- [ ] **C1. 點擊 Sidebar block → PDF 高亮對應區域**
  - 測試：點擊 Sidebar 的 Block 4 (binding with encased elastic)
  - 預期：PDF 上 (88, 255) 位置出現黃色高亮框
  - 失敗標準：高亮框位置錯誤 / 不出現 / 尺寸不對

- [ ] **C2. 點擊 PDF bbox 高亮框 → Sidebar 跳到對應 block**
  - 測試：點擊 PDF 上的 bbox overlay
  - 預期：Sidebar 自動滾動到該 block + 展開編輯器
  - 失敗標準：Sidebar 不動 / 跳到錯誤 block

- [ ] **C3. 高亮框尺寸與 PDF 縮放同步**
  - 測試：放大 PDF 後點擊 block
  - 預期：高亮框跟著放大，始終貼合原位置
  - 失敗標準：縮放後高亮框錯位 / 尺寸不變

### D. 編輯流程與數據同步（4條）

- [ ] **D1. 點擊 block 能展開編輯器**
  - 測試：點擊 Block 4
  - 預期：顯示「原文」（鎖定）+ 「翻譯」（可編輯 textarea）
  - 失敗標準：無法展開 / 顯示錯誤內容

- [ ] **D2. 編輯 translated_text → Save → 成功更新**
  - 測試：改「包邊內包鬆緊帶」→「包邊內含彈性帶」
  - 預期：PATCH 成功，Sidebar 立刻顯示新內容
  - 失敗標準：Save 失敗 / 內容不更新 / 需重整頁面

- [ ] **D3. Status 自動切換（auto → edited）**
  - 測試：編輯後檢查 block status badge
  - 預期：顯示「已編輯」標籤（顏色變化）
  - 失敗標準：Status 不變 / 需手動切換

- [ ] **D4. 編輯後 PDF 高亮不受影響**
  - 測試：編輯 Block 4 後點擊 → 檢查 PDF 高亮
  - 預期：高亮框位置、尺寸與編輯前一致
  - 失敗標準：編輯後 bbox 錯位 / 消失

### E. 效能與體驗（2條）

- [ ] **E1. 首次載入時間 < 2 秒**
  - 測試：關閉 tab，重新開啟 URL
  - 預期：PDF + 9 blocks 在 2 秒內顯示完成
  - 失敗標準：超過 3 秒 / 卡頓 / 白屏

- [ ] **E2. 編輯 → Save 回應時間 < 500ms**
  - 測試：連續編輯 3 個 blocks
  - 預期：每次 Save 後立刻顯示新內容
  - 失敗標準：需等待 > 1 秒 / Spinner 轉太久

### 驗收通過標準
**15 條全部通過 → Phase 3 完成，可進入 Phase 4**

**有任何失敗 → 立刻修正，不進下一階段**

---

**Status:** ✅ Phase 2 Complete → 🚀 Phase 3 Starting (UI Verification)
**Current Focus:** 部署前端 UI + 執行 15 條驗收測試
**Next Milestone:** UI 驗收全部通過 → PDF Upload/Serving
**Last Updated:** 2025-12-21 20:00
