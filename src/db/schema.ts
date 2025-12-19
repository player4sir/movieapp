// Drizzle Schema Definitions
// Matches existing Prisma schema for migration compatibility

import {
  pgTable, pgEnum, text, timestamp, integer,
  varchar, boolean, json, uniqueIndex, index
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ============================================
// Enum Definitions (Task 2.1)
// ============================================

export const userRoleEnum = pgEnum('UserRole', ['user', 'admin']);
export const userStatusEnum = pgEnum('UserStatus', ['active', 'disabled']);
export const memberLevelEnum = pgEnum('MemberLevel', ['free', 'vip', 'svip']);
export const sourceCategoryEnum = pgEnum('SourceCategory', ['normal', 'adult']);
export const transactionTypeEnum = pgEnum('TransactionType', ['recharge', 'checkin', 'exchange', 'consume', 'adjust', 'promotion']);
export const unlockTypeEnum = pgEnum('UnlockType', ['purchase', 'vip']);
export const orderStatusEnum = pgEnum('OrderStatus', ['pending', 'paid', 'approved', 'rejected']);
export const paymentTypeEnum = pgEnum('PaymentType', ['wechat', 'alipay']);



export const membershipOrders = pgTable('MembershipOrder', {
  id: text('id').primaryKey(),
  orderNo: varchar('orderNo', { length: 32 }).notNull().unique(),
  userId: text('userId').notNull(),
  planId: text('planId').notNull(),
  memberLevel: memberLevelEnum('memberLevel').notNull(),
  duration: integer('duration').notNull(), // days
  price: integer('price').notNull(), // cents
  status: orderStatusEnum('status').default('pending').notNull(),
  paymentType: paymentTypeEnum('paymentType'),
  paymentScreenshot: text('paymentScreenshot'), // URL to uploaded image (Legacy support)
  transactionNote: text('transactionNote'), // (Legacy support)
  remarkCode: varchar('remarkCode', { length: 6 }), // 4-6 digit code
  reviewedBy: text('reviewedBy'),
  reviewedAt: timestamp('reviewedAt'),
  rejectReason: text('rejectReason'),
  agentId: text('agentId'), // Explicit agent attribution
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  uniqueIndex('MembershipOrder_orderNo_key').on(table.orderNo),
  uniqueIndex('MembershipOrder_user_plan_pending_key').on(table.userId, table.planId).where(sql`status = 'pending'`),
  index('MembershipOrder_userId_idx').on(table.userId),
  index('MembershipOrder_planId_idx').on(table.planId),
  index('MembershipOrder_agentId_idx').on(table.agentId),
  index('MembershipOrder_status_idx').on(table.status),
  index('MembershipOrder_createdAt_idx').on(table.createdAt),
]);

export const coinOrders = pgTable('CoinOrder', {
  id: text('id').primaryKey(),
  orderNo: varchar('orderNo', { length: 32 }).notNull().unique(),
  userId: text('userId').notNull(),
  amount: integer('amount').notNull(), // coins to add
  price: integer('price').notNull(), // cents
  status: orderStatusEnum('status').default('pending').notNull(),
  paymentType: paymentTypeEnum('paymentType'),
  paymentScreenshot: text('paymentScreenshot'), // URL to uploaded image
  transactionNote: text('transactionNote'),
  remarkCode: varchar('remarkCode', { length: 6 }), // 4-6 digit code
  reviewedBy: text('reviewedBy'),
  reviewedAt: timestamp('reviewedAt'),
  rejectReason: text('rejectReason'),
  agentId: text('agentId'), // Explicit agent attribution
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  uniqueIndex('CoinOrder_orderNo_key').on(table.orderNo),
  index('CoinOrder_userId_idx').on(table.userId),
  index('CoinOrder_agentId_idx').on(table.agentId),
  index('CoinOrder_status_idx').on(table.status),
  index('CoinOrder_createdAt_idx').on(table.createdAt),
]);

// ============================================
// User and UserGroup Tables (Task 2.2)
// ============================================

export const users = pgTable('User', {
  id: text('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  passwordHash: text('passwordHash').notNull(),
  nickname: text('nickname').default('').notNull(),
  avatar: text('avatar').default('').notNull(),
  role: userRoleEnum('role').default('user').notNull(),
  status: userStatusEnum('status').default('active').notNull(),
  memberLevel: memberLevelEnum('memberLevel').default('free').notNull(),
  memberExpiry: timestamp('memberExpiry'),
  groupId: text('groupId'),
  referralCode: varchar('referralCode', { length: 12 }).unique(), // Allow null for old users
  referredBy: text('referredBy'), // ID of the referrer
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  lastLoginAt: timestamp('lastLoginAt'),
}, (table) => [
  index('User_username_idx').on(table.username),
  index('User_status_idx').on(table.status),
  index('User_memberLevel_idx').on(table.memberLevel),
  index('User_groupId_idx').on(table.groupId),
  index('User_createdAt_idx').on(table.createdAt),
  uniqueIndex('User_referralCode_key').on(table.referralCode),
  index('User_referredBy_idx').on(table.referredBy),
]);

export const userGroups = pgTable('UserGroup', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description').default('').notNull(),
  color: varchar('color', { length: 7 }).default('#6b7280').notNull(),
  permissions: json('permissions').default({}).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  index('UserGroup_name_idx').on(table.name),
]);

// ============================================
// Favorite and WatchHistory Tables (Task 2.3)
// ============================================

export const favorites = pgTable('Favorite', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  vodId: integer('vodId').notNull(),
  vodName: text('vodName').notNull(),
  vodPic: text('vodPic').notNull(),
  typeName: text('typeName').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('Favorite_userId_vodId_key').on(table.userId, table.vodId),
  index('Favorite_userId_idx').on(table.userId),
  index('Favorite_vodId_idx').on(table.vodId),
]);

