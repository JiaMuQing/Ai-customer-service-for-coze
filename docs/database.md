# 数据库结构说明

整体功能与数据在业务中的角色见 [README.md](../README.md)。本文只描述表与字段。

数据库结构由 **TypeORM 实体** 定义，后端启动时若配置了 `synchronize: true`，会自动建表/同步，**无需手写建表 SQL**。

---

## 实体文件位置（即“数据库结构”所在）

| 表名 | 实体文件路径 |
|------|--------------|
| `conversation_message` | `backend/src/session/entities/conversation-message.entity.ts` |

网页聊天在业务上：`channelId = 'web'`，`visitorId` 存 **访客 UUID**（与请求头 `X-Web-Visitor-Id` 一致）。  
API 与 JSON 使用 `channelId` / `visitorId`；MySQL 里对应物理列名仍为 `wecomChatId` / `wecomUserId`（TypeORM `@Column({ name: '...' })` 映射），与旧库兼容，无需因改名而迁移数据。

---

## 表结构（等价 SQL，供参考或手动建库）

你只需要在 MySQL 里**先建一个空库**（如 `ai_customer_service`），表由后端自动创建。若需手动建表，可执行下面 SQL：

```sql
USE ai_customer_service;

CREATE TABLE IF NOT EXISTS `conversation_message` (
  `id` int NOT NULL AUTO_INCREMENT,
  `wecomChatId` varchar(128) NOT NULL,
  `wecomUserId` varchar(128) NOT NULL,
  `cozeConversationId` varchar(128) DEFAULT NULL,
  `role` varchar(32) NOT NULL,
  `content` text NOT NULL,
  `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `IDX_wecomChatId_wecomUserId` (`wecomChatId`, `wecomUserId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 字段说明

**conversation_message（会话消息记录）**

- **`channelId`（列 `wecomChatId`）**：渠道标识，网页固定为 `web`  
- **`visitorId`（列 `wecomUserId`）**：访客标识（UUID v4，由前端生成并持久化在浏览器）  
- `cozeConversationId`：扣子会话 ID（多轮上下文）  
- `role`：`user` / `assistant`  
- `content`：消息内容  
