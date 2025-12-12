/**
 * Admin User Sessions API Route
 * GET - List user sessions
 * DELETE - Terminate user sessions
 * Requirements: 7.1, 7.2, 7.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { UserRepository, SessionRepository } from '@/repositories';
import { 
  getActiveSessions, 
  terminateSession, 
  terminateAllUserSessions 
} from '@/services/session.service';

const userRepository = new UserRepository();
const sessionRepository = new SessionRepository();

// GET - List all active sessions for a user (Requirements 7.1)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;

    // Verify user exists using repository
    const user = await userRepository.findById(id);

    if (!user) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: '用户不存在' },
        { status: 404 }
      );
    }

    // Get active sessions for the user
    const sessions = await getActiveSessions(id);

    return NextResponse.json({
      userId: id,
      username: user.username,
      sessions,
      total: sessions.length,
    });
  } catch (error) {
    console.error('Get user sessions error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取用户会话失败' },
      { status: 500 }
    );
  }
}


// DELETE - Terminate user sessions (Requirements 6.2, 6.3)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    // Verify user exists using repository
    const user = await userRepository.findById(id);

    if (!user) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: '用户不存在' },
        { status: 404 }
      );
    }

    let result;

    if (sessionId) {
      // Terminate specific session (Requirements 6.2)
      // First verify the session belongs to this user using repository
      const sessions = await sessionRepository.findByUser(id);
      const session = sessions.find(s => s.id === sessionId);

      if (!session) {
        return NextResponse.json(
          { code: 'NOT_FOUND', message: '会话不存在' },
          { status: 404 }
        );
      }

      result = await terminateSession(sessionId);
    } else {
      // Terminate all sessions for the user (Requirements 6.3)
      result = await terminateAllUserSessions(id);
    }

    return NextResponse.json({
      success: result.success,
      affected: result.affected,
      message: result.message,
    });
  } catch (error) {
    console.error('Terminate user sessions error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '终止会话失败' },
      { status: 500 }
    );
  }
}
