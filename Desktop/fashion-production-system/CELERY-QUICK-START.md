# Celery 真異步驗證（Windows / Docker / WSL / Memurai）

- **目的**：在最短時間內確認 **HTTP API → Celery Worker → DB 狀態更新 → Draft Data 寫入** 全鏈路正常。
- **成功標準**：下方 **7/7 檢查點**全部通過，才開始做 Review UI。
- **適用範圍**：Django + DRF + Celery + Redis（本專案的 parse workflow）。

---

## 0) 7/7 核心檢查點（全過才算通過）

```
[ ] Redis 可連通（PING → PONG）
[ ] Django 讀到的 CELERY_BROKER_URL 正確
[ ] Celery Worker 啟動成功，且 tasks 已註冊（parse_techpack_task）
[ ] POST /revisions/{id}/parse/ 回 202 + extraction_run_id + job_id
[ ] Worker log 出現 Task received + succeeded（或 failed）
[ ] GET /extraction-runs/{id}/ status=completed（不能卡 pending）
[ ] GET /revisions/{id}/draft/ 取得 BOM/Measurement/Construction + issues
```

> **只要任一項沒過：停止做 UI，先修異步。**
> 90% 卡住原因是 **broker URL / queue 不一致**。

---

## 1) Windows 必備：避免終端機符號/編碼踩雷

### 1.1 建議開啟 UTF-8（一次性設定 + 當下終端保險）

**PowerShell（建議用系統管理員）**
```powershell
# 永久設定（重開終端後生效）
setx PYTHONUTF8 1

# 當下終端立即生效（保險）
chcp 65001
$env:PYTHONUTF8 = "1"
```

重開終端後驗證：
```powershell
python -c "import sys; print(sys.getdefaultencoding())"
# 期望：utf-8
```

### 1.2 測試/輸出建議
- 不要在測試腳本 `print("✓")`、`™` 這類符號（Windows/某些 shell 會炸）。
- 用 `[OK] / [WARN] / [ERROR]` 文字即可。

---

## 2) 啟動 Redis（擇一）

### Option A：Docker（最快、最推薦）

**避免「容器已存在」卡住：**
```bash
# 先強制刪除舊容器（如果存在）
docker rm -f fashion-plm-redis 2>nul

# 啟動新容器
docker run -d --name fashion-plm-redis -p 6379:6379 redis:7-alpine
```

驗證：
```bash
# 方式 1：進容器執行（推薦，不需要本機裝 redis-cli）
docker exec -it fashion-plm-redis redis-cli ping
# 期望：PONG

# 方式 2：本機 redis-cli（如果有裝）
redis-cli ping
# 期望：PONG
```

### Option B：WSL + Redis
```bash
# WSL Ubuntu
sudo apt update && sudo apt install -y redis-server
sudo service redis-server start
redis-cli ping
# 期望：PONG
```

### Option C：Memurai（Windows Native）
- 安裝並啟動 Memurai 服務後：

```bash
redis-cli ping
# 期望：PONG
```

---

## 3) 強制確認 Django 的 Broker URL（必做）

在專案 backend 目錄：
```bash
cd C:/Users/AMBER/Desktop/fashion-production-system/backend
python manage.py shell
```

```python
from django.conf import settings
print(settings.CELERY_BROKER_URL)
print(settings.CELERY_RESULT_BACKEND)
exit()
```

**期望輸出（例）：**
```
redis://localhost:6379/0
redis://localhost:6379/0
```

> **記住這個 URL**：下一步 Worker 啟動時的 `.> transport:` 行必須一字不差。

---

## 4) 啟動 Celery Worker（Windows 必須 solo）

開新終端（不要跟 runserver 混用）：

```bash
cd C:/Users/AMBER/Desktop/fashion-production-system/backend
celery -A config worker -l info --pool=solo -Q celery
```

### 4.1 必須看到的三個關鍵訊息

1) **Transport 行正確**：看到類似 `.> transport: redis://localhost:6379/0`（URL 必須與 Django 完全一致）
2) **Tasks 已註冊**：`[tasks]` 列表包含 `apps.parsing.tasks.parse_techpack_task`
3) **Worker 就緒**：最後一行顯示 `celery@YOUR-PC ready.`

> **注意：**
> - Celery 輸出格式是 `.> transport:`（有 `.>` 前綴），不是純 `transport:`
> - 只要 **transport 行的 URL 與 Django 一致**即可，不需要逐字完全匹配格式

---

## 5) 啟動 Django Server

再開一個新終端：

```bash
cd C:/Users/AMBER/Desktop/fashion-production-system/backend
python manage.py runserver
```