export const watchHistory = pgTable('WatchHistory', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  vodId: integer('vodId').notNull(),
  vodName: text('vodName').notNull(),
  vodPic: text('vodPic').notNull(),
  episodeIndex: integer('episodeIndex').default(0).notNull(),
  episodeName: text('episodeName').default('').notNull(),
  position: integer('position').default(0).notNull(),
  duration: integer('duration').default(0).notNull(),
  sourceIndex: integer('sourceIndex').default(0).notNull(),
  sourceCategory: sourceCategoryEnum('sourceCategory').default('normal').notNull(),
  watchedAt: timestamp('watchedAt').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('WatchHistory_userId_vodId_sourceCategory_key').on(table.userId, table.vodId, table.sourceCategory),
  index('WatchHistory_userId_idx').on(table.userId),
  index('WatchHistory_watchedAt_idx').on(table.watchedAt),
  index('WatchHistory_sourceCategory_idx').on(table.sourceCategory),
]);

// ============================================
// UserSession and VideoSource Tables (Task 2.4)
// ============================================

export const userSessions = pgTable('UserSession', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  refreshToken: text('refreshToken').notNull().unique(),
  deviceInfo: text('deviceInfo').default('').notNull(),
  ipAddress: text('ipAddress').default('').notNull(),
  userAgent: text('userAgent').default('').notNull(),
  lastActivityAt: timestamp('lastActivityAt').defaultNow().notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
}, (table) => [
  index('UserSession_userId_idx').on(table.userId),
  index('UserSession_refreshToken_idx').on(table.refreshToken),
  index('UserSession_expiresAt_idx').on(table.expiresAt),
]);

export const videoSources = pgTable('VideoSource', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: sourceCategoryEnum('category').default('normal').notNull(),
  apiUrl: text('apiUrl').notNull(),
  timeout: integer('timeout').default(10000).notNull(),
  retries: integer('retries').default(3).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  priority: integer('priority').default(0).notNull(),
  lastTestAt: timestamp('lastTestAt'),
  lastTestResult: boolean('lastTestResult'),
  lastTestResponseTime: integer('lastTestResponseTime'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  index('VideoSource_enabled_idx').on(table.enabled),
  index('VideoSource_priority_idx').on(table.priority),
  index('VideoSource_category_idx').on(table.category),
]);

// ============================================
// Coin System Tables (Requirements 1.1, 2.1, 4.1, 5.1)
// ============================================

export const userCoinBalances = pgTable('UserCoinBalance', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().unique(),
  balance: integer('balance').default(0).notNull(),
  totalEarned: integer('totalEarned').default(0).notNull(),
  totalSpent: integer('totalSpent').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  index('UserCoinBalance_userId_idx').on(table.userId),
]);

