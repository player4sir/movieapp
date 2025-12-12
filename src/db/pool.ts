import { Pool, PoolConfig } from 'pg';

/**
 * Database Connection Pool
 * 
 * 支持多种部署环境:
 * 1. Node.js 环境 (Docker/Vercel/本地开发) - 使用 node-postgres
 * 2. Cloudflare Pages (Edge Runtime) - 需要使用 @neondatabase/serverless
 * 
 * 注意: Cloudflare Pages 部署需要:
 * - 使用 Neon 数据库 (支持 HTTP/WebSocket 连接)
 * - 或使用 Cloudflare D1 (SQLite)
 * - 详见 DEPLOYMENT.md
 */

// 检测运行环境
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';

// 获取数据库连接字符串
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && !isEdgeRuntime) {
  console.error('ERROR: DATABASE_URL environment variable is not set!');
  console.error('Please set DATABASE_URL in your environment or .env file.');
  console.error('Example: DATABASE_URL=postgres://user:password@host:5432/database');
}

const poolConfig: PoolConfig = {
  connectionString: databaseUrl,
  max: 20,                       // Maximum connections (Requirement 4.1)
  idleTimeoutMillis: 30000,      // Idle connection timeout 30 seconds (Requirement 4.2)
  connectionTimeoutMillis: 10000, // Connection timeout 10 seconds
};

const globalForPool = globalThis as unknown as {
  pool: Pool | undefined;
  poolEnded: boolean | undefined;
};

// 只在 Node.js 环境创建连接池
// Edge Runtime 环境使用 serverless 驱动 (见 src/db/edge.ts)
export const pool = isEdgeRuntime ? (null as unknown as Pool) : (globalForPool.pool ?? new Pool(poolConfig));

if (process.env.NODE_ENV !== 'production' && !isEdgeRuntime) {
  globalForPool.pool = pool;
}

// Graceful shutdown handling (Requirement 4.4)
// Track if pool has been ended to prevent "Called end on pool more than once" error
if (!isEdgeRuntime && !globalForPool.poolEnded) {
  const shutdown = async () => {
    if (!globalForPool.poolEnded && pool) {
      globalForPool.poolEnded = true;
      await pool.end();
    }
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