此時應該有三個「正在跑」的視窗/服務：
1) Redis（Docker/WSL/Memurai）
2) Celery Worker（顯示 ready）
3) Django Server（port 8000）

---

## 6) 用 Production Flow 建立測試資料（API 方式）

> 這段流程會跑：bulk-create → upload-init → complete → attach
> 為了驗證「你真正在產品會走的路」。

### 6.1 bulk-create（建立 Style + Revision）

**PowerShell（請用 `curl.exe`）**
```powershell
$body = @"
{
  "items": [{
    "style_number": "ASYNC-TEST-001",
    "style_name": "Async Test Style",
    "season": "SS25",
    "revision_label": "Rev A"
  }]
}
"@

curl.exe -i --fail-with-body -X POST "http://localhost:8000/api/v2/styles/bulk-create/" `
  -H "Content-Type: application/json" `
  -d $body
```

**你要記下回傳的 `revision_id`**
- `REVISION_ID = ...`

---

### 6.2 upload-init（建立文件上傳任務）

```powershell
$REVISION_ID = "<替換成你的 revision_id>"

$body = @"
{
  "doc_type": "techpack",
  "file_kind": "pdf",
  "filename": "async_test_techpack.pdf",
  "content_type": "application/pdf",
  "file_size": 1024,
  "style_revision_id": "$REVISION_ID"
}
"@

curl.exe -i --fail-with-body -X POST "http://localhost:8000/api/v2/documents/upload-init/" `
  -H "Content-Type: application/json" `
  -d $body
```

**你要記下回傳的 `document_id`**
- `DOCUMENT_ID = ...`

> 這裡通常會回 presigned url / mock url；本 Quick Start 重點是「workflow + DB 狀態」，不要求真的上傳檔案。

---

### 6.3 complete（回報上傳完成）

```powershell
$DOCUMENT_ID = "<替換成你的 document_id>"

$body = @"
{
  "file_hash": "async_test_hash_123",
  "file_size": 1024
}
"@

curl.exe -i --fail-with-body -X POST "http://localhost:8000/api/v2/documents/$DOCUMENT_ID/complete/" `
  -H "Content-Type: application/json" `
  -d $body
```

---

### 6.4 attach（把 Document 綁到 Revision）

```powershell
$DOCUMENT_ID = "<替換成你的 document_id>"
$REVISION_ID = "<替換成你的 revision_id>"

$body = @"
{
  "revision_id": "$REVISION_ID"
}
"@

curl.exe -i --fail-with-body -X POST "http://localhost:8000/api/v2/documents/$DOCUMENT_ID/attach/" `
  -H "Content-Type: application/json" `
  -d $body
```

---

## 7) 觸發 Parse（最關鍵的一步）

```powershell
$REVISION_ID = "<替換成你的 revision_id>"

$body = @"
{
  "targets": ["bom", "measurement", "construction"]
}
"@

curl.exe -i --fail-with-body -X POST "http://localhost:8000/api/v2/revisions/$REVISION_ID/parse/" `
  -H "Content-Type: application/json" `
  -d $body
```

### 7.1 期望回應（必須是 202）

- HTTP **202 Accepted**
- 回傳包含：
  - `extraction_run_id`
  - `job_id`
  - `status: "queued"`

**記下**
- `EXTRACTION_RUN_ID = ...`
- `JOB_ID = ...`

> **重要：**
> - 若回 200：通常代表你在 view 用了同步執行（這不算真異步驗證通過）
> - 即使用了 `.delay()`，View 也必須設計成「立即回 202」而不是等 task 跑完

---

## 8) 立刻看 Worker log（必須看到 received + succeeded/failed）

切換到 Worker 終端，你必須看到類似：

```
Task apps.parsing.tasks.parse_techpack_task[JOB_ID] received
Task apps.parsing.tasks.parse_techpack_task[JOB_ID] succeeded in Xs: {...}
```

若完全沒看到任何新 log：
- 先回到 **第 3 & 4 步**：檢查 Django vs Worker broker URL 是否一致
- 快速定位：檢查 Redis queue 長度

```bash
# Docker 方式
docker exec -it fashion-plm-redis redis-cli LLEN celery

# 本機 redis-cli
redis-cli LLEN celery
```

**結果判斷：**
- `> 0`：Django 有發出 task，但 Worker 沒消費（通常是 broker URL / queue name / worker 參數不一致）
- `= 0`：Django 根本沒 enqueue（view 沒用 `.delay()` 或發送前就 exception）

---

## 9) 查 ExtractionRun 狀態（不能卡 pending）

```powershell
$EXTRACTION_RUN_ID = "<替換成你的 extraction_run_id>"

curl.exe -i --fail-with-body "http://localhost:8000/api/v2/extraction-runs/$EXTRACTION_RUN_ID/"
```

