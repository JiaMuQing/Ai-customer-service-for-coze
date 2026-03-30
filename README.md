# AI 客服（网页咨询 + 扣子 Coze）


一套**轻量、可自托管**的网页智能客服：访客打开链接即可在 **`/chat`** 与 AI 对话（**无需注册登录**），管理员用固定账号登录后台查看会话记录。对话能力来自**字节扣子（Coze）** Bot；**知识库在扣子侧维护**——例如可将 **飞书（Feishu）文档** 接入为知识库数据源，并在扣子中**设置自动定时同步**，文档更新后问答内容会跟着刷新，无需在本项目里自建文档存储或爬虫。本仓库负责 **API 对接、会话持久化与简单管理界面**。

适合：希望快速上线「网站在线咨询」、又不想从零对接大模型与存储的团队或个人；尤其适合已在飞书维护帮助中心/产品说明、希望**一处写文档、客服自动跟着学**的场景。

---

## 能做什么

| 能力 | 说明 |
|------|------|
| **访客聊天** | 独立页面 `/chat`（根路径 `/` 会跳转过去），支持 **Markdown** 展示（标题、列表、链接、图片、代码块等）。 |
| **多轮对话** | 同一浏览器内按 **访客 UUID**（`localStorage`）区分用户，与扣子 `conversation_id` 对齐，刷新仍可继续上下文（见服务端存储）。 |
| **会话落库** | 消息写入 **MySQL**，便于审计与后台查询。 |
| **管理后台** | `/login` 登录后进入 **`/admin/session`**，按渠道筛选查看历史消息（网页渠道固定为 `web`）。 |
| **固定管理员** | 无复杂权限系统：管理员用户名/密码写在 **`backend/.env`**，适合小团队。 |
| **知识库（扣子侧）** | 在扣子中为 Bot 绑定知识库；支持以 **飞书文档** 等为数据源，并配置**定时自动更新**，把日常文档维护交给飞书 + 扣子，本项目不内置知识库编辑后台。 |

**当前版本不包含**：多租户、工单流转等；扩展可参考 `docs/plan.md`。

---

## 技术栈

- **后端**：Nest.js、TypeORM、MySQL  
- **前端**：Vue 3、Vite、Pinia、Element Plus、`marked` + DOMPurify（安全渲染 Markdown）  
- **AI**：扣子 Open API（PAT + Bot ID）；知识检索与数据源（含飞书文档同步、定时刷新）在扣子控制台配置

---

## 最少要配什么（5 分钟理清）

你只需要准备：

1. **MySQL 8**：新建一个空库（utf8mb4）。  
2. **扣子**：一个已发布/可对话的 Bot，以及开放平台的 **PAT**、**Bot ID**。  
3. **本项目的两个 `.env` 文件**（从 example 复制后改几项）。

### 后端 `backend/.env`（必填项）

从 `backend/.env.example` 复制为 `backend/.env`，至少填写：

| 变量 | 作用 |
|------|------|
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | 后台登录账号（自定义即可） |
| `JWT_SECRET` | JWT 密钥，随机长字符串 |
| `DB_HOST` `DB_PORT` `DB_DATABASE` `DB_USERNAME` `DB_PASSWORD` | MySQL 连接信息 |
| `COZE_PAT` | 扣子个人访问令牌 |
| `COZE_BOT_ID` | 扣子 Bot ID |

部署到公网时建议再设 **`BASE_URL=https://你的域名`**，便于生成正确外链等场景。

### 前端 `frontend/.env`

从 `frontend/.env.example` 复制为 `frontend/.env`：

| 环境 | `VITE_API_BASE_URL` |
|------|---------------------|
| 本地开发 | `/api`（Vite 会代理到本机 `3000` 端口） |
| 生产（与文档中 Nginx 示例一致） | `/api`（由网关把 `/api` 反代到后端并去掉前缀） |

更细的变量说明见 **[docs/ENV.md](docs/ENV.md)**。

---

## 网页安装向导（可选）

若 **`backend/.env` 不存在或缺少任一必填项**，后端会以**仅安装模式**启动（不加载 TypeORM / 聊天等业务模块）。此时：

1. 启动前端后访问站点，路由会自动进入 **`/install`**。  
2. 在页面填写**管理员账号、JWT、MySQL、扣子 PAT/Bot ID** 等；保存前会**检测数据库连接**，再写入 `backend/.env`。  
3. **必须重启一次后端**（如 `Ctrl+C` 后再 `npm run start:dev` 或 `pm2 restart`），才会进入完整模式。  

向导仅在「当前进程为安装模式」时接受 `POST /install/apply`；配置完成后请依赖手改 `.env` 或重新部署。仍可直接复制 `backend/.env.example` 手动编辑，跳过向导。

---

## 本地运行（最短路径）

**环境**：Node.js 18+（建议 20+）、MySQL 8。

1. **建库**（库名与 `.env` 里 `DB_DATABASE` 一致）：

```sql
CREATE DATABASE ai_customer_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. **后端**

```bash
cd backend
npm install
# 方式 A：cp .env.example .env 后手填
# 方式 B：暂不建 .env，启动后走前端 /install 向导写入
npm run start:dev
```

3. **前端**（新终端）

```bash
cd frontend
cp .env.example .env   # 开发保持 VITE_API_BASE_URL=/api 即可
npm install
npm run dev
```

4. **访问**

- 访客聊天：<http://localhost:5173/chat> 或 <http://localhost:5173/>  
- 管理后台：<http://localhost:5173/login> → 会话记录 `/admin/session`  
- 后端健康：<http://localhost:3000>（若未挡）

表结构由 TypeORM **`synchronize`** 自动创建，无需手写建表；字段说明见 **[docs/database.md](docs/database.md)**。

分步说明与排错可参考 **[docs/local-setup.md](docs/local-setup.md)**。

---

## 生产构建

```bash
cd backend && npm install && npm run build && node dist/main.js   # 或用 PM2
cd frontend && npm install && npm run build   # 静态资源在 frontend/dist
```

服务器上的 Nginx、PM2、目录约定等见 **[docs/deploy.md](docs/deploy.md)**。

---

## 项目结构

```
backend/          Nest 应用：auth、chat、session、coze 对接
frontend/         Vue 应用：/chat、/login、/admin
docs/             环境变量、数据库、本地与部署说明、计划
```

---

## API 摘要（对接前端或调试）

- **访客**（需请求头 `X-Web-Visitor-Id: <UUID v4>`，前端已自动附加）  
  - `POST /chat/message` body: `{ "content": "..." }`  
  - `GET /chat/history?limit=50`  
- **管理**（需 `Authorization: Bearer <JWT>`）  
  - `GET /session/messages?channelId=web&limit=100`  

---

## 文档索引

| 文档 | 内容 |
|------|------|
| [docs/ENV.md](docs/ENV.md) | 环境变量逐项说明 |
| [docs/local-setup.md](docs/local-setup.md) | 本地运行分步指南 |
| [docs/database.md](docs/database.md) | 表结构与字段含义 |
| [docs/deploy.md](docs/deploy.md) | 服务器部署与 Nginx |
| [docs/plan.md](docs/plan.md) | 架构与后续规划 |

---

## 许可与声明

- **开源许可**：本项目以 **[MIT License](LICENSE)** 发布，可自由使用、修改、再发布与商用；保留 `LICENSE` 中的版权声明即可。
- **第三方服务**：使用**扣子（Coze）**、**飞书**等需遵守各平台与用户所在地法规；本项目不提供扣子账号与算力，仅提供对接与自托管示例代码。
