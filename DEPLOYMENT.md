# 部署指南

本项目支持多种部署方式：Docker、Vercel、Cloudflare Pages。

## 技术栈要求

- Node.js 20+
- PostgreSQL 数据库
- Next.js 15 (App Router)

## 1. Docker 部署 (推荐)

最简单的部署方式，适合自托管服务器。

### 快速开始

```bash
# 1. 复制环境变量
cp .env.example .env

# 2. 编辑 .env 配置数据库连接等
nano .env

# 3. 构建并启动
docker-compose up -d --build
```

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| DATABASE_URL | PostgreSQL 连接字符串 | postgres://user:pass@host:5432/db |
| JWT_SECRET | JWT 签名密钥 (≥32字符) | your-secret-key |
| JWT_REFRESH_SECRET | Refresh Token 密钥 | your-refresh-secret |
| NEXTAUTH_SECRET | NextAuth 密钥 | your-nextauth-secret |
| VIDEO_API_URL | 视频 API 地址 | http://api.example.com |
| PLAYBACK_TOKEN_SECRET | 播放令牌密钥 | your-playback-secret |

### 使用外部数据库

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - DATABASE_URL=postgres://user:pass@your-db-host:5432/movieshell
```

### 带数据库的完整部署

```yaml
# docker-compose.full.yml
version: '3'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://postgres:password@db:5432/movieshell
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: movieshell
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 2. Vercel 部署

适合快速部署，自动 CI/CD。

### 前置要求

- Vercel 账号
- 外部 PostgreSQL 数据库 (推荐: Neon, Supabase, Railway)

### 部署步骤

#### 方式 A: Vercel Dashboard (推荐新手)

