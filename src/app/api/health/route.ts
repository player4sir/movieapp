import { NextResponse } from 'next/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

/**
 * Health Check API Endpoint
 * 
 * Used by Docker health checks, load balancers, and monitoring systems
 * to verify the application is running and can connect to the database.
 * 
 * Returns:
 * - 200 OK: Application is healthy
 * - 503 Service Unavailable: Database connection failed
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check database connectivity
    await db.execute(sql`SELECT 1`);
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      responseTime: `${responseTime}ms`,
    }, { status: 200 });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}
