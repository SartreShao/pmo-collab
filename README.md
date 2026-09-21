# PMO Collab

人机协同项目管理系统（开源）。

## 功能

- ✅ 极简中文落地页
- ✅ GitHub OAuth 登录（scopes: `read:user`, `repo`）
- ✅ 加密 Session（HTTP-only cookie）
- ✅ 仓库管理：列出 GitHub 仓库，选择接入到系统
- ✅ 基于 Cloudflare Workers + D1 数据库
- ✅ TypeScript + Hono 框架
- ✅ 极简暗色 UI

## 技术栈

- **运行时**: Cloudflare Workers
- **框架**: Hono
- **数据库**: Cloudflare D1 (SQLite)
- **语言**: TypeScript
- **OAuth**: GitHub OAuth 2.0

## 快速开始

### 1. 创建 GitHub OAuth App

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击「New OAuth App」
3. 填写信息：
   - **Application name**: PMO Collab（或任意名称）
   - **Homepage URL**: `https://your-domain.workers.dev`（部署后的域名）
   - **Authorization callback URL**: `https://your-domain.workers.dev/auth/callback`
4. 创建后保存 **Client ID** 和 **Client Secret**

### 2. 安装依赖

```bash
npm install
```

### 3. 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create pmo-collab-db

# 记录输出的 database_id，填入 wrangler.toml 的 database_id 字段
```

### 4. 初始化数据库表结构

```bash
# 本地开发数据库
wrangler d1 execute pmo-collab-db --local --file=./schema.sql

# 生产数据库
wrangler d1 execute pmo-collab-db --remote --file=./schema.sql
```

### 5. 配置环境变量

使用 `wrangler secret put` 命令设置密钥（**不要**把密钥写入代码或 git）：

```bash
# GitHub OAuth Client ID
wrangler secret put GITHUB_CLIENT_ID
# 输入你的 GitHub Client ID

# GitHub OAuth Client Secret
wrangler secret put GITHUB_CLIENT_SECRET
# 输入你的 GitHub Client Secret

# Session 加密密钥（随机生成，至少 32 字符）
wrangler secret put SESSION_SECRET
# 输入一个随机字符串，例如：openssl rand -base64 32

# 应用基础 URL（部署后的域名）
wrangler secret put APP_BASE_URL
# 输入：https://your-domain.workers.dev
```

> **提示**: Session 密钥可以使用以下命令生成：
> ```bash
> openssl rand -base64 32
> ```

### 6. 本地开发

```bash
npm run dev
```

访问 `http://localhost:8787` 进行测试。

> **注意**: 本地开发时，GitHub OAuth 回调 URL 需要配置为 `http://localhost:8787/auth/callback`，或者使用 ngrok 等工具映射到公网域名。

### 7. 部署到 Cloudflare

```bash
npm run deploy
```

部署成功后，访问 `https://your-domain.workers.dev` 使用应用。

## 项目结构

```
.
├── src/
│   ├── index.ts       # 主入口，路由和页面
│   ├── types.ts       # TypeScript 类型定义
│   ├── session.ts     # Session 管理（加密 cookie）
│   ├── db.ts          # D1 数据库操作
│   └── github.ts      # GitHub API 调用
├── schema.sql         # 数据库表结构
├── wrangler.toml      # Cloudflare Workers 配置
├── package.json       # 项目依赖
├── tsconfig.json      # TypeScript 配置
└── README.md          # 本文档
```

## 数据库设计

### `users` 表

存储用户信息和 GitHub access token。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| github_id | INTEGER | GitHub 用户 ID（唯一） |
| github_login | TEXT | GitHub 用户名 |
| github_name | TEXT | GitHub 显示名称 |
| github_avatar | TEXT | GitHub 头像 URL |
| access_token | TEXT | GitHub access token |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

### `repositories` 表

存储用户接入的仓库。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键 |
| user_id | INTEGER | 用户 ID |
| github_repo_id | INTEGER | GitHub 仓库 ID |
| full_name | TEXT | 仓库全名（owner/repo） |
| default_branch | TEXT | 默认分支 |
| owner_login | TEXT | 仓库所有者 |
| installed_at | TIMESTAMP | 接入时间 |

## 安全说明

- ✅ Session 使用 AES-GCM 加密
- ✅ Cookie 设置 `HttpOnly`, `Secure`, `SameSite=Lax`
- ✅ 所有密钥通过环境变量配置，不写入代码
- ✅ GitHub access token 存储在 D1 数据库中

## 常见问题

### Q: 如何修改 Session 过期时间？

A: 编辑 `src/session.ts` 中的 `COOKIE_MAX_AGE` 常量（单位：秒）。

### Q: 如何查看生产数据库内容？

A: 使用 wrangler 命令：

```bash
wrangler d1 execute pmo-collab-db --remote --command="SELECT * FROM users"
```

### Q: 部署后 OAuth 回调失败？

A: 检查以下几点：
1. GitHub OAuth App 的 callback URL 是否正确（`https://your-domain.workers.dev/auth/callback`）
2. `APP_BASE_URL` 环境变量是否正确设置
3. 域名是否使用 HTTPS

### Q: 如何重置数据库？

A: 重新运行 schema.sql（会先删除旧表）：

```bash
wrangler d1 execute pmo-collab-db --remote --file=./schema.sql
```

## 后续计划

- [ ] 仓库详情页面
- [ ] agents.md 解析和展示
- [ ] 看板功能
- [ ] Issue 管理
- [ ] 人审队列

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
