/**
 * User Unlocked Content API
 * GET /api/user/unlocked - Get user's unlocked content list
 * 
 * Requirements: 7.1, 7.2, 7.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { getUserUnlocks } from '@/services/access.service';
import { SourceCategory } from '@/db/schema';

/**
 * GET /api/user/unlocked
 * Returns paginated list of user's unlocked content.
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - category: Filter by source category - 'normal' or 'adult' (optional)
 * 
 * Response:
 * - data: ContentAccess[] - List of unlocked content records
 * - pagination: { page, pageSize, total, totalPages }
 * 
 * Requirements:
 * - 7.1: Display section for unlocked content in profile
 * - 7.2: Show content name, unlock date, and episode information
 * - 7.4: Support filtering by content category
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;
  const searchParams = request.nextUrl.searchParams;

  // Parse pagination parameters
  const pageParam = searchParams.get('page');
  const pageSizeParam = searchParams.get('pageSize');
  const categoryParam = searchParams.get('category');

  // Validate and parse page
  let page = 1;
  if (pageParam) {
    const parsedPage = parseInt(pageParam, 10);
    if (isNaN(parsedPage) || parsedPage < 1) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'page must be a positive integer' },
        { status: 400 }
      );
    }
    page = parsedPage;
  }

  // Validate and parse pageSize
  let pageSize = 20;
  if (pageSizeParam) {
    const parsedPageSize = parseInt(pageSizeParam, 10);
    if (isNaN(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > 100) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'pageSize must be between 1 and 100' },
        { status: 400 }
      );
    }
    pageSize = parsedPageSize;
  }

  // Validate category if provided
  let sourceCategory: SourceCategory | undefined;
  if (categoryParam) {
    if (categoryParam !== 'normal' && categoryParam !== 'adult') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'category must be "normal" or "adult"' },
        { status: 400 }
      );
    }
    sourceCategory = categoryParam;
  }

  try {
    const result = await getUserUnlocks(user.id, {
      sourceCategory,
      page,
      pageSize,
    });

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get unlocked content error:', error);
    
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取已解锁内容失败，请重试' },
      { status: 500 }
    );
  }
}