1. Fork 或导入项目到 GitHub
2. 访问 [vercel.com](https://vercel.com) 并导入项目
3. 配置环境变量 (见下方)
4. 点击 Deploy

#### 方式 B: Vercel CLI

```bash
# 安装 CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel --prod
```

#### 方式 C: GitHub Actions 自动部署

1. 在 Vercel Dashboard 获取:
   - `VERCEL_TOKEN`: Settings > Tokens
   - `VERCEL_ORG_ID`: Project Settings > General
   - `VERCEL_PROJECT_ID`: Project Settings > General

2. 添加到 GitHub Secrets

3. Push 到 main 分支自动部署

### Vercel 环境变量配置

在 Vercel Dashboard > Project > Settings > Environment Variables:

```
DATABASE_URL=postgres://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
NEXTAUTH_SECRET=...
VIDEO_API_URL=...
PLAYBACK_TOKEN_SECRET=...
```

### 推荐数据库服务

| 服务 | 免费额度 | 特点 |
|------|---------|------|
| [Neon](https://neon.tech) | 0.5GB | Serverless, 自动暂停 |
| [Supabase](https://supabase.com) | 500MB | 带 Auth/Storage |
| [Railway](https://railway.app) | $5/月 | 简单易用 |
| [PlanetScale](https://planetscale.com) | 5GB | MySQL 兼容 |

---

## 3. Cloudflare Pages 部署

使用 `@cloudflare/next-on-pages` 将 Next.js 部署到 Cloudflare Pages。

### ⚠️ 重要限制

Cloudflare Pages 使用 **Edge Runtime**，不支持传统的 TCP 数据库连接。
必须使用支持 HTTP/WebSocket 连接的数据库服务。

**推荐: [Neon](https://neon.tech)** - Serverless PostgreSQL，原生支持 Edge Runtime。

### 前置要求

- Cloudflare 账号
- Neon 数据库账号 (免费)
- GitHub 仓库

### 部署步骤

#### 步骤 1: 创建 Neon 数据库

1. 注册 [Neon](https://neon.tech) 账号
2. 创建新项目
3. 复制 **Pooled connection string** (带 `-pooler` 的连接字符串)

```
postgres://user:password@ep-xxx-pooler.region.aws.neon.tech/dbname?sslmode=require
```

#### 步骤 2: 运行数据库迁移

```bash
# 设置环境变量
export DATABASE_URL="你的Neon连接字符串"

# 推送数据库结构
npm run db:push
```

#### 步骤 3: 连接 Cloudflare Pages

**方式 A: 通过 Dashboard (推荐)**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 进入 **Workers & Pages** > **Create application** > **Pages**
3. 连接 GitHub 仓库
4. 配置构建设置:
   - Framework preset: `Next.js`
   - Build command: `npm run pages:build`
   - Build output directory: `.vercel/output/static`
5. 添加环境变量 (见下方)
6. 点击 **Save and Deploy**

**方式 B: 通过 CLI**

```bash
# 登录 Cloudflare
npx wrangler login

# 构建
npm run pages:build

# 部署
npm run pages:deploy
```

#### 步骤 4: 配置环境变量

在 Cloudflare Pages > 你的项目 > Settings > Environment variables:

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Neon Pooled 连接字符串 |
| `JWT_SECRET` | JWT 签名密钥 (≥32字符) |
| `JWT_REFRESH_SECRET` | Refresh Token 密钥 |
| `NEXTAUTH_SECRET` | NextAuth 密钥 |
| `VIDEO_API_URL` | 视频 API 地址 |
| `PLAYBACK_TOKEN_SECRET` | 播放令牌密钥 |

### 本地预览

```bash
# 构建 Cloudflare Pages 版本
npm run pages:build

# 本地预览
npm run pages:preview
```

### GitHub Actions 自动部署

1. 获取 Cloudflare API Token:
   - Dashboard > My Profile > API Tokens
   - 创建 Token，选择 "Edit Cloudflare Workers" 模板

2. 添加 GitHub Secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

3. Push 到 main 分支自动部署

### 数据库服务对比

| 服务 | Edge 支持 | 免费额度 | 特点 |
|------|----------|---------|------|
| [Neon](https://neon.tech) | ✅ 原生支持 | 0.5GB | **推荐**, Serverless PostgreSQL |
| [PlanetScale](https://planetscale.com) | ✅ 原生支持 | 5GB | MySQL 兼容 |
| [Turso](https://turso.tech) | ✅ 原生支持 | 9GB | SQLite, 超低延迟 |
| Supabase | ❌ 需要适配 | 500MB | 需要使用 supabase-js |

### 注意事项

1. **必须使用 Neon**: 项目已集成 `@neondatabase/serverless` 驱动
2. **使用 Pooled 连接**: Neon 连接字符串要选择带 `-pooler` 的版本
3. **Edge Runtime 限制**: 某些 Node.js API 不可用，如 `fs`、`net` 等

---

## 数据库迁移

首次部署需要运行数据库迁移：

```bash
# 本地运行
npm run db:push

# 或生成迁移文件
npm run db:generate
npm run db:migrate
```

---

## 健康检查

部署后验证：

```bash
# 检查首页
curl https://your-domain.com

# 检查 API
curl https://your-domain.com/api/vod/categories

# 检查 PWA
curl https://your-domain.com/sw.js
```

---

## 故障排除

### 构建失败

```bash
# 清理缓存重新构建
rm -rf .next node_modules
npm ci
npm run build
```

### 数据库连接失败

1. 检查 DATABASE_URL 格式
2. 确认数据库允许外部连接
3. 检查 SSL 配置 (某些服务需要 `?sslmode=require`)

### PWA 不工作

1. 确认 HTTPS 部署
2. 检查 `/sw.js` 是否可访问
3. 清除浏览器 Service Worker 缓存

---

## 性能优化

### Docker

```dockerfile
# 使用多阶段构建减小镜像体积
# 当前 Dockerfile 已优化
```

### Vercel

```json
// vercel.json - 已配置
{
  "regions": ["hkg1", "sin1", "nrt1"]  // 亚洲区域优先
}
```

### Cloudflare

- 启用 Cloudflare CDN
- 配置 Page Rules 缓存静态资源
