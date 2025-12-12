/**
 * Database Seed Script
 * Creates default admin account, paywall configuration, and membership plans
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import * as schema from '../src/db/schema';

const { users, coinConfigs, membershipPlans, adSlots } = schema;
const SALT_ROUNDS = 10;

// Default admin credentials - CHANGE THESE IN PRODUCTION!
const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'admin123456',
  nickname: '系统管理员',
};

// Default membership plans (Requirements 1.4, 7.1)
// Prices in cents (分), coinPrice in coins
const DEFAULT_MEMBERSHIP_PLANS = [
  // VIP Plans
  { name: 'VIP月卡', memberLevel: 'vip' as const, duration: 30, price: 1500, coinPrice: 150, sortOrder: 1 },
  { name: 'VIP季卡', memberLevel: 'vip' as const, duration: 90, price: 3800, coinPrice: 380, sortOrder: 2 },
  { name: 'VIP半年卡', memberLevel: 'vip' as const, duration: 180, price: 6800, coinPrice: 680, sortOrder: 3 },
  { name: 'VIP年卡', memberLevel: 'vip' as const, duration: 365, price: 9800, coinPrice: 980, sortOrder: 4 },
  // SVIP Plans
  { name: 'SVIP月卡', memberLevel: 'svip' as const, duration: 30, price: 2500, coinPrice: 250, sortOrder: 5 },
  { name: 'SVIP季卡', memberLevel: 'svip' as const, duration: 90, price: 6500, coinPrice: 650, sortOrder: 6 },
  { name: 'SVIP半年卡', memberLevel: 'svip' as const, duration: 180, price: 11800, coinPrice: 1180, sortOrder: 7 },
  { name: 'SVIP年卡', memberLevel: 'svip' as const, duration: 365, price: 16800, coinPrice: 1680, sortOrder: 8 },
];

// Default ad slots configuration
const DEFAULT_AD_SLOTS = [
  { name: '开屏广告', position: 'splash', width: 1080, height: 1920, rotationStrategy: 'random' as const, sortOrder: 0 },
  { name: '首页顶部', position: 'home_top', width: 728, height: 90, rotationStrategy: 'random' as const, sortOrder: 1 },
  { name: '详情页底部', position: 'detail_bottom', width: 728, height: 90, rotationStrategy: 'random' as const, sortOrder: 2 },
  { name: '搜索页顶部', position: 'search_top', width: 728, height: 90, rotationStrategy: 'random' as const, sortOrder: 3 },
  { name: '成人页顶部', position: 'adult_top', width: 728, height: 90, rotationStrategy: 'random' as const, sortOrder: 4 },
  { name: '播放页底部', position: 'play_bottom', width: 728, height: 90, rotationStrategy: 'random' as const, sortOrder: 5 },
  { name: '个人中心底部', position: 'profile_bottom', width: 728, height: 90, rotationStrategy: 'random' as const, sortOrder: 6 },
];

// Default paywall configuration (Requirements 1.2, 1.3, 1.4)
const PAYWALL_CONFIGS = [
  {
    key: 'paywall_normal_price',
    value: 1,
    description: '普通内容每集价格（金币）',
  },
  {
    key: 'paywall_adult_price',
    value: 10,
    description: '成人内容每集价格（金币）',
  },
  {
    key: 'paywall_preview_duration',
    value: 180,
    description: '试看时长（秒）',
  },
  {
    key: 'paywall_enabled',
    value: true,
    description: '付费墙功能开关',
  },
];

function generateId(): string {
  return crypto.randomUUID();
}

async function main() {
  // Create connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Create Drizzle client
  const db = drizzle(pool, { schema });

  console.log('🌱 Starting database seed...');

  try {
    // Check if admin already exists
    const existingAdmin = await db.query.users?.findFirst({
      where: eq(users.role, 'admin'),
    });

    if (existingAdmin) {
      console.log('✅ Admin account already exists:', existingAdmin.username);
      // Still seed paywall config, membership plans, and ad slots even if admin exists
      await seedPaywallConfig(db);
      await seedMembershipPlans(db);
      await seedAdSlots(db);
      return;
    }

    // Create default admin
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, SALT_ROUNDS);

    const [admin] = await db.insert(users).values({
      id: generateId(),
      username: DEFAULT_ADMIN.username,
      passwordHash,
      nickname: DEFAULT_ADMIN.nickname,
      role: 'admin',
      status: 'active',
      memberLevel: 'svip',
      updatedAt: new Date(),
    }).returning();

    console.log('✅ Default admin account created:');
    console.log(`   Username: ${DEFAULT_ADMIN.username}`);
    console.log(`   Password: ${DEFAULT_ADMIN.password}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Change the default password after first login!');

    // Seed paywall configuration
    await seedPaywallConfig(db);

    // Seed membership plans
    await seedMembershipPlans(db);

    // Seed ad slots
    await seedAdSlots(db);
  } finally {
    await pool.end();
  }
}

async function seedPaywallConfig(db: ReturnType<typeof drizzle<typeof schema>>) {
  console.log('');
  console.log('🔧 Seeding paywall configuration...');

  for (const config of PAYWALL_CONFIGS) {
    // Check if config already exists
    const existing = await db.select()
      .from(coinConfigs)
      .where(eq(coinConfigs.key, config.key))
      .limit(1);

    if (existing.length > 0) {
      console.log(`   ⏭️  ${config.key} already exists, skipping`);
      continue;
    }

    // Create config
    await db.insert(coinConfigs).values({
      id: generateId(),
      key: config.key,
      value: config.value,
      description: config.description,
      updatedAt: new Date(),
    });

    console.log(`   ✅ ${config.key} = ${JSON.stringify(config.value)}`);
  }

  console.log('✅ Paywall configuration seeded');
}

async function seedMembershipPlans(db: ReturnType<typeof drizzle<typeof schema>>) {
  console.log('');
  console.log('🎫 Seeding membership plans...');

  for (const plan of DEFAULT_MEMBERSHIP_PLANS) {
    // Check if plan already exists by name and memberLevel
    const existing = await db.select()
      .from(membershipPlans)
      .where(eq(membershipPlans.name, plan.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(`   ⏭️  ${plan.name} already exists, skipping`);
      continue;
    }

    // Create plan
    await db.insert(membershipPlans).values({
      id: generateId(),
      name: plan.name,
      memberLevel: plan.memberLevel,
      duration: plan.duration,
      price: plan.price,
      coinPrice: plan.coinPrice,
      enabled: true,
      sortOrder: plan.sortOrder,
      updatedAt: new Date(),
    });

    console.log(`   ✅ ${plan.name} (${plan.duration}天, ¥${(plan.price / 100).toFixed(2)}, ${plan.coinPrice}金币)`);
  }

  console.log('✅ Membership plans seeded');
}

async function seedAdSlots(db: ReturnType<typeof drizzle<typeof schema>>) {
  console.log('');
  console.log('📺 Seeding ad slots...');

  for (const slot of DEFAULT_AD_SLOTS) {
    // Check if slot already exists by position
    const existing = await db.select()
      .from(adSlots)
      .where(eq(adSlots.position, slot.position))
      .limit(1);

    if (existing.length > 0) {
      console.log(`   ⏭️  ${slot.name} (${slot.position}) already exists, skipping`);
      continue;
    }

    // Create slot
    await db.insert(adSlots).values({
      id: generateId(),
      name: slot.name,
      position: slot.position,
      width: slot.width,
      height: slot.height,
      rotationStrategy: slot.rotationStrategy,
      enabled: true,
      updatedAt: new Date(),
    });

    console.log(`   ✅ ${slot.name} (${slot.position}, ${slot.width}x${slot.height})`);
  }

  console.log('✅ Ad slots seeded');
}

main().catch((e) => {
  console.error('❌ Seed failed:', e);
  process.exit(1);
});
