# TODO 開發清單

**最後更新：** 2024-12-13
**當前專案：** Fashion Production System (Django + Next.js)

---

## 🔴 高優先級（本週必做）

### 1. 資料庫設計（Django Models）
- [ ] 設計核心 Models：
  - [ ] `Organization` - 多租戶支援
  - [ ] `User` - 多用戶 + 角色權限
  - [ ] `TechPack` - Tech Pack 主表
  - [ ] `Style` - 款式資訊
  - [ ] `BOM` - 物料清單
  - [ ] `Measurement` - 尺寸表
  - [ ] `Construction` - 工序說明
  - [ ] `ManufacturingSheet` - 製造單
  - [ ] `PurchaseOrder` - 採購單
  - [ ] `Supplier` - 供應商
  - [ ] `Material` - 物料庫
  - [ ] `AILearningLog` - AI 學習記錄
- [ ] 設計資料庫關聯（Foreign Keys, Many-to-Many）
- [ ] 設計索引（Index）優化查詢
- [ ] 設計審計欄位（created_at, updated_at, created_by, updated_by）
- [ ] 撰寫 Django Models 設計文檔

### 2. 建立專案骨架
- [ ] **Django 後端：**
  - [ ] 初始化 Django 專案
  - [ ] 安裝 Django REST Framework
  - [ ] 配置 PostgreSQL
  - [ ] 配置 Celery + Redis
  - [ ] 設定 CORS（讓 Next.js 可以呼叫）
  - [ ] 設定環境變數（.env）
  - [ ] 建立基礎 apps（core, techpack, manufacturing, procurement）

- [ ] **Next.js 前端：**
  - [ ] 初始化 Next.js 14 專案
  - [ ] 安裝 shadcn/ui
  - [ ] 設定 Tailwind CSS
  - [ ] 設定 TypeScript
  - [ ] 建立基礎頁面結構
  - [ ] 設定 API 呼叫層（lib/api/）
  - [ ] 設定 Zustand Store

- [ ] **AI 服務：**
  - [ ] 初始化 FastAPI 專案
  - [ ] 整合 PaddleOCR
  - [ ] 整合 OpenAI API
  - [ ] 設定 Celery 背景任務

### 3. Docker 環境設定
- [ ] 撰寫 `docker-compose.yml`
- [ ] 配置 PostgreSQL container
- [ ] 配置 Redis container
- [ ] 配置 MinIO (S3-compatible storage)
- [ ] 一鍵啟動所有服務

---

## 🟡 中優先級（下週）

### 4. 核心 API 開發（Django REST Framework）
- [ ] **Tech Pack API：**
  - [ ] `POST /api/techpack/upload/` - 上傳 Tech Pack PDF
  - [ ] `POST /api/techpack/{id}/parse/` - 觸發 AI 解析
  - [ ] `GET /api/techpack/{id}/` - 獲取 Tech Pack 詳情
  - [ ] `POST /api/techpack/{id}/approve/` - 核准 Draft
  - [ ] `GET /api/techpack/` - 列表（分頁、過濾）

- [ ] **Manufacturing Sheet API：**
  - [ ] `POST /api/manufacturing/generate/` - 生成製造單
  - [ ] `GET /api/manufacturing/{id}/` - 獲取製造單
  - [ ] `POST /api/manufacturing/{id}/download/` - 下載 PDF

- [ ] **Procurement API：**
  - [ ] `POST /api/po/generate/` - 生成採購單
  - [ ] `GET /api/po/` - 採購單列表
  - [ ] `POST /api/po/{id}/send-email/` - 發送 Email

### 5. AI 解析服務（FastAPI）
- [ ] **Tech Pack Parser：**
  - [ ] PDF 文字提取
  - [ ] OCR 圖片識別
  - [ ] GPT-4 Vision 分析
  - [ ] 結構化資料輸出

- [ ] **BOM Extractor：**
  - [ ] 表格識別
  - [ ] 欄位映射
  - [ ] 智能補全

- [ ] **Measurement Parser：**
  - [ ] 尺寸表識別
  - [ ] 邏輯驗證（尺碼遞增）
  - [ ] 異常檢測

### 6. Draft Review Dashboard（前端核心頁面）
- [ ] **左側 PDF 檢視器：**
  - [ ] react-pdf 整合
  - [ ] 縮放功能
  - [ ] 頁面跳轉
  - [ ] 標註功能（未來）

- [ ] **右側編輯區：**
  - [ ] Tab 切換（Manufacturing / BOM / Measurement）
  - [ ] 可編輯表格
  - [ ] AI Issues 顯示
  - [ ] Approve / Save / Email 按鈕

