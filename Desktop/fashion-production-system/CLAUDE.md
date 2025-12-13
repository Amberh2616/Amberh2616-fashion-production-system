# Fashion Production System - Claude 專案記憶

**最後更新：** 2024-12-13
**專案狀態：** 架構設計階段

---

## 🎯 專案核心定位

### 這是什麼？

**AI-augmented PLM + ERP Lite 系統**

一個專為**一個人管理 300 款外銷跟單**設計的智能生產管理系統。

### 核心價值主張

```
傳統方式：1 人 → 最多管 50 款 → 累到爆
AI 系統：  1 人 → 可管 300 款 → 70-80% 自動化
```

### 關鍵設計理念

⚠️ **重要：AI 的角色定位**
- ✅ AI 只做：結構化 + 草稿 + 風險提示
- ❌ AI 不做：直接決策 + 直接下單
- ✅ 人的角色：最後審核 + Approve + Send

---

## 🏗️ 技術架構

### 技術棧選擇

```
前端：Next.js 14 (TypeScript + App Router)
後端：Django 4.2 + Django REST Framework
AI 服務：FastAPI + Celery (獨立服務)
資料庫：PostgreSQL 15 + pgVector
快取：Redis
檔案：AWS S3 / MinIO
```

### 架構圖

```
┌─────────────────────────────────────────────┐
│        Next.js Frontend (Port 3000)          │
│  - Draft Review Dashboard (核心頁面)         │
│  - Tech Pack Upload UI                       │
│  - Manufacturing Sheet Preview               │
│  - PO Management                             │
└─────────────────┬───────────────────────────┘
                  │ REST API (JSON)
┌─────────────────┴───────────────────────────┐
│        Django Backend (Port 8000)            │
│  ├─ apps/core/          (User, Org, Auth)   │
│  ├─ apps/techpack/      (TechPack, Style)   │
│  ├─ apps/manufacturing/ (Sheet, BOM)        │
│  ├─ apps/procurement/   (PO, Supplier)      │
│  └─ apps/sampling/      (Sample, Fit)       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────┴───────────────────────────┐
│      AI Service (FastAPI + Celery)          │
│  ├─ parsers/techpack_parser.py              │
│  ├─ parsers/bom_extractor.py                │
│  ├─ parsers/measurement_parser.py           │
│  └─ tasks/background_jobs.py                │
└─────────────────────────────────────────────┘
```

---

## 📊 業務流程（6 大區塊）

### 1️⃣ Intake（接單 / 收資料）
- Email 自動讀取
- Tech Pack PDF 上傳
- BOM / Spec 上傳
- 客戶 Comment 記錄
**自動化程度：100%**

### 2️⃣ Interpretation（AI 解析資料）
- 讀 BOM（物料、規格、用量）
- 讀 Measurement（尺寸表）
- 讀 Construction（工序說明）
- 讀 Trim / Label / Packaging
**自動化程度：80% AI + 20% 人工確認**

### 3️⃣ Manufacturing Instruction（製造單生成）
- 工序邏輯整理
- 用料對應
- 尺寸關聯
- QC 風險點標註
**AI 生成草稿 → 人工 Approve**

### 4️⃣ Sourcing / Purchasing（採購）
- 主料 / 副料 / 標籤 / 包裝
- 自動計算用量（含損耗率）
- 供應商推薦
- PO 草稿生成
**AI 生成 PO Draft → 人工審核後送出**

### 5️⃣ Sampling / Fit / PP（PLM 節點）
- Proto / 1st Fit / 2nd Fit / PP
- Fit Comment AI 摘要
- 差異分析
**流程自動化 + 判斷需要人**

### 6️⃣ Bulk / Production（大貨管理）
- 下單 / Lead Time 追蹤
- 測試 / 出貨
**追蹤 100% 自動化**

---

## 📁 專案結構

