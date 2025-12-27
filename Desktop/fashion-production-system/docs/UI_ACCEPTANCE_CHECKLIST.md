# Phase 3 Draft Review UI 驗收清單（15 條）

版本：v2.2.1
日期：2025-12-21
範圍：Draft Review UI（Sidebar 模式 + PDF bbox 高亮）
核心不可變規則：

* PDF 圖片位置不動
* 原文完整保留
* 翻譯不得刪減/重組段落（本階段只做 review UI，不做 reflow）

---

## 測試準備

### 測試資料（必備）

* 一筆 `Revision`（含 `file_url` 可讀的 PDF）
* 已 parse Page 4 且有 **9 blocks**（callout 8 + section_title 1）

### 測試路徑（例）

* UI：`/revisions/{revisionId}`
* API：

  * `GET /api/v2/revisions/{id}/`
  * `PATCH /api/v2/draft-blocks/{blockId}/`

---

## A 組：PDF 顯示與載入（3 條）

### A1. PDF 可載入（使用真實 file_url）

**步驟**

1. 打開 `/revisions/{revisionId}`
2. 等待 PDF 頁面出現（Page 4）

**PASS**

* PDF 成功渲染，無空白頁 / 無錯誤訊息
* console 無 CORS / 404 / MIME type 錯誤

**FAIL 常見原因**

* `file_url` 不可公開存取
* CORS 未允許 localhost
* PDF 回應 header 不正確

---

### A2. Page 4 顯示正確

**步驟**

1. 確認 UI 顯示 Page 4（或內建固定 Page 4）

**PASS**

* 顯示內容與 Tech Pack Page 4 一致（FRONT / INSIDE BRA VIEW）

---

### A3. Zoom / Scale 不會破版

**步驟**

1. 放大/縮小（例如 0.8x / 1.5x）
2. 滾動查看 PDF

**PASS**

* PDF 不抖動
* 文字/線條清晰
* 下一組的 bbox 仍能對齊（見 C 組）

---

## B 組：Block 列表與排序（3 條）

### B1. Block 數量正確

**步驟**

1. Sidebar 顯示 blocks 清單

**PASS**

* Page 4 blocks 數量 = 9（或符合你 seed/parse 結果）
* 不重複、不漏掉

---

### B2. Block 排序符合閱讀動線

**步驟**

1. Sidebar blocks 預設排序

**PASS**

* 主要依 `bbox.y` 由上到下
* 同 y 時依 `bbox.x` 由左到右
* 人眼看起來是「上→下」的自然順序

---

### B3. Block 類型呈現清楚（callout vs section_title）

**步驟**

1. 找到 `section_title`（INSIDE BRA VIEW）
2. 對比 `callout`

**PASS**

* UI 能分辨 block_type（例如標籤/樣式）
* section_title 不會被誤當成可編輯翻譯（或編輯行為可接受）

---

## C 組：點擊互動與高亮（3 條）

### C1. 點 Sidebar block → PDF bbox 高亮正確

**步驟**

1. 點任意 block（例如第一個 callout）
2. 觀察 PDF 上高亮框

**PASS**

* 高亮框位置「貼合原 block 文字/區域」
* 9 個 blocks 至少 9/9 對齊（允許 ≤ 2px 誤差）

**FAIL 常見原因**

* bbox 座標系方向錯（y 軸顛倒）
* overlay 參考容器錯（scale 沒乘、或乘錯）
* PDF page 寬高與 bbox 的寬高不一致

---

### C2. 點 PDF bbox → Sidebar 選中對應 block（若已做）

**步驟**

1. 點 PDF 上某個高亮框

**PASS**

* Sidebar 自動選中同一 block
* Editor 展開顯示該 block

（若你暫時沒做雙向互動，可標記為 Not Implemented，不算 FAIL）

---

### C3. 選中狀態一致

**步驟**

1. 切換選中不同 block

**PASS**

* PDF 高亮只顯示「一個 selected 狀態」
* Sidebar 也只選中同一筆
* 不會出現多選殘影

---

## D 組：編輯流程與數據同步（4 條）

### D1. 編輯框顯示原文 + 中文（可編輯）

**步驟**

1. 選中任一 block
2. 查看 editor 區塊

**PASS**

* 原文（source_text）可見且不可修改
* 中文欄位可輸入（edited_text）
* 若 translated_text 為空，UI 不崩（顯示「待翻譯」也可）

---

### D2. Save → PATCH 成功

**步驟**

1. 在 edited_text 輸入「測試中文」
2. 點 Save

**PASS**

* 呼叫 `PATCH /api/v2/draft-blocks/{id}/`
* 回應包含 `edited_text`
* status 自動變為 `edited`（後端已實作）

---

### D3. Refresh 後資料仍存在（不可丟失）

**步驟**

1. Save 後刷新頁面或按 Refresh
2. 回到同一 block

**PASS**

* edited_text 仍存在
* source_text 未被覆寫

---

### D4. 多行文字（含 \n）顯示正確

**步驟**

1. 找到含多行的 block（例如 85pt 高的那筆）
2. 在 editor 顯示原文/中文

**PASS**

* UI 以 `pre-line` 或等價方式顯示換行
* 不會把 \n 顯示成奇怪符號
* 編輯後存回去仍保留換行（若你允許）

---

## E 組：效能與體驗（2 條）

### E1. 互動延遲可接受

**步驟**

1. 點選 blocks（連續點 5 次）

**PASS**

* Sidebar 選中切換在 200ms~500ms 內（體感）
* 高亮框反應不超過 500ms
* 沒有卡死/白屏

---

### E2. 錯誤處理可理解

**步驟**

1. 模擬 API 失敗（關掉後端或改錯 revisionId）
2. 嘗試載入或 Save

**PASS**

* UI 顯示明確錯誤（例如「載入失敗」「儲存失敗」）
* 不會無限 loading

---

## ✅ 驗收完成判定

### Phase 3 成功標準（必達）

* A1、B1、C1、D2、D3 **全部 PASS**
* 其餘條目可允許少量 Not Implemented，但須記錄到待辦

---

## 驗收紀錄（建議格式）

* Revision ID：
* 測試人：
* PASS：__ / 15
* FAIL 清單：

  * [ ] C1 bbox y 軸顛倒（原因：…）
  * [ ] A1 CORS（原因：…）
* 下一步修正：

  * [ ] 修 Django CORS allow localhost:3000
  * [ ] 修 overlay 座標換算

---

## 下一步

如需「UI 驗收 Fail → 對應修法速查表」，請參考 `UI_ACCEPTANCE_TROUBLESHOOTING.md`
