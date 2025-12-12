/**
 * Public Recharge Packages API
 * GET /api/coins/packages - Get available recharge packages
 * 
 * Requirements: 8.1 - Display coin amount and price
 */

import { NextResponse } from 'next/server';
import { getConfig } from '@/services/config.service';

/**
 * GET /api/coins/packages
 * Returns available recharge packages for display to users.
 * This is a public endpoint (no auth required).
 */
export async function GET() {
  try {
    const config = await getConfig('recharge_packages');
    // getConfig returns { key, value, description, ... }, we need the value
    const packages = Array.isArray(config.value) ? config.value : [];
    
    return NextResponse.json({
      packages,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get recharge packages error:', error);
    return NextResponse.json(
      { packages: [] },
      { status: 200 }
    );
  }
}