**期望：**
- `status` 變成 `completed`（或 `failed`）
- 不能一直 `pending`

若卡 `pending`：
1) Worker 沒收到 task（看第 8 步）
2) broker/queue 不一致（看第 3/4 步）
3) task crash 但沒寫回狀態（看 worker stacktrace）

---

## 10) 查 Draft Data（驗證資料真的寫回 DB）

```powershell
$REVISION_ID = "<替換成你的 revision_id>"

curl.exe -i --fail-with-body "http://localhost:8000/api/v2/revisions/$REVISION_ID/draft/"
```

**期望：**
- `bom.items` 有資料
- `measurement.points` 有資料
- `construction.steps` 有資料
- `issues` 有資料（stub 會有 error issues）

---

## 11) 失敗時的「最短定位法」

### Case A：POST /parse/ 回 202，但 Worker 沒任何 received

1. **檢查 Django broker：**
```bash
python manage.py shell -c "from django.conf import settings; print(settings.CELERY_BROKER_URL)"
```

2. **檢查 Worker transport：** 看 worker 啟動時 `.> transport:` 那行

3. **檢查 Redis queue 長度：**
```bash
redis-cli LLEN celery
# 或
docker exec -it fashion-plm-redis redis-cli LLEN celery
```

- **queue 有堆積**：worker 沒在吃（可能 queue name / transport / worker 啟動參數問題）
- **queue 沒堆積**：Django 沒發出去（parse view 沒用 `.delay()` 或發送前就 exception）

### Case B：Worker received 但 failed

- 直接看 worker stacktrace（先修 task 例外處理、DB 更新、import 問題）

### Case C：Worker succeeded 但狀態仍 pending / draft 為空

- task 沒有正確 `save()` / 沒更新 ExtractionRun status
- DB transaction/exception handling 有問題（以 worker log 為準）

---

## 12) 驗證通過！你需要貼給我用來一次定位的 3 份輸出

**當你完成上述所有步驟後，請提供以下 3 段文字輸出（不需要截圖）：**

### 輸出 1：Redis 連接驗證
```bash
# Docker 方式
docker exec -it fashion-plm-redis redis-cli ping

# 或本機方式
redis-cli ping
```
**貼出結果**

---

### 輸出 2：Worker 啟動段（關鍵 3 行）

從 Worker 終端複製包含以下內容的段落：
```
.> transport: redis://localhost:6379/0
[tasks]
  . apps.parsing.tasks.parse_techpack_task
celery@YOUR-PC ready.
```
**貼出完整段落**

---

### 輸出 3：POST /parse/ 的完整回應

```powershell
# 你執行的這個命令的完整輸出
curl.exe -i --fail-with-body -X POST "http://localhost:8000/api/v2/revisions/$REVISION_ID/parse/" ...
```

**貼出包含：**
- HTTP status code（202）
- 完整 JSON response（含 `extraction_run_id`, `job_id`, `status`）

---

## 13) 通過後的下一步（建議順序）

一旦 7/7 通過，你就可以安全開始下一階段：

### 選項 A：Review UI（推薦，快速看到產品成形）
- UI 輪詢：`GET /extraction-runs/{id}/`（2s 一次）
- completed 後：拉 `GET /revisions/{id}/draft/`
- 顯示 issues（gating）
- inline edit draft + approve

### 選項 B：加監控/觀測（可選）
- 安裝 Flower：`pip install flower`
- 啟動：`celery -A config flower --port=5555`
- 瀏覽器開 `http://localhost:5555` 監控 task 執行狀態

### 選項 C：將 stub parse 逐步換成真 AI pipeline
- 保留同一份 AI-JSON-SCHEMA（輸入輸出不變）
- 替換 `parse_techpack_task` 內部實作（PyMuPDF + GPT-4 Vision）
- Evidence + Confidence + Issues 都照 schema 填入

---

## 附錄：反返工提醒（本專案常見踩雷）

- `document_type` 已改名為 `doc_type`
- `storage_path` 已改名為 `storage_key`
- `content_hash` 已改名為 `file_hash`
- Document ordering 用 `uploaded_at`（不是 `created_at`）
- PowerShell 務必用 `curl.exe`（避免呼叫到 PS 的 `Invoke-WebRequest` alias）
- Windows Celery 必須 `--pool=solo`（不能用 prefork）
- **所有 API endpoint 路徑都帶尾巴 `/`**（DRF 預設會被 trailing slash 影響）

---

**最後更新：** 2025-12-20
**版本：** FINAL
**下一步：** 執行本指南，貼出 3 段文字輸出
