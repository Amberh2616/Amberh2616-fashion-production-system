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
- SQLite (開發) / PostgreSQL (生產)
- Redis + Celery
- LangChain + **Groq** (llama-3.3-70b，免費快速)

**前端 (Habbo 風格虛擬世界):**
- Phaser 3 遊戲引擎
- Habbo Avatar API (像素人物)
- 原生 JavaScript + CSS3
- JWT 認證整合

## 啟動方式

```bash
# 1. 啟動後端 (Terminal 1)
cd agent-dating/backend
python manage.py runserver  # http://localhost:8000

# 2. 啟動 Celery (Terminal 2) - AI 回覆需要
cd agent-dating/backend
celery -A config worker -l info

# 3. 啟動前端 (Terminal 3)
cd agent-dating/frontend
npx serve -p 3000  # http://localhost:3000
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
    ├── index.html           # Habbo 風格主介面 (Phaser 3)
    └── package.json
```

## API 端點

```
# 認證
POST /api/auth/token/             # 登入 (JWT)
POST /api/auth/token/refresh/     # 刷新 Token

# 用戶
GET  /api/user/profile/           # 個人資料
GET  /api/user/soul-profile/      # 靈魂檔案

# AI 分身
GET  /api/agent/me/               # 我的 AI 分身
GET  /api/agent/:id/              # 查看指定 AI

# 配對
GET  /api/match/recommendations/  # 配對推薦 (含 AI 分身資料)

# 聊天
POST /api/chat/start/:agentId/              # 開始 AI 對話
GET  /api/chat/conversations/:id/           # 取得訊息
POST /api/chat/conversations/:id/send/      # 發送訊息 (觸發 AI 回覆)
```

## 已完成功能 (2026-01-24)

### 後端
- ✅ Django 後端架構 (6 個 apps)
- ✅ 用戶與靈魂檔案系統
- ✅ AI 分身系統 (SoulAgent, SocialAgent)
- ✅ 靈魂配對算法 (七維度加權)
- ✅ 聊天系統 + WebSocket
- ✅ 關係進展系統 (7 階段)
- ✅ LangChain + Groq AI 服務層
- ✅ 多語言支援 (zh-hant, en, es, ja, ko, fr)

### 前端 (Habbo 整合)
- ✅ Phaser 3 遊戲引擎
- ✅ 等距房間渲染 (牆壁、地板、家具)
- ✅ Habbo Avatar API 整合
- ✅ JWT 登入系統
- ✅ 從後端載入 AI 分身列表
- ✅ 顯示自己 + 配對推薦的 AI
- ✅ 點擊角色開始聊天
- ✅ 聊天框 UI
- 🚧 發送訊息 → AI 回覆 (調試中)

## 測試帳號

| 帳號 | Email | 密碼 | AI 分身 |
|------|-------|------|---------|
| Admin (Amber) | amberh2616@gmail.com | 1234 | Amber |
| Maria | maria@test.com | 1234 | Mike |

## 測試流程

1. 打開 http://localhost:3000
2. 用 Admin 帳號登入
3. 進入 Habbo 風格房間
4. 看到 **Amber (You)** 和 **Mike** (85% 配對)
5. 點擊 **Mike** 開始聊天
6. 在聊天框輸入訊息，等待 AI 回覆

## 待開發功能

- [ ] 聊天發送訊息完整測試
- [ ] AI 回覆顯示在聊天框
- [ ] 遊戲內對話氣泡
- [ ] Agent A* 尋路系統
- [ ] Agent 自主社交模擬
- [ ] 多房間切換

## 環境變數 (.env)

```env
# Django
SECRET_KEY=your-secret-key
DEBUG=True
USE_SQLITE=True

# Groq (免費 LLM)
GROQ_API_KEY=gsk_xxx
GROQ_MODEL=llama-3.3-70b-versatile

# Redis (Celery)
CELERY_BROKER_URL=redis://localhost:6379/1
```

## 相關文件

- BE76 原始 Habbo 房間: `BE76_Website/habbo-fixed.html`
- 後端 README: `agent-dating/README.md`
