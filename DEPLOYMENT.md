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

---

## 数据库迁移时机

### Docker 部署

```bash
# 方式 1: 容器外迁移 (推荐首次部署)
export DATABASE_URL=postgres://...
npm run db:push

# 然后启动容器
docker-compose up -d

# 方式 2: 容器内迁移
docker-compose up -d
docker exec -it movie-app npm run db:push
```

### Vercel/Cloudflare

在部署前本地执行迁移：

```bash
# 设置生产数据库 URL
export DATABASE_URL=你的生产数据库连接字符串

# 执行迁移
npm run db:push
```

---

## 回滚流程

### Docker 回滚

```bash
# 1. 查看历史镜像
docker images movie-app

# 2. 停止当前容器
docker-compose down

# 3. 使用旧版本镜像启动
docker run -d --name movie-app \
  -e DATABASE_URL=... \
  movie-app:previous-tag

# 或者使用 Git 回滚
git checkout <previous-commit>
docker-compose up -d --build
```

### Vercel 回滚

1. 访问 Vercel Dashboard > Deployments
2. 找到需要回滚到的部署版本
3. 点击 "..." > "Promote to Production"

### Cloudflare Pages 回滚

1. 访问 Cloudflare Dashboard > Pages > 你的项目
2. 进入 Deployments 标签
3. 找到目标部署，点击 "Rollback to this deploy"

---

## 监控建议

### 推荐监控工具

| 工具 | 用途 | 免费额度 |
|------|------|---------|
| [Sentry](https://sentry.io) | 错误追踪 | 5K events/月 |
| [Logtail](https://logtail.com) | 日志收集 | 1GB/月 |
| [Uptime Robot](https://uptimerobot.com) | 可用性监控 | 50个监控点 |
| [Vercel Analytics](https://vercel.com/analytics) | 性能监控 | Vercel 内置 |

### 健康检查端点

应用提供 `/api/health` 端点用于监控：

```bash
curl https://your-domain.com/api/health

# 返回示例
{
  "status": "healthy",
  "timestamp": "2024-12-13T00:00:00.000Z",
  "uptime": 12345.678,
  "database": "connected",
  "responseTime": "5ms"
}
```

### 设置告警

**Uptime Robot 配置：**

1. 添加 HTTP(s) 监控
2. URL: `https://your-domain.com/api/health`
3. 监控间隔: 5 分钟
4. 配置电子邮件/Slack 告警

---

## 备份策略

### 数据库备份

**Neon (推荐)：**

- 自动持续备份，每日快照
- 可通过 Dashboard 或 CLI 恢复

**自托管 PostgreSQL：**

```bash
# 每日备份脚本
#!/bin/bash
BACKUP_DIR=/backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

pg_dump $DATABASE_URL > $BACKUP_DIR/movieshell_$TIMESTAMP.sql

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
```

**添加到 crontab：**

```bash
# 每天凌晨 3 点备份
0 3 * * * /path/to/backup.sh
```

### 恢复数据库

```bash
# 从备份恢复
psql $DATABASE_URL < backup_file.sql

# 或使用 Neon Dashboard 的时间点恢复功能
```

---

## 扩展指南

### 水平扩展 (Docker)

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  app:
    build: .
    deploy:
      replicas: 3
      
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app
```

**nginx.conf 负载均衡示例：**

```nginx
upstream app_servers {
    server app:3000;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://app_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Vercel 扩展

- 自动按需扩展
- 配置 `functions.maxDuration` 调整超时
- 使用 Edge Functions 降低延迟

### Cloudflare 扩展

- 全球边缘节点自动扩展
- 启用 Smart Routing
- 配置 Workers 处理复杂计算

---

## 安全加固

### HTTPS 配置

**Docker 部署需要添加反向代理：**

```yaml
# docker-compose.prod.yml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
    depends_on:
      - app
```

**Vercel/Cloudflare：** HTTPS 已自动配置。

### 安全检查清单

- [ ] 所有环境变量已正确设置 (无默认值)
- [ ] DATABASE_URL 使用 SSL 连接 (`?sslmode=require`)
- [ ] JWT_SECRET 至少 32 个字符
- [ ] 启用了 Rate Limiting
- [ ] 定期更新依赖 (`npm audit`)
- [ ] 配置了监控和告警

