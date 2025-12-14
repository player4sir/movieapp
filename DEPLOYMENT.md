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

## 4. 宝塔面板部署 (自有服务器)

使用宝塔面板在自有 Linux 服务器上部署，支持 PM2 和 Docker 两种方式。

### 服务器要求

| 配置项 | 最低要求 | 推荐配置 |
|--------|---------|----------|
| CPU | 1 核 | 2 核+ |
| 内存 | 1GB | 2GB+ |
| 硬盘 | 10GB | 20GB+ |
| 系统 | CentOS 7+ / Ubuntu 18+ / Debian 10+ | Ubuntu 22.04 |

### 前置准备

#### 步骤 1: 安装宝塔面板

```bash
# CentOS
yum install -y wget && wget -O install.sh https://download.bt.cn/install/install_6.0.sh && sh install.sh ed8484bec

# Ubuntu/Debian
wget -O install.sh https://download.bt.cn/install/install-ubuntu_6.0.sh && sudo bash install.sh ed8484bec
```

安装完成后，访问宝塔面板地址并登录。

#### 步骤 2: 安装必要软件

在宝塔面板 **软件商店** 中安装：

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| Nginx | 1.20+ | 反向代理 |
| PostgreSQL | 15+ | 数据库 |
| PM2 管理器 | 最新版 | Node.js 进程管理 |
| Node.js | 20+ | 运行环境 |

> [!IMPORTANT]
> Node.js 必须安装 20.x 或更高版本。在软件商店搜索 "Node.js版本管理器" 进行安装和版本切换。

---

### 方式 A: PM2 部署 (推荐)

适合轻量级部署，资源占用少。

#### 步骤 1: 上传项目代码

**方式 1: 通过宝塔文件管理器上传**

1. 进入 **文件** 管理
2. 导航到 `/www/wwwroot/`
3. 创建目录 `movie-app`
4. 上传项目代码 (ZIP 压缩包后解压)

**方式 2: 通过 Git 拉取**

> [!TIP]
> 如果服务器未安装 Git，需要先安装：
> ```bash
> # CentOS/RHEL
> yum install -y git
> 
> # Ubuntu/Debian
> apt-get update && apt-get install -y git
> 
> # 验证安装
> git --version
> ```

```bash
# SSH 连接到服务器
cd /www/wwwroot
git clone https://github.com/your-repo/movie-app.git
cd movie-app
```

#### 步骤 2: 配置环境变量

```bash
cd /www/wwwroot/movie-app

# 复制环境变量示例
cp .env.example .env

# 编辑环境变量
nano .env
```

配置以下必要变量：

```env
# 数据库连接 (宝塔 PostgreSQL)
DATABASE_URL=postgres://postgres:你的密码@127.0.0.1:5432/movieshell

# JWT 密钥 (至少32个字符的随机字符串)
JWT_SECRET=your-very-long-random-secret-key-here-32chars
JWT_REFRESH_SECRET=your-refresh-token-secret-key-here
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# 视频 API
VIDEO_API_URL=http://api.example.com

# 播放令牌
PLAYBACK_TOKEN_SECRET=your-playback-secret-key-here
```

> [!TIP]
> 生成随机密钥: `openssl rand -base64 32`

#### 步骤 3: 创建数据库

在宝塔面板 **数据库** 页面：

1. 点击 **添加数据库**
2. 数据库类型选择 **PostgreSQL**
3. 数据库名: `movieshell`
4. 用户名: `postgres` (或自定义)
5. 密码: 设置强密码
6. 点击 **提交**

#### 步骤 4: 安装依赖并构建

```bash
cd /www/wwwroot/movie-app

# 安装依赖
npm install

# 构建项目
npm run build

# 推送数据库结构
npm run db:push

# (可选) 填充测试数据
npm run db:seed
```

#### 步骤 5: 使用 PM2 启动

**方式 1: 通过宝塔 PM2 管理器**

1. 进入 **软件商店** > **PM2 管理器** > **设置**
2. 点击 **添加项目**
3. 填写配置:
   - 项目名称: `movie-app`
   - 启动文件: `npm`
   - 运行目录: `/www/wwwroot/movie-app`
   - 运行参数: `start`
   - 端口: `3000`

**方式 2: 通过命令行**

```bash
cd /www/wwwroot/movie-app

# 启动应用
pm2 start npm --name "movie-app" -- start

# 保存 PM2 配置 (开机自启)
pm2 save

# 查看运行状态
pm2 status

# 查看日志
pm2 logs movie-app
```

**PM2 常用命令:**

```bash
pm2 restart movie-app    # 重启
pm2 stop movie-app       # 停止
pm2 delete movie-app     # 删除
pm2 logs movie-app       # 查看日志
pm2 monit                # 监控面板
```

---

### 方式 B: Docker 部署

适合需要隔离环境或多项目部署的场景。

#### 步骤 1: 安装 Docker

在宝塔面板 **软件商店** 搜索并安装 **Docker管理器**。

或通过命令行安装：

```bash
# CentOS
curl -fsSL https://get.docker.com | bash

# 启动 Docker
systemctl start docker
systemctl enable docker
```

#### 步骤 2: 配置环境变量

```bash
cd /www/wwwroot/movie-app

# 编辑 .env 文件
cp .env.example .env
nano .env
```

配置 DATABASE_URL 指向外部 PostgreSQL 或使用 Docker 内置数据库：

