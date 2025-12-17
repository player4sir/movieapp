// Base repository
export { BaseRepository } from './base.repository';

// Error types
export {
  RepositoryError,
  NotFoundError,
  DuplicateError,
  ConnectionError,
} from './errors';

// Repositories
export { UserRepository } from './user.repository';
export type {
  CreateUserInput,
  UpdateUserInput,
  UserListParams,
  UserListResult,
  UserStats,
} from './user.repository';

export { FavoriteRepository } from './favorite.repository';
export type { CreateFavoriteInput, UpsertFavoriteInput } from './favorite.repository';

export { WatchHistoryRepository } from './history.repository';
export type { UpsertHistoryInput } from './history.repository';

export { SessionRepository } from './session.repository';
export type { CreateSessionInput } from './session.repository';

export { VideoSourceRepository } from './source.repository';
export type {
  CreateVideoSourceInput,
  UpdateVideoSourceInput,
  UpdateTestResultInput,
  ReorderInput,
} from './source.repository';

export { UserGroupRepository } from './group.repository';
export type {
  CreateUserGroupInput,
  UpdateUserGroupInput,
} from './group.repository';

// Coin system repositories
export { CoinRepository } from './coin.repository';
export type {
  CreateCoinBalanceInput,
  UpdateCoinBalanceInput,
} from './coin.repository';

export { CoinTransactionRepository } from './coin-transaction.repository';
export type {
  CreateCoinTransactionInput,
  TransactionFilterParams,
  TransactionListResult,
} from './coin-transaction.repository';

export { CoinConfigRepository } from './coin-config.repository';
export type {
  UpsertCoinConfigInput,
} from './coin-config.repository';

export { CheckinRepository } from './checkin.repository';
export type {
  CreateCheckinInput,
} from './checkin.repository';

export { ContentAccessRepository } from './content-access.repository';
export type {
  CreateContentAccessInput,
  ContentAccessFilterParams,
  ContentAccessListResult,
  ContentAccessStats,
} from './content-access.repository';

// Membership system repositories
export { MembershipPlanRepository } from './membership-plan.repository';
export type {
  CreateMembershipPlanInput,
  UpdateMembershipPlanInput,
} from './membership-plan.repository';

export { MembershipOrderRepository } from './membership-order.repository';
export type {
  CreateMembershipOrderInput,
  UpdateMembershipOrderInput,
  OrderListParams,
  OrderListResult,
} from './membership-order.repository';

export { PaymentQRCodeRepository } from './payment-qrcode.repository';
export type {
  CreatePaymentQRCodeInput,
  UpdatePaymentQRCodeInput,
} from './payment-qrcode.repository';

export { MembershipAdjustLogRepository } from './membership-adjust-log.repository';
export type {
  CreateMembershipAdjustLogInput,
} from './membership-adjust-log.repository';

// Ad system repositories
export { AdRepository } from './ad.repository';
export type {
  CreateAdInput,
  UpdateAdInput,
  AdFilters,
} from './ad.repository';

export { AdSlotRepository } from './ad-slot.repository';
export type {
  CreateAdSlotInput,
  UpdateAdSlotInput,
} from './ad-slot.repository';

export { AdSlotAssignmentRepository } from './ad-slot-assignment.repository';
export type {
  CreateAdSlotAssignmentInput,
} from './ad-slot-assignment.repository';

export { AdImpressionRepository } from './ad-impression.repository';
export type {
  CreateAdImpressionInput,
  DateRange as AdDateRange,
  ImpressionCount,
  ImpressionCountByAd,
} from './ad-impression.repository';

export { AdClickRepository } from './ad-click.repository';
export type {
  CreateAdClickInput,
  ClickCountByAd,
} from './ad-click.repository';

export * from './coin-order.repository';

// Agent system repositories
export { AgentLevelRepository } from './agent-level.repository';
export type {
  CreateAgentLevelInput,
  UpdateAgentLevelInput,
} from './agent-level.repository';

export { AgentRecordRepository } from './agent-record.repository';
export type {
  CreateAgentRecordInput,
  UpdateAgentRecordInput,
  AgentRecordListParams,
  AgentRecordListResult,
  AgentReportSummary,
} from './agent-record.repository';