```
fashion-production-system/
├── frontend/                    # Next.js 前端
│   ├── app/                     # App Router 頁面
│   │   ├── (auth)/             # 登入註冊
│   │   ├── dashboard/          # 主控台
│   │   ├── techpack/           # Tech Pack 管理
│   │   ├── manufacturing/      # 製造單
│   │   ├── procurement/        # 採購管理
│   │   └── api/                # API Routes (如有需要)
│   ├── components/             # React 組件
│   │   ├── ui/                 # shadcn/ui 組件
│   │   ├── techpack/           # Tech Pack 相關組件
│   │   ├── manufacturing/      # 製造單組件
│   │   └── shared/             # 共用組件
│   ├── lib/                    # 工具函數
│   │   ├── api/                # API 呼叫函數
│   │   ├── hooks/              # Custom Hooks
│   │   └── utils/              # 工具函數
│   └── store/                  # Zustand 狀態管理
│
├── backend/                     # Django 後端
│   ├── manage.py
│   ├── config/                 # Django 設定
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── core/               # 核心功能
│   │   │   ├── models.py       # User, Organization, Permission
│   │   │   ├── serializers.py
│   │   │   └── views.py
│   │   ├── techpack/           # Tech Pack 管理
│   │   │   ├── models.py       # TechPack, Style, BOM
│   │   │   ├── serializers.py
│   │   │   ├── views.py
│   │   │   └── tasks.py        # Celery 任務
│   │   ├── manufacturing/      # 製造單管理
│   │   │   ├── models.py       # ManufacturingSheet, Construction
│   │   │   └── ...
│   │   ├── procurement/        # 採購管理
│   │   │   ├── models.py       # PO, Supplier, Material
│   │   │   └── ...
│   │   └── sampling/           # Sample 管理
│   │       ├── models.py       # Sample, FitComment
│   │       └── ...
│   └── requirements/
│       ├── base.txt
│       ├── development.txt
│       └── production.txt
│
├── ai_service/                  # AI 服務（FastAPI）
│   ├── main.py                 # FastAPI 入口
│   ├── parsers/
│   │   ├── techpack_parser.py  # Tech Pack 解析
│   │   ├── bom_extractor.py    # BOM 提取
│   │   └── measurement_parser.py # 尺寸表解析
│   ├── services/
│   │   ├── ocr_service.py      # OCR 服務
│   │   └── llm_service.py      # LLM 服務
│   └── tasks/
│       └── celery_tasks.py     # Celery 背景任務
│
├── docs/                        # 文檔
│   ├── AI-AGENT-DESIGN.md      # AI Agent 設計
│   ├── SYSTEM-UI-DESIGN.md     # UI 設計
│   └── TODO.md                 # 待辦清單
│
├── docker-compose.yml          # Docker 設定
├── README.md                   # 專案說明
└── CLAUDE.md                   # 本檔案
```

---

## 🎨 核心 UI 設計

### Draft Review Dashboard（最重要的頁面）

```
┌──────────────────────────────────────────────────────────┐
│  Top Bar: LW1FLPS - Nulu Cami Tank | Status: Draft       │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  [左側 40%]              │  [右側 60%]                    │
│  原始 Tech Pack PDF       │  AI 解析結果 + 編輯區          │
│  (可滾動、可放大)         │                                │
│                          │  📋 Tabs:                       │
│  點擊 BOM 第3頁 →        │  ┌─────────────────────────┐  │
│  右側自動跳到 BOM Tab    │  │ Manufacturing Sheet     │  │
│                          │  │ BOM Table               │  │
│                          │  │ Measurement             │  │
│                          │  │ Construction Notes      │  │
│                          │  └─────────────────────────┘  │
│                          │                                │
│                          │  ⚠️ AI Flagged Issues:        │
│                          │  ┌─────────────────────────┐  │
│                          │  │ ⚠️ Missing: Fabric code │  │
│                          │  │ ⚠️ Conflict: Usage = 0  │  │
│                          │  │ ℹ️  Low confidence: 65% │  │
│                          │  └─────────────────────────┘  │
│                          │                                │
│                          │  [✅ Approve] [📧 Email] [💾] │
└──────────────────────────┴────────────────────────────────┘
```

**設計理念：**
- 左右分屏，方便對照原始檔案
- PDF 可點擊，右側聯動跳轉
- Tab 設計，減少滾動
- AI Issues 固定顯示，清楚標示風險

---

## 🤖 AI 功能定位

### AI 做什麼（Extraction，不是 Generation）

#### ✅ A. 對欄位
從 PDF 中提取結構化資料：
- Material / Supplier / Usage / Placement / Lead time
- Measurement / Size / Tolerance
- Construction Steps / Stitch Type

#### ✅ B. 建關聯
自動識別關係：
- Self fabric ↔ neckline / armhole / strap
- Elastic ↔ bra / hem
- Measurement ↔ pattern / QC

#### ✅ C. 標風險
自動檢測異常：
- Missing field（缺少欄位）
- Conflict（用量 = 0、尺寸不合理）
- Low confidence（信心度 < 70%）

#### ✅ D. 歷史學習（重要！）
每次人工修正都記錄：
```python
class AILearningLog(models.Model):
    tech_pack = ForeignKey(TechPack)
    ai_extracted = JSONField()      # AI 原始結果
    human_corrected = JSONField()   # 人工修正後
    correction_type = CharField()   # 修正類型
    created_at = DateTimeField()
```
**效果：3 個月後準確率從 80% → 95%**

---

## 📋 開發路線圖

### Phase 1: 核心骨架（2 週）
```
Week 1-2:
✅ 建立 Django + Next.js 專案結構
✅ 設計資料庫 Schema（PostgreSQL）
✅ 建立基礎 API（CRUD）
✅ 建立 Tech Pack 上傳頁面
✅ Docker 環境設定
```