export const coinTransactions = pgTable('CoinTransaction', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  type: transactionTypeEnum('type').notNull(),
  amount: integer('amount').notNull(),
  balanceAfter: integer('balanceAfter').notNull(),
  description: text('description').default('').notNull(),
  metadata: json('metadata').default({}).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => [
  index('CoinTransaction_userId_idx').on(table.userId),
  index('CoinTransaction_type_idx').on(table.type),
  index('CoinTransaction_createdAt_idx').on(table.createdAt),
]);

export const coinConfigs = pgTable('CoinConfig', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: json('value').notNull(),
  description: text('description').default('').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  updatedBy: text('updatedBy'),
}, (table) => [
  index('CoinConfig_key_idx').on(table.key),
]);

// ============================================
// Site Settings Table (Global site configuration)
// ============================================

export const siteSettings = pgTable('SiteSettings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description').default('').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  updatedBy: text('updatedBy'),
}, (table) => [
  index('SiteSettings_key_idx').on(table.key),
]);

export const userCheckins = pgTable('UserCheckin', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  checkinDate: timestamp('checkinDate').notNull(),
  streakCount: integer('streakCount').default(1).notNull(),
  coinsEarned: integer('coinsEarned').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('UserCheckin_userId_checkinDate_key').on(table.userId, table.checkinDate),
  index('UserCheckin_userId_idx').on(table.userId),
  index('UserCheckin_checkinDate_idx').on(table.checkinDate),
]);

// ============================================
// Content Paywall Tables (Requirements 4.2, 5.1)
// ============================================

export const contentAccess = pgTable('ContentAccess', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  vodId: integer('vodId').notNull(),
  episodeIndex: integer('episodeIndex').default(-1).notNull(),
  sourceCategory: sourceCategoryEnum('sourceCategory').default('normal').notNull(),
  unlockType: unlockTypeEnum('unlockType').notNull(),
  coinsSpent: integer('coinsSpent').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('ContentAccess_userId_vodId_episodeIndex_key').on(table.userId, table.vodId, table.episodeIndex),
  index('ContentAccess_userId_idx').on(table.userId),
  index('ContentAccess_vodId_idx').on(table.vodId),
  index('ContentAccess_sourceCategory_idx').on(table.sourceCategory),
  index('ContentAccess_createdAt_idx').on(table.createdAt),
]);

// ============================================
// Membership System Tables (Requirements 2.2, 2.4, 7.1, 7.2, 8.2)
// ============================================

export const membershipPlans = pgTable('MembershipPlan', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  memberLevel: memberLevelEnum('memberLevel').notNull(),
  duration: integer('duration').notNull(), // days
  price: integer('price').notNull(), // cents
  coinPrice: integer('coinPrice').notNull(), // coins required
  enabled: boolean('enabled').default(true).notNull(),
  sortOrder: integer('sortOrder').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  index('MembershipPlan_memberLevel_idx').on(table.memberLevel),
  index('MembershipPlan_enabled_idx').on(table.enabled),
  index('MembershipPlan_sortOrder_idx').on(table.sortOrder),
]);



export const paymentQRCodes = pgTable('PaymentQRCode', {
  id: text('id').primaryKey(),
  paymentType: paymentTypeEnum('paymentType').notNull(),
  imageUrl: text('imageUrl').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  index('PaymentQRCode_paymentType_idx').on(table.paymentType),
  index('PaymentQRCode_enabled_idx').on(table.enabled),
]);

export const membershipAdjustLogs = pgTable('MembershipAdjustLog', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  adminId: text('adminId').notNull(),
  previousLevel: memberLevelEnum('previousLevel').notNull(),
  newLevel: memberLevelEnum('newLevel').notNull(),
  previousExpiry: timestamp('previousExpiry'),
  newExpiry: timestamp('newExpiry'),
  reason: text('reason').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => [
  index('MembershipAdjustLog_userId_idx').on(table.userId),
  index('MembershipAdjustLog_adminId_idx').on(table.adminId),
  index('MembershipAdjustLog_createdAt_idx').on(table.createdAt),
]);

// ============================================
// Banner Ad System Tables (Requirements 1.1, 2.1)
// ============================================

export const rotationStrategyEnum = pgEnum('RotationStrategy', ['random', 'sequential']);