```env
# 使用外部数据库
DATABASE_URL=postgres://postgres:密码@127.0.0.1:5432/movieshell

# 或使用 Docker Compose 内置数据库
DATABASE_URL=postgres://postgres:password@db:5432/movieshell
```

#### 步骤 3: 使用 Docker Compose 启动

```bash
cd /www/wwwroot/movie-app

# 构建并启动 (后台运行)
docker-compose up -d --build

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 运行数据库迁移
docker exec -it movie-app npm run db:push
```

**Docker 常用命令:**

```bash
docker-compose restart   # 重启服务
docker-compose down      # 停止并删除容器
docker-compose pull      # 拉取最新镜像
docker-compose logs -f   # 查看实时日志
```

---

### Nginx 反向代理配置

#### 步骤 1: 添加网站

在宝塔面板 **网站** 页面：

1. 点击 **添加站点**
2. 域名: `your-domain.com` (或服务器 IP)
3. 根目录: `/www/wwwroot/movie-app/public`
4. PHP 版本: **纯静态**
5. 点击 **提交**

#### 步骤 2: 配置反向代理

1. 点击刚创建的站点 **设置**
2. 选择 **反向代理**
3. 点击 **添加反向代理**
4. 配置:
   - 代理名称: `nextjs`
   - 目标URL: `http://127.0.0.1:3000`
   - 发送域名: `$host`
5. 点击 **提交**

#### 步骤 3: 修改 Nginx 配置 (可选优化)

点击 **配置文件**，在 `server` 块中添加优化配置：

```nginx
# 反向代理配置
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # 超时设置
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# 静态资源缓存
location /_next/static/ {
    proxy_pass http://127.0.0.1:3000;
    proxy_cache_valid 60m;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

# Gzip 压缩
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;
```

---

### SSL 证书配置

#### 使用 Let's Encrypt 免费证书

1. 进入站点 **设置** > **SSL**
2. 选择 **Let's Encrypt**
3. 勾选需要申请证书的域名
4. 点击 **申请**
5. 申请成功后，开启 **强制HTTPS**

> [!NOTE]
> Let's Encrypt 证书有效期 90 天，宝塔会自动续期。

#### 使用自有证书

1. 进入站点 **设置** > **SSL**
2. 选择 **其他证书**
3. 粘贴证书内容 (PEM 格式) 和私钥
4. 点击 **保存**
5. 开启 **强制HTTPS**

---

### 更新部署

#### PM2 更新

```bash
cd /www/wwwroot/movie-app

# 拉取最新代码
git pull origin main

# 安装新依赖
npm install

# 重新构建
npm run build

# 运行数据库迁移 (如有)
npm run db:push

# 重启应用
pm2 restart movie-app
```

#### Docker 更新

```bash
cd /www/wwwroot/movie-app

# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose up -d --build

# 运行数据库迁移 (如有)
docker exec -it movie-app npm run db:push
```

---

### 性能优化

#### 1. Node.js 内存配置

在启动命令中增加内存限制：

```bash
# PM2 配置
pm2 start npm --name "movie-app" -- start --node-args="--max-old-space-size=1024"

# 或在 ecosystem.config.js 中配置
module.exports = {
  apps: [{
    name: 'movie-app',
    script: 'npm',
    args: 'start',
    cwd: '/www/wwwroot/movie-app',
    node_args: '--max-old-space-size=1024',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

#### 2. 配置 Swap 空间

小内存服务器建议配置 Swap：

```bash
# 创建 2GB Swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

#### 3. 启用宝塔面板优化

- **网站加速**: 在宝塔面板 **加速** 中启用站点加速
- **数据库优化**: 定期清理日志，优化表结构

---

### 常见问题排查

#### 问题 1: Node.js 版本不满足要求

**现象**: `npm install` 或 `npm run build` 报错

**解决方案**:

```bash
# 检查当前版本
node -v

# 使用 nvm 切换版本 (宝塔自带)
nvm install 20
nvm use 20
nvm alias default 20
```

#### 问题 2: 端口 3000 被占用

**现象**: 启动失败，提示端口被占用

**解决方案**:

```bash
# 查找占用端口的进程
lsof -i:3000

# 杀死进程
kill -9 <PID>

# 或修改 Next.js 启动端口
PORT=3001 npm start
```

#### 问题 3: 内存不足导致构建失败

**现象**: `npm run build` 时进程被 kill

**解决方案**:

```bash
# 增加 Node.js 可用内存
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build

# 或配置 Swap 空间 (见上方)
```

#### 问题 4: 数据库连接失败

**现象**: 应用启动后无法连接数据库

**解决方案**:

1. 确认 PostgreSQL 服务运行中
2. 检查 DATABASE_URL 格式是否正确
3. 确认数据库用户有足够权限
4. 检查防火墙是否放行 5432 端口

```bash
# 测试数据库连接
psql $DATABASE_URL -c "SELECT 1"
```

#### 问题 5: Nginx 502 Bad Gateway

**现象**: 访问网站显示 502 错误

**解决方案**:

1. 确认 Node.js 应用正在运行: `pm2 status`
2. 检查应用是否监听在 3000 端口: `netstat -tlnp | grep 3000`
3. 查看 PM2 日志排查错误: `pm2 logs movie-app`

#### 问题 6: 静态资源 404

**现象**: 页面加载但样式/脚本缺失

**解决方案**:

确认 Nginx 反向代理配置正确，所有请求都转发到 Next.js:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    # ... 其他配置
}
```

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

