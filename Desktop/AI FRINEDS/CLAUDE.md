# CLAUDE.md - AI FRINEDS 專案

## 專案概述

**代理交友** - AI 代理社交平台
讓 AI 分身幫你找到靈魂伴侶

### 核心概念
```
用戶創建 AI 分身 → AI 自動社交 → 用戶與感興趣者的 AI 聊天 → 配對成功認識真人
```

## 專案位置
`C:/Users/AMBER/Desktop/AI FRINEDS/agent-dating`

## 技術棧

**後端 (Django):**
- Django 5.0 + Django REST Framework
- Django Channels (WebSocket)
- PostgreSQL + pgvector
- Redis + Celery
- LangChain + **Groq** (llama-3.3-70b，免費快速)

**前端 (Vue 3):**
- Vue 3 + TypeScript
- Tailwind CSS
- Pinia 狀態管理
- Vue Router

## 啟動方式

```bash
# Docker 一鍵啟動
cd agent-dating
docker-compose up

# 或手動啟動
# 後端
cd agent-dating/backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver  # http://localhost:8000

# 前端
cd agent-dating/frontend
npm install
npm run dev  # http://localhost:3000

# Celery 背景任務
celery -A config worker -l info
```

## 專案結構

```
agent-dating/
├── backend/
│   ├── config/              # Django 設定
│   ├── apps/
│   │   ├── users/           # 用戶 + 靈魂檔案
│   │   ├── agents/          # AI 分身系統
│   │   ├── matching/        # 靈魂配對
│   │   ├── relationships/   # 關係系統
│   │   ├── chat/            # 聊天 + WebSocket
│   │   └── world/           # 虛擬世界
│   └── ai/                  # LangChain AI 服務
│
└── frontend/
    └── src/
        ├── views/           # 頁面組件
        ├── stores/          # Pinia stores
        └── services/        # API 服務
```

## API 端點

```
# 認證
POST /api/auth/register/          # 註冊
POST /api/auth/token/             # 登入

# 用戶
GET  /api/user/profile/           # 個人資料
GET  /api/user/soul-profile/      # 靈魂檔案
POST /api/auth/questionnaire/     # 提交問卷

# 配對
GET  /api/match/recommendations/  # 配對推薦
GET  /api/match/score/:userId/    # 配對分數

# 聊天
GET  /api/chat/conversations/     # 對話列表
POST /api/chat/start/:agentId/    # 開始 AI 對話

# WebSocket
ws://localhost:8000/ws/chat/:id/  # 即時聊天
```

## 已完成功能 (2026-01-24)

- ✅ Django 後端架構 (6 個 apps)
- ✅ 用戶與靈魂檔案系統
- ✅ AI 分身系統 (SoulAgent, SocialAgent)
- ✅ 靈魂配對算法 (七維度加權)
- ✅ 15 題問卷系統
- ✅ 聊天系統 + WebSocket
- ✅ 關係進展系統 (7 階段)
- ✅ Vue 3 聊天介面
- ✅ LangChain AI 服務層
- ✅ **多語言支援** (zh-hant, en, es, ja, ko, fr)
- ✅ **Groq AI 整合** (免費快速 LLM)

## 多語言功能 (2026-01-24 新增)

AI 分身會根據對話對象的語言自動回應：
```
Maria (西班牙人, lang=es) 和 小明的AI分身 聊天
→ AI 用西班牙文回覆，但保持小明的台灣人性格
```

**支援語言：**
| 代碼 | 語言 |
|------|------|
| zh-hant | 繁體中文（預設）|
| zh-hans | 簡體中文 |
| en | English |
| ja | 日本語 |
| ko | 한국어 |
| es | Español |
| fr | Français |

**設定方式：**
```bash
PUT /api/user/profile/
{"preferred_language": "es"}
```

## 待開發功能

- [ ] Habbo 風格虛擬世界整合
- [ ] Agent A* 尋路系統
- [ ] Agent 自主社交模擬
- [ ] 對話氣泡系統

## 開發環境帳號

**Django Admin**
- URL: http://127.0.0.1:8000/admin/
- Email: amberh2616@gmail.com
- Username: admin
- Password: 1234

## 環境變數

```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True

# Database
DB_NAME=agent_dating
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379/0

# Groq (免費 LLM)
GROQ_API_KEY=gsk-your-key
GROQ_MODEL=llama-3.3-70b-versatile
```

## 本地啟動 (無 Docker)

```bash
# 1. 啟動 Redis
C:/Users/AMBER/Desktop/redis-win/redis-server.exe &

# 2. 啟動 Django
cd agent-dating/backend
python manage.py runserver

# 3. 啟動 Celery (AI 回覆需要)
celery -A config worker -l info
```

## 詳細文檔
參見 `agent-dating/README.md`
