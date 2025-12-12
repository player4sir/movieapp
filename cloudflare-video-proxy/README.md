# Cloudflare Video Proxy Worker

视频代理服务 - 用于绕过视频源 403 限制

## 功能

- 代理 M3U8 和 TS 文件请求
- 自动处理 Referer/Origin 头
- 边缘缓存支持
- 防滥用保护（可选的密钥验证）

## 部署步骤

### 1. 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 2. 登录 Cloudflare

```bash
wrangler login
```

### 3. 部署 Worker

```bash
cd cloudflare-video-proxy
wrangler deploy
```

### 4. 配置环境变量（可选）

在 Cloudflare Dashboard 中设置：
- `PROXY_SECRET`: 代理密钥，用于验证请求来源

### 5. 在主应用中使用

设置环境变量：
```
VIDEO_PROXY_WORKER_URL=https://video-proxy.<your-subdomain>.workers.dev
```

## 使用方式

### 代理 M3U8 文件

```
https://video-proxy.xxx.workers.dev/proxy?url=https://example.com/video.m3u8
```

### 带密钥验证

```
https://video-proxy.xxx.workers.dev/proxy?url=https://example.com/video.m3u8&key=your-secret
```

## 安全说明

1. 建议配置 `PROXY_SECRET` 防止滥用
2. 配置允许的域名白名单
3. 启用 Cloudflare 的速率限制规则