export const ads = pgTable('Ad', {
  id: text('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  imageUrl: text('imageUrl').notNull(),
  targetUrl: text('targetUrl').notNull(),
  startDate: timestamp('startDate').notNull(),
  endDate: timestamp('endDate').notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  targetMemberLevels: json('targetMemberLevels').default([]).notNull(), // ['free'] or empty for all
  targetGroupIds: json('targetGroupIds').default([]).notNull(), // group IDs or empty for all
  priority: integer('priority').default(0).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  index('Ad_enabled_idx').on(table.enabled),
  index('Ad_deleted_idx').on(table.deleted),
  index('Ad_startDate_idx').on(table.startDate),
  index('Ad_endDate_idx').on(table.endDate),
  index('Ad_priority_idx').on(table.priority),
]);

export const adSlots = pgTable('AdSlot', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  position: varchar('position', { length: 50 }).notNull(), // 'home_top', 'detail_bottom', etc.
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  rotationStrategy: rotationStrategyEnum('rotationStrategy').default('random').notNull(),
  displayMode: varchar('displayMode', { length: 20 }).default('cover').notNull(), // 'cover' or 'contain'
  maxVisible: integer('maxVisible').default(3).notNull(), // Max ads to show, rest go to carousel
  carouselInterval: integer('carouselInterval').default(5).notNull(), // Carousel interval in seconds
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  index('AdSlot_position_idx').on(table.position),
  index('AdSlot_enabled_idx').on(table.enabled),
]);

export const adSlotAssignments = pgTable('AdSlotAssignment', {
  id: text('id').primaryKey(),
  adId: text('adId').notNull(),
  slotId: text('slotId').notNull(),
  priority: integer('priority').default(0).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('AdSlotAssignment_adId_slotId_key').on(table.adId, table.slotId),
  index('AdSlotAssignment_adId_idx').on(table.adId),
  index('AdSlotAssignment_slotId_idx').on(table.slotId),
  index('AdSlotAssignment_priority_idx').on(table.priority),
]);

