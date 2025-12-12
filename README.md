This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 快速开始 (Getting Started)

首先，运行开发服务器：

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可在浏览器中查看结果。

你可以通过修改 `app/page.tsx` 来开始编辑页面。页面会在你编辑文件时自动更新。

本项目使用 [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) 自动优化并加载 [Geist](https://vercel.com/font) 字体 (Vercel 推出的新字体系列)。

---

# 部署指南 (Deployment Guide)

以下是将 Movie App 部署到生产环境的详细指南。

## 1. 系统要求

*   **Node.js**: v18.17+ (推荐 LTS 版本)
*   **数据库**: PostgreSQL 12+ (或兼容版本)
*   **Redis**: (可选) 用于未来的缓存/队列功能
*   **反向代理**: Nginx (如果选择自托管/VPS)

## 2. 环境变量

请基于 `.env.example` 创建一个 `.env.production` 文件（或在你的 CI/CD 平台中设置变量）。

| 变量名 | 说明 | 示例 |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgres://user:pass@host:5432/movieshell` |
| `VIDEO_API_URL` | 上游视频资源 API 地址 | `http://api.example.com` |
| `JWT_SECRET` | 用于验证 JWT 的密钥 | *生成安全的随机字符串* |
| `JWT_REFRESH_SECRET` | 用于刷新 Token 的密钥 | *生成安全的随机字符串* |
| `NEXTAUTH_SECRET` | NextAuth 密钥 | *生成安全的随机字符串* |
| `NODE_ENV` | 环境模式 | `production` |

> **安全提示**: 你可以使用 `npx tsx scripts/generate-secrets.ts` 脚本来生成安全的随机密钥。

## 3. 数据库设置 (Drizzle ORM)

本项目使用 Drizzle ORM。在启动应用之前，必须运行数据库迁移。

### 运行迁移
```bash
npm run db:migrate
```

### 初始化数据 (Seed)
此步骤将创建默认的管理员账户、会员套餐配置和广告位配置。
```bash
npm run db:seed
```
*注意：Seed 脚本具有幂等性（idempotent），重复运行不会造成数据重复。*

## 4. 部署方案

### 方案 A: Vercel (推荐)

1.  将代码推送到 Git 仓库 (GitHub/GitLab)。
2.  在 Vercel 中导入该项目。
3.  在 Vercel 项目设置中配置 **Environment Variables** (环境变量)。
4.  **Build Command**: `next build` (默认)
5.  **Install Command**: `npm install` (默认)
6.  **Deploy**. Vercel 会自动处理后续流程。
7.  *部署后*: 在本地连接到你的生产数据库，或者通过 Vercel 的 Function Shell 运行 `npm run db:migrate` 和 `npm run db:seed`。

### 方案 B: Docker 容器部署

项目根目录下已包含标准 `Dockerfile`。

1.  **构建镜像**:
    ```bash
    docker build -t movie-app .
    ```

2.  **运行容器**:
    ```bash
    docker run -d -p 3000:3000 \
      -e DATABASE_URL="postgres://..." \
      -e JWT_SECRET="..." \
      ... \
      --name movie-app movie-app
    ```

3.  **使用 Docker Compose**:
    确保 `docker-compose.yml` 已正确配置环境变量，然后运行：
    ```bash
    docker-compose up -d
    ```

### 方案 C: 手动部署 / VPS (PM2)

适用于传统的 VPS 服务器 (Ubuntu/CentOS 等)。

1.  **安装依赖**:
    ```bash
    npm install --production=false
    # 注意: 初始安装需要 --production=false 以包含 drizzle-kit 等开发依赖用于迁移
    ```

2.  **构建应用**:
    ```bash
    npm run build
    ```

3.  **运行数据库迁移与初始化**:
    ```bash
    npm run db:migrate
    npm run db:seed
    ```

4.  **使用 PM2 启动服务**:
    ```bash
    npm install -g pm2
    pm2 start npm --name "movie-app" -- start
    pm2 save
    pm2 startup
    ```

## 5. Nginx 配置 (示例)

如果使用方案 C，建议配置 Nginx 作为反向代理。

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 6. 常见问题排查

*   **Build Error: Dynamic server usage**: 确保使用了 `searchParams` 或 `headers` 的 API 路由 (`/src/app/api/...`) 文件中已添加 `export const dynamic = 'force-dynamic'` 配置。
*   **Database Connection Error**: 验证 `DATABASE_URL` 在托管环境中是否可访问。如果使用 Vercel，请确保托管数据库允许 "Allow access from 0.0.0.0/0" (或配置具体的 Vercel IP 白名单)。