- [ ] **左右聯動：**
  - [ ] 點擊 PDF 頁面 → 右側跳轉對應 Tab
  - [ ] 點擊 AI Issue → PDF 跳轉到問題位置

---

## 🟢 低優先級（Phase 2）

### 7. 用戶認證 + 權限系統
- [ ] Django JWT 認證
- [ ] 角色定義（Admin / Designer / Merchandiser / Factory）
- [ ] 權限守衛
- [ ] 前端登入/註冊頁面

### 8. Email 自動化
- [ ] Gmail / Outlook IMAP 整合
- [ ] Email Parser (AI)
- [ ] Email 模板系統
- [ ] 草稿生成
- [ ] 發送功能

### 9. Sample 管理（PLM 流程）
- [ ] Sample 狀態管理（Proto / Fit / PP）
- [ ] Fit Comment 記錄
- [ ] AI 摘要分析
- [ ] 差異分析

### 10. 採購管理
- [ ] Supplier 管理
- [ ] Material 庫存
- [ ] 用量計算（含損耗率）
- [ ] 供應商推薦
- [ ] PO 追蹤

---

## 📚 文檔待辦

### 11. 技術文檔
- [x] CLAUDE.md - Claude 專案記憶 ✅
- [x] README.md - 專案說明 ✅
- [ ] DJANGO-MODELS.md - Django Models 設計文檔（待建立）
- [ ] API-SPEC.md - API 規格文檔
- [ ] DATABASE-SCHEMA.md - 資料庫 ER 圖
- [ ] DEPLOYMENT.md - 部署文檔

### 12. AI 相關文檔
- [ ] AI-JSON-SCHEMA.md - AI 抽取的 JSON 格式定義
- [ ] MANUFACTURING-TEMPLATE.md - 製造單模板設計
- [ ] AI-PROMPT-ENGINEERING.md - Prompt 設計文檔

---

## 🔧 技術債務

### 13. 測試
- [ ] Django 單元測試（pytest）
- [ ] API 整合測試
- [ ] 前端組件測試（Vitest）
- [ ] E2E 測試（Playwright）

### 14. CI/CD
- [ ] GitHub Actions 設定
- [ ] 自動化測試流程
- [ ] Docker 自動構建
- [ ] 部署流程

### 15. 監控與日誌
- [ ] Sentry 錯誤追蹤
- [ ] Logging 系統
- [ ] 效能監控
- [ ] AI 成本追蹤

---

## 🎯 下一步行動（按優先級）

### 本週目標：
1. **[TODAY]** 完成 Django Models 設計文檔
2. **[明天]** 建立 Django 專案骨架
3. **[後天]** 建立 Next.js 專案骨架
4. **[本週末]** 實作 Tech Pack Upload API + 前端頁面

### 下週目標：
5. 整合 AI 解析服務（FastAPI）
6. 建立 Draft Review Dashboard
7. 測試完整流程：Upload → Parse → Review → Approve

---

## 📊 進度追蹤

### Phase 1: 核心骨架（目標 2 週）
```
[████░░░░░░░░░░░░░░░░] 20% 完成
```
- ✅ 文檔整理
- ✅ CLAUDE.md
- ✅ README.md
- 🔄 Django Models 設計（進行中）
- ⏳ 專案骨架建立（待辦）

### Phase 2: AI 解析核心（目標 3 週）
```
[░░░░░░░░░░░░░░░░░░░░] 0% 完成
```

### Phase 3: 製造單 + 採購單（目標 2 週）
```
[░░░░░░░░░░░░░░░░░░░░] 0% 完成
```

---

## 🎨 UI 設計檢查清單

- [ ] Draft Review Dashboard（核心頁面）
- [ ] Tech Pack Upload 頁面
- [ ] Tech Pack 列表頁面
- [ ] Manufacturing Sheet 預覽
- [ ] PO 管理頁面
- [ ] Supplier 管理頁面
- [ ] Dashboard 首頁

---

## ⚠️ 已知問題 & 風險

1. **OCR 準確率**
   - 風險：中文 / 特殊符號識別率可能不足
   - 緩解：多層驗證 + 人工審核

2. **AI 成本控制**
   - 風險：大量解析可能超出預算
   - 緩解：實作快取機制 + 批次處理

3. **PDF 格式多樣性**
   - 風險：不同客戶的 Tech Pack 格式差異大
   - 緩解：建立模板庫 + 學習機制

---

## 📝 備註

- 所有任務按優先級排序
- 每天更新進度
- 阻塞問題及時記錄在這裡

**最後更新：** 2024-12-13
**下次更新：** 完成 Django Models 設計後
