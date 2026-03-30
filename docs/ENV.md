# 环境变量说明

**产品做什么、最少要配哪些变量**：先看仓库根目录 **[README.md](../README.md)**。本文按文件列出每一项，便于复制对照。

---

## 后端 `backend/.env`

复制 `backend/.env.example` 为 `backend/.env` 后填写。

| 变量 | 必填 | 说明 | 获取 / 建议 |
|------|------|------|-------------|
| **ADMIN_USERNAME** | 是 | 管理后台登录用户名 | 自定义 |
| **ADMIN_PASSWORD** | 是 | 管理后台登录密码 | 自定义 |
| **JWT_SECRET** | 是 | JWT 签发密钥 | 32 位以上随机字符串 |
| **DB_HOST** | 是 | MySQL 主机 | 本地常用 `localhost` |
| **DB_PORT** | 是 | MySQL 端口 | 默认 `3306` |
| **DB_DATABASE** | 是 | 数据库名（须先建空库） | 如 `ai_customer_service` |
| **DB_USERNAME** | 是 | 数据库用户 | 如 `root` |
| **DB_PASSWORD** | 是 | 数据库密码 | — |
| **COZE_PAT** | 是 | 扣子个人访问令牌 | 扣子开放平台 → 开发者设置；权限需含对话等 |
| **COZE_BOT_ID** | 是 | 扣子 Bot ID | Bot 页面 URL 或发布信息中查看 |
| **PORT** | 否 | HTTP 端口 | 默认 `3000` |
| **BASE_URL** | 建议（生产） | 公网访问根 URL | 如 `https://your-domain.com` |
| **COZE_API_BASE** | 否 | 扣子 API 根地址 | 默认 `https://api.coze.cn` |
| **COZE_DEBUG** | 否 | 设为 `1` 时打印扣子请求/响应 JSON | **仅本地排错**，勿用于生产 |
| **COZE_POLL_INTERVAL_MS** | 否 | 非流式轮询间隔（毫秒） | 默认 `500` |
| **COZE_POLL_TIMEOUT_MS** | 否 | 轮询最长等待（毫秒） | 默认 `120000` |

---

## 前端 `frontend/.env`

复制 `frontend/.env.example` 为 `frontend/.env`。

| 变量 | 必填 | 说明 | 填写建议 |
|------|------|------|----------|
| **VITE_API_BASE_URL** | 是 | 浏览器请求的 API 根路径 | 开发：`/api`（见 `vite.config` 代理）；与 Nginx 同域部署时常用 `/api` |

---

## 安全提示

- `.env` 勿提交到 Git；生产环境用密钥管理或服务器侧文件权限控制。  
- `JWT_SECRET`、`COZE_PAT`、数据库密码属于敏感信息。
