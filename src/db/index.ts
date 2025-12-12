import { drizzle as drizzleNode } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { pool } from './pool';
import * as schema from './schema';

/**
 * Database Connection
 * 
 * 自动检测运行环境并选择合适的数据库驱动:
 * - Node.js 环境: 使用 node-postgres (pg)
 * - Edge Runtime (Cloudflare Pages): 使用 @neondatabase/serverless
 */

// 检测是否在 Edge Runtime 环境
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';

// 创建数据库连接
function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  if (isEdgeRuntime) {
    // Edge Runtime: 使用 Neon HTTP 驱动
    const sql = neon(databaseUrl);
    return drizzleNeon(sql, { schema });
  } else {
    // Node.js: 使用 node-postgres
    return drizzleNode(pool, { schema });
  }
}

export const db = createDb();

export type Database = typeof db;

// Re-export schema for convenience
export * from './schema';
