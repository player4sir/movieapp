/**
 * Admin Batch Operations API Route
 * Performs batch operations on multiple users
 * Supports: updateStatus, updateGroup, updateMemberLevel
 * Requirements: 2.2, 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { UserRepository, UserGroupRepository } from '@/repositories';
import { terminateAllUserSessions } from '@/services/session.service';

const userRepository = new UserRepository();
const groupRepository = new UserGroupRepository();

/**
 * Batch operation types
 */
type BatchOperationType = 'updateStatus' | 'updateGroup' | 'updateMemberLevel';

/**
 * Batch operation request body
 */
interface BatchOperationRequest {
  userIds: string[];
  operation: BatchOperationType;
  payload: {
    status?: 'active' | 'disabled';
    groupId?: string | null;
    memberLevel?: 'free' | 'vip' | 'svip';
  };
}

/**
 * Error detail for failed operations
 */
interface OperationError {
  userId: string;
  error: string;
}

/**
 * Batch operation response
 */
interface BatchOperationResponse {
  success: boolean;
  affected: number;
  failed: number;
  errors: OperationError[];
}

/**
 * Validates the batch operation request
 */
function validateRequest(body: unknown): { valid: boolean; error?: string; data?: BatchOperationRequest } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: '请求体无效' };
  }

  const req = body as Record<string, unknown>;

  // Validate userIds
  if (!Array.isArray(req.userIds) || req.userIds.length === 0) {
    return { valid: false, error: '用户ID列表不能为空' };
  }

  if (!req.userIds.every((id) => typeof id === 'string' && id.length > 0)) {
    return { valid: false, error: '用户ID格式无效' };
  }

  // Validate operation type
  const validOperations: BatchOperationType[] = ['updateStatus', 'updateGroup', 'updateMemberLevel'];
  if (!validOperations.includes(req.operation as BatchOperationType)) {
    return { valid: false, error: '无效的操作类型' };
  }

  const operation = req.operation as BatchOperationType;
  const payload = (req.payload || {}) as Record<string, unknown>;

  // Validate payload based on operation type
  if (operation === 'updateStatus') {
    if (!payload.status || !['active', 'disabled'].includes(payload.status as string)) {
      return { valid: false, error: '状态值无效，必须是 active 或 disabled' };
    }
  }

  if (operation === 'updateMemberLevel') {
    if (!payload.memberLevel || !['free', 'vip', 'svip'].includes(payload.memberLevel as string)) {
      return { valid: false, error: '会员等级无效，必须是 free、vip 或 svip' };
    }
  }

  // groupId can be null (to remove from group) or a string
  if (operation === 'updateGroup') {
    if (payload.groupId !== null && payload.groupId !== undefined && typeof payload.groupId !== 'string') {
      return { valid: false, error: '用户组ID格式无效' };
    }
  }

  return {
    valid: true,
    data: {
      userIds: req.userIds as string[],
      operation,
      payload: payload as BatchOperationRequest['payload'],
    },
  };
}


/**
 * POST /api/admin/users/batch
 * Performs batch operations on multiple users
 * 
 * Supported operations:
 * - updateStatus: Update status of all selected users (Requirements 2.2)
 * - updateGroup: Assign all selected users to a group (Requirements 2.3)
 * - updateMemberLevel: Update membership level of all selected users
 * 
 * Returns detailed success/failure counts
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const body = await request.json();
    const validation = validateRequest(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error },
        { status: 400 }
      );
    }

    const { userIds, operation, payload } = validation.data;

    // Verify group exists if assigning to a group
    if (operation === 'updateGroup' && payload.groupId) {
      const group = await groupRepository.findById(payload.groupId);
      if (!group) {
        return NextResponse.json(
          { code: 'GROUP_NOT_FOUND', message: '用户组不存在' },
          { status: 404 }
        );
      }
    }

    // Get existing users to validate and check constraints
    const existingUsers = await userRepository.findByIds(userIds);

    const existingUserIds = new Set(existingUsers.map((u) => u.id));
    const errors: OperationError[] = [];
    const usersToProcess: string[] = [];

    // Validate each user
    for (const userId of userIds) {
      if (!existingUserIds.has(userId)) {
        errors.push({ userId, error: '用户不存在' });
        continue;
      }

      const user = existingUsers.find((u) => u.id === userId)!;

      // Cannot disable admin users
      if (user.role === 'admin') {
        if (operation === 'updateStatus' && payload.status === 'disabled') {
          errors.push({ userId, error: '不能禁用管理员账户' });
          continue;
        }
      }

      usersToProcess.push(userId);
    }

    // Execute the batch operation
    let affected = 0;

    if (usersToProcess.length > 0) {
      switch (operation) {
        case 'updateStatus': {
          affected = await userRepository.updateMany(usersToProcess, { status: payload.status });

          // If disabling users, terminate their sessions (Requirements 3.4)
          if (payload.status === 'disabled') {
            for (const userId of usersToProcess) {
              await terminateAllUserSessions(userId);
            }
          }
          break;
        }

        case 'updateGroup': {
          affected = await userRepository.updateMany(usersToProcess, { groupId: payload.groupId ?? null });
          break;
        }

        case 'updateMemberLevel': {
          affected = await userRepository.updateMany(usersToProcess, { memberLevel: payload.memberLevel });
          break;
        }
      }
    }

    const response: BatchOperationResponse = {
      success: errors.length === 0,
      affected,
      failed: errors.length,
      errors,
    };

    // Return 207 Multi-Status if there were partial failures
    const statusCode = errors.length > 0 && affected > 0 ? 207 : errors.length === userIds.length ? 400 : 200;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('Batch operation error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '批量操作失败' },
      { status: 500 }
    );
  }
}