export const adImpressions = pgTable('AdImpression', {
  id: text('id').primaryKey(),
  adId: text('adId').notNull(),
  slotId: text('slotId').notNull(),
  userId: text('userId'), // nullable for anonymous users
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => [
  index('AdImpression_adId_idx').on(table.adId),
  index('AdImpression_slotId_idx').on(table.slotId),
  index('AdImpression_userId_idx').on(table.userId),
  index('AdImpression_createdAt_idx').on(table.createdAt),
]);

export const adClicks = pgTable('AdClick', {
  id: text('id').primaryKey(),
  adId: text('adId').notNull(),
  slotId: text('slotId').notNull(),
  userId: text('userId'), // nullable for anonymous users
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => [
  index('AdClick_adId_idx').on(table.adId),
  index('AdClick_slotId_idx').on(table.slotId),
  index('AdClick_userId_idx').on(table.userId),
  index('AdClick_createdAt_idx').on(table.createdAt),
]);

// ============================================
// Table Relations (Task 2.5)
// ============================================

export const usersRelations = relations(users, ({ one, many }) => ({
  group: one(userGroups, {
    fields: [users.groupId],
    references: [userGroups.id],
  }),
  favorites: many(favorites),
  watchHistory: many(watchHistory),
  sessions: many(userSessions),
  coinBalance: one(userCoinBalances),
  coinTransactions: many(coinTransactions),
  checkins: many(userCheckins),
  contentAccess: many(contentAccess),
  membershipOrders: many(membershipOrders),
  membershipAdjustLogs: many(membershipAdjustLogs),
}));

export const userGroupsRelations = relations(userGroups, ({ many }) => ({
  users: many(users),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
}));

export const watchHistoryRelations = relations(watchHistory, ({ one }) => ({
  user: one(users, {
    fields: [watchHistory.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const userCoinBalancesRelations = relations(userCoinBalances, ({ one }) => ({
  user: one(users, {
    fields: [userCoinBalances.userId],
    references: [users.id],
  }),
}));

export const coinTransactionsRelations = relations(coinTransactions, ({ one }) => ({
  user: one(users, {
    fields: [coinTransactions.userId],
    references: [users.id],
  }),
}));

export const userCheckinsRelations = relations(userCheckins, ({ one }) => ({
  user: one(users, {
    fields: [userCheckins.userId],
    references: [users.id],
  }),
}));

export const contentAccessRelations = relations(contentAccess, ({ one }) => ({
  user: one(users, {
    fields: [contentAccess.userId],
    references: [users.id],
  }),
}));

export const membershipPlansRelations = relations(membershipPlans, ({ many }) => ({
  orders: many(membershipOrders),
}));

export const membershipOrdersRelations = relations(membershipOrders, ({ one }) => ({
  user: one(users, {
    fields: [membershipOrders.userId],
    references: [users.id],
  }),
  plan: one(membershipPlans, {
    fields: [membershipOrders.planId],
    references: [membershipPlans.id],
  }),
  reviewer: one(users, {
    fields: [membershipOrders.reviewedBy],
    references: [users.id],
  }),
}));

export const coinOrdersRelations = relations(coinOrders, ({ one }) => ({
  user: one(users, {
    fields: [coinOrders.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [coinOrders.reviewedBy],
    references: [users.id],
  }),
}));

export const paymentQRCodesRelations = relations(paymentQRCodes, () => ({}));

export const membershipAdjustLogsRelations = relations(membershipAdjustLogs, ({ one }) => ({
  user: one(users, {
    fields: [membershipAdjustLogs.userId],
    references: [users.id],
  }),
  admin: one(users, {
    fields: [membershipAdjustLogs.adminId],
    references: [users.id],
  }),
}));

// ============================================
// Banner Ad System Relations
// ============================================

export const adsRelations = relations(ads, ({ many }) => ({
  slotAssignments: many(adSlotAssignments),
  impressions: many(adImpressions),
  clicks: many(adClicks),
}));

export const adSlotsRelations = relations(adSlots, ({ many }) => ({
  assignments: many(adSlotAssignments),
  impressions: many(adImpressions),
  clicks: many(adClicks),
}));

export const adSlotAssignmentsRelations = relations(adSlotAssignments, ({ one }) => ({
  ad: one(ads, {
    fields: [adSlotAssignments.adId],
    references: [ads.id],
  }),
  slot: one(adSlots, {
    fields: [adSlotAssignments.slotId],
    references: [adSlots.id],
  }),
}));

export const adImpressionsRelations = relations(adImpressions, ({ one }) => ({
  ad: one(ads, {
    fields: [adImpressions.adId],
    references: [ads.id],
  }),
  slot: one(adSlots, {
    fields: [adImpressions.slotId],
    references: [adSlots.id],
  }),
  user: one(users, {
    fields: [adImpressions.userId],
    references: [users.id],
  }),
}));

export const adClicksRelations = relations(adClicks, ({ one }) => ({
  ad: one(ads, {
    fields: [adClicks.adId],
    references: [ads.id],
  }),
  slot: one(adSlots, {
    fields: [adClicks.slotId],
    references: [adSlots.id],
  }),
  user: one(users, {
    fields: [adClicks.userId],
    references: [users.id],
  }),
}));

// ============================================
// Agent Commission Report System Tables
// ============================================

export const agentRecordStatusEnum = pgEnum('AgentRecordStatus', ['pending', 'settled']);

export const agentLevels = pgTable('AgentLevel', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),           // 等级名称：新人、一级、二级等
  sortOrder: integer('sortOrder').default(0).notNull(),       // 排序
  recruitRequirement: varchar('recruitRequirement', { length: 100 }).default('').notNull(), // 招代理数量要求描述
  dailyPerformance: integer('dailyPerformance').default(0).notNull(), // 每天业绩要求（元）
  commissionRate: integer('commissionRate').default(1000).notNull(),  // 佣金比例（基点，1000=10%）
  hasBonus: boolean('hasBonus').default(false).notNull(),     // 是否有分红
  bonusRate: integer('bonusRate').default(0).notNull(),       // 分红比例（基点）
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  index('AgentLevel_sortOrder_idx').on(table.sortOrder),
  index('AgentLevel_enabled_idx').on(table.enabled),
]);

export const paymentMethodEnum = pgEnum('PaymentMethod', ['alipay', 'wechat', 'bank', 'kangxun']);

export const agentProfileStatusEnum = pgEnum('AgentProfileStatus', ['pending', 'active', 'rejected', 'disabled']);

export const agentProfiles = pgTable('AgentProfile', {
  userId: text('userId').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  levelId: text('levelId').notNull(),                          // 当前等级ID
  agentCode: varchar('agentCode', { length: 12 }).unique(),    // 代理商专属推广码
  status: agentProfileStatusEnum('status').default('pending').notNull(),
  realName: varchar('realName', { length: 100 }).default('').notNull(),
  contact: varchar('contact', { length: 100 }).default('').notNull(),
  paymentMethod: paymentMethodEnum('paymentMethod'),           // 收款方式
  paymentAccount: text('paymentAccount'),                      // 收款账号
  totalIncome: integer('totalIncome').default(0).notNull(),    // 总收入（分）
  balance: integer('balance').default(0).notNull(),            // 可提现余额（分）
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  index('AgentProfile_status_idx').on(table.status),
  index('AgentProfile_levelId_idx').on(table.levelId),
  uniqueIndex('AgentProfile_agentCode_key').on(table.agentCode),
]);

export const agentRecords = pgTable('AgentRecord', {
  id: text('id').primaryKey(),
  userId: text('userId'),                                      // 关联的用户ID (Nullable for legacy/manual records)
  agentName: varchar('agentName', { length: 100 }).notNull(), // 代理商名称 (Snapshot or manual)
  agentContact: varchar('agentContact', { length: 100 }).default('').notNull(), // 联系方式
  levelId: text('levelId').notNull(),                          // 当前等级ID
  month: varchar('month', { length: 7 }).notNull(),            // 月份 (YYYY-MM)
  recruitCount: integer('recruitCount').default(0).notNull(),  // 本月招代理数量
  dailySales: integer('dailySales').default(0).notNull(),      // 每天业绩（元）
  totalSales: integer('totalSales').default(0).notNull(),      // 月总业绩（元）
  commissionAmount: integer('commissionAmount').default(0).notNull(), // 佣金金额（分）
  bonusAmount: integer('bonusAmount').default(0).notNull(),    // 分红金额（分）
  totalEarnings: integer('totalEarnings').default(0).notNull(), // 总收入（分）
  status: agentRecordStatusEnum('status').default('pending').notNull(),
  note: text('note').default('').notNull(),                    // 备注
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
}, (table) => [
  index('AgentRecord_userId_idx').on(table.userId),
  index('AgentRecord_levelId_idx').on(table.levelId),
  index('AgentRecord_month_idx').on(table.month),
  index('AgentRecord_status_idx').on(table.status),
  index('AgentRecord_agentName_idx').on(table.agentName),
]);

export const settlementRecords = pgTable('SettlementRecord', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),         // 代理商ID
  amount: integer('amount').notNull(),      // 结算金额（分）
  method: paymentMethodEnum('method').notNull(), // 结算方式
  account: text('account').notNull(),       // 结算账号（快照）
  transactionId: text('transactionId'),     // 交易流水号/备注
  note: text('note'),                       // 备注
  settledBy: text('settledBy'),             // 经手人（管理员ID）
  createdAt: timestamp('createdAt').defaultNow().notNull(),
}, (table) => [
  index('SettlementRecord_userId_idx').on(table.userId),
  index('SettlementRecord_createdAt_idx').on(table.createdAt),
]);

// Agent System Relations
export const agentProfilesRelations = relations(agentProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [agentProfiles.userId],
    references: [users.id],
  }),
  level: one(agentLevels, {
    fields: [agentProfiles.levelId],
    references: [agentLevels.id],
  }),
}));

export const agentLevelsRelations = relations(agentLevels, ({ many }) => ({
  records: many(agentRecords),
  profiles: many(agentProfiles),
}));

export const agentRecordsRelations = relations(agentRecords, ({ one }) => ({
  level: one(agentLevels, {
    fields: [agentRecords.levelId],
    references: [agentLevels.id],
  }),
}));

// ============================================
// Type Exports (for type inference)
// ============================================

import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Select types (query results)
export type User = InferSelectModel<typeof users>;
export type UserGroup = InferSelectModel<typeof userGroups>;
export type Favorite = InferSelectModel<typeof favorites>;
export type WatchHistory = InferSelectModel<typeof watchHistory>;
export type UserSession = InferSelectModel<typeof userSessions>;
export type VideoSource = InferSelectModel<typeof videoSources>;
export type UserCoinBalance = InferSelectModel<typeof userCoinBalances>;
export type CoinTransaction = InferSelectModel<typeof coinTransactions>;
export type CoinConfig = InferSelectModel<typeof coinConfigs>;
export type SiteSettings = InferSelectModel<typeof siteSettings>;
export type UserCheckin = InferSelectModel<typeof userCheckins>;
export type ContentAccess = InferSelectModel<typeof contentAccess>;
export type MembershipPlan = InferSelectModel<typeof membershipPlans>;
export type MembershipOrder = InferSelectModel<typeof membershipOrders>;
export type CoinOrder = InferSelectModel<typeof coinOrders>;
export type PaymentQRCode = InferSelectModel<typeof paymentQRCodes>;
export type MembershipAdjustLog = InferSelectModel<typeof membershipAdjustLogs>;

// Insert types (for creating records)
export type NewUser = InferInsertModel<typeof users>;
export type NewUserGroup = InferInsertModel<typeof userGroups>;
export type NewFavorite = InferInsertModel<typeof favorites>;
export type NewWatchHistory = InferInsertModel<typeof watchHistory>;
export type NewUserSession = InferInsertModel<typeof userSessions>;
export type NewVideoSource = InferInsertModel<typeof videoSources>;
export type NewUserCoinBalance = InferInsertModel<typeof userCoinBalances>;
export type NewCoinTransaction = InferInsertModel<typeof coinTransactions>;
export type NewCoinConfig = InferInsertModel<typeof coinConfigs>;
export type NewSiteSettings = InferInsertModel<typeof siteSettings>;
export type NewUserCheckin = InferInsertModel<typeof userCheckins>;
export type NewContentAccess = InferInsertModel<typeof contentAccess>;
export type NewMembershipPlan = InferInsertModel<typeof membershipPlans>;
export type NewMembershipOrder = InferInsertModel<typeof membershipOrders>;
export type NewCoinOrder = InferInsertModel<typeof coinOrders>;
export type NewPaymentQRCode = InferInsertModel<typeof paymentQRCodes>;
export type NewMembershipAdjustLog = InferInsertModel<typeof membershipAdjustLogs>;

// Ad system types
export type Ad = InferSelectModel<typeof ads>;
export type AdSlot = InferSelectModel<typeof adSlots>;
export type AdSlotAssignment = InferSelectModel<typeof adSlotAssignments>;
export type AdImpression = InferSelectModel<typeof adImpressions>;
export type AdClick = InferSelectModel<typeof adClicks>;

export type NewAd = InferInsertModel<typeof ads>;
export type NewAdSlot = InferInsertModel<typeof adSlots>;
export type NewAdSlotAssignment = InferInsertModel<typeof adSlotAssignments>;
export type NewAdImpression = InferInsertModel<typeof adImpressions>;
export type NewAdClick = InferInsertModel<typeof adClicks>;

// Agent system types
// Agent system types
export type AgentLevel = InferSelectModel<typeof agentLevels>;
export type AgentRecord = InferSelectModel<typeof agentRecords>;
export type AgentProfile = InferSelectModel<typeof agentProfiles>;
export type SettlementRecord = InferSelectModel<typeof settlementRecords>;

export type NewAgentLevel = InferInsertModel<typeof agentLevels>;
export type NewAgentRecord = InferInsertModel<typeof agentRecords>;
export type NewAgentProfile = InferInsertModel<typeof agentProfiles>;
export type NewSettlementRecord = InferInsertModel<typeof settlementRecords>;

// Rotation strategy enum values
export type RotationStrategy = 'random' | 'sequential';

// Transaction type enum values
export type TransactionType = 'recharge' | 'checkin' | 'exchange' | 'consume' | 'adjust' | 'promotion';

// Unlock type enum values
export type UnlockType = 'purchase' | 'vip';

// Source category enum values
export type SourceCategory = 'normal' | 'adult';

// Order status enum values
export type OrderStatus = 'pending' | 'paid' | 'approved' | 'rejected';

// Payment type enum values
export type PaymentType = 'wechat' | 'alipay';

// Member level enum values
export type MemberLevel = 'free' | 'vip' | 'svip';

// Export all tables as a collection for backup service
export const allTables = {
  users,
  userGroups,
  userSessions,
  userCoinBalances,
  userCheckins,
  userRoleEnum,
  favorites,
  watchHistory,
  videoSources,
  siteSettings,
  coinConfigs,
  coinTransactions,
  contentAccess,
  membershipPlans,
  membershipOrders,
  membershipAdjustLogs,
  coinOrders,
  paymentQRCodes,
  ads,
  adSlots,
  adSlotAssignments,
  adImpressions,
  adClicks,
  agentLevels,
  agentRecords,
  agentProfiles,
  settlementRecords,
};
