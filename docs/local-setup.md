# 本机运行指南

**快速了解项目与最短启动命令**：见仓库根目录 [README.md](../README.md)。本文是分步说明，与 README 一致时可任选其一跟随。

若尚未准备 `backend/.env`，可先 `npm run start:dev` 启动后端（安装模式），再启动前端，浏览器会引导至 **`/install`** 在线填写并生成 `.env`，然后**重启后端**。详见 README「网页安装向导」。

按下面步骤在本机跑起后端 + 前端。

---

## 1. 环境准备

- **Node.js** 18+（建议 20+）
- **MySQL 8**：安装并启动，创建一个空库
### 创建数据库

在 MySQL 里执行（库名可改，需与 `.env` 里 `DB_DATABASE` 一致）：

```sql
CREATE DATABASE ai_customer_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**表不用自己建**：后端用 TypeORM `synchronize: true`，启动时会按实体自动建表。表结构说明见 [database.md](./database.md)。

---

## 2. 后端

```bash
cd backend
```

1. 复制环境变量并填写（**需要你填的**见 [ENV.md](./ENV.md)）：

```bash
cp .env.example .env
```

编辑 `backend/.env`，至少填：

- `ADMIN_USERNAME` / `ADMIN_PASSWORD`：管理后台登录账号（自定义）
- `JWT_SECRET`：任意 32 位以上字符串
- `DB_HOST`、`DB_PORT`、`DB_DATABASE`、`DB_USERNAME`、`DB_PASSWORD`：你的 MySQL 信息
- `COZE_PAT`、`COZE_BOT_ID`：扣子开放平台 PAT 和 Bot ID（要调 AI 对话必填）

2. 安装依赖并启动：

```bash
npm install
npm run start:dev
```

看到 `Backend running at http://localhost:3000` 即成功。  
首次启动会自动创建表（如 `conversation_message`）。

---

## 3. 前端

新开一个终端：

```bash
cd frontend
```

1. 复制环境变量（本机开发一般不用改）：

```bash
cp .env.example .env
```

`.env` 里 `VITE_API_BASE_URL=/api` 即可，Vite 会把 `/api` 代理到 `http://localhost:3000`。

2. 安装并启动：

```bash
npm install
npm run dev
```

- 访客聊天：打开 **http://localhost:5173/** 或 **http://localhost:5173/chat**（免登录）。  
- 后台：打开 **http://localhost:5173/login**，用 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 登录后进入会话查询。

---

## 4. 小结

| 步骤 | 说明 |
|------|------|
| 建库 | MySQL 里执行 `CREATE DATABASE ai_customer_service ...`，表由后端自动建 |
| 数据库结构 | 在 `backend/src/.../entities/` 的 TypeORM 实体里；等价 SQL 见 [database.md](./database.md) |
| 后端 | `backend/.env` 填好 → `npm install` → `npm run start:dev` |
| 前端 | `frontend/.env` 保持 `/api` → `npm install` → `npm run dev` → `/chat` 访客页；`/login` 进后台 |