### Phase 2: AI 解析核心（3 週）
```
Week 3-5:
✅ 整合 OCR（PaddleOCR / Tesseract）
✅ 整合 GPT-4 Vision / Claude API
✅ 實作 BOM Extractor
✅ 實作 Measurement Parser
✅ 建立 Draft Review Dashboard
✅ Celery 背景任務設定
```

### Phase 3: 製造單 + 採購單（2 週）
```
Week 6-7:
✅ 製造單模板設計
✅ 自動生成製造單 PDF
✅ 採購單自動生成
✅ Email 模板系統
```

### Phase 4: PLM 流程（2 週）
```
Week 8-9:
✅ Sample 流程管理（Proto / Fit / PP）
✅ Fit Comment AI 摘要
✅ 差異分析
```

### Phase 5: 優化 + 學習（持續）
```
Week 10+:
✅ AI 學習機制
✅ 歷史數據分析
✅ 準確率優化
✅ 使用者回饋整合
```

---

## 🔑 關鍵技術決策

### 為什麼選 Django？

✅ **優點：**
- 超適合資料密集型 ERP / PLM
- ORM 很強（BOM / PO / Style 複雜關聯）
- 內建 Admin Panel（快速測試）
- 權限、版本控管現成
- Celery 整合完美（背景 AI 任務）

❌ **不適合：**
- 不適合重前端互動（但我們用 Next.js）
- 不適合即時 3D（我們不需要）

### 為什麼選 Next.js？

✅ **優點：**
- SSR 適合 Dashboard
- TypeScript 型別安全
- App Router 檔案路由清晰
- 與 Django REST API 整合容易

### 為什麼 AI 服務獨立？

✅ **原因：**
- Django 不適合跑 ML 模型
- FastAPI 非同步效能更好
- Celery 可以分散運算
- 方便未來擴展 GPU 服務

---

## 📊 成本估算

### AI 成本（月）

```
Tech Pack 解析: 20 個 × $1.2   = $24
BOM 表抓取:     30 個 × $0.3   = $9
Email 分析:     500 封 × $0.05 = $25
文件生成:       100 份 × $0.2  = $20
風險分析:       每日掃描       = $45
採購建議:       150 次 × $0.15 = $23

總計: ~$146/月
保守預算: $200/月
```

### ROI 分析

```
💰 人力節省: $2500/月（70% 工作時間自動化）
💸 AI 成本:   $200/月
✅ 淨節省:   $2300/月
📈 ROI:      1150% 🚀
```

---

## 📝 重要提醒

### ⚠️ 開發時必須記住的原則

1. **AI 永遠只是草稿**
   - 所有 AI 產生的內容都要經過人工審核
   - 永遠顯示信心度分數
   - 低於 70% 的結果要特別標註

2. **資料庫設計要考慮多租戶（未來擴展）**
   - 雖然現在一個人用，但架構要支援多組織
   - 所有表都要有 `organization_id`
   - Row-Level Security (RLS) 要設計好

3. **版本控制很重要**
   - Tech Pack 會有多個版本（Rev A / Rev B）
   - BOM 會有多個版本
   - 要記錄所有修改歷史

4. **不要過度工程**
   - MVP 先做核心流程
   - 不要一開始就做 3D / AR / 區塊鏈
   - 先跑通 Tech Pack → Manufacturing Sheet 流程

---

## 🎯 當前任務

### 下一步（按優先級）

1. **[進行中] 建立 Django Models 設計文檔**
   - TechPack, Style, BOM, Manufacturing, PO 等
   - 多租戶 + 多用戶設計
   - AI 學習機制

2. **[待辦] 建立 Next.js 專案骨架**
   - 基礎頁面結構
   - API 層設計
   - 狀態管理

3. **[待辦] 建立 Django 專案骨架**
   - 設定 DRF
   - 設定 Celery + Redis
   - 設定 PostgreSQL

4. **[待辦] 實作 Tech Pack Parser POC**
   - 用真實的 lululemon Tech Pack 測試
   - 驗證 OCR + GPT-4 Vision 準確度

---

## 📚 參考資料

### 核心文檔位置
- **AI Agent 設計**: `docs/AI-AGENT-DESIGN.md`
- **UI 設計**: `docs/SYSTEM-UI-DESIGN.md`
- **待辦清單**: `docs/TODO.md`
- **API 文檔**: (待建立)
- **資料庫 Schema**: (待建立)

### 外部資源
- Django REST Framework: https://www.django-rest-framework.org/
- Next.js 14 Docs: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com/
- PaddleOCR: https://github.com/PaddlePaddle/PaddleOCR

---

**最後更新：** 2024-12-13
**下次更新時機：** 完成 Django Models 設計後
