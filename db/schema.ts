import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  discordId: text("discord_id").primaryKey(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  tokens: integer("tokens").notNull().default(0),
  fragments: integer("fragments").notNull().default(0),
  packCount: integer("pack_count").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const siteRegistrations = sqliteTable('site_registrations', {
 id: integer('id').primaryKey({autoIncrement:true}),
 userId: text('user_id').notNull().unique(),
 createdAt: integer('created_at').notNull(),
});
export const siteVisitors = sqliteTable('site_visitors',{visitorId:text('visitor_id').primaryKey(),firstSeenAt:integer('first_seen_at').notNull(),lastSeenAt:integer('last_seen_at').notNull(),visits:integer('visits').notNull().default(1)});
export const maintenanceRewards=sqliteTable('maintenance_rewards',{cycleId:text('cycle_id').notNull(),claimant:text('claimant').notNull(),codeId:text('code_id').notNull(),createdAt:integer('created_at').notNull()},t=>[primaryKey({columns:[t.cycleId,t.claimant]}),uniqueIndex('idx_maintenance_rewards_code').on(t.codeId)]);

export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.discordId, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_expires_at").on(table.expiresAt),
  ],
);

export const linkCodes = sqliteTable(
  "link_codes",
  {
    codeHash: text("code_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.discordId, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    usedAt: integer("used_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("idx_link_codes_user_id").on(table.userId),
    index("idx_link_codes_expires_at").on(table.expiresAt),
  ],
);

export const userCards = sqliteTable(
  "user_cards",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.discordId, { onDelete: "cascade" }),
    cardSlug: text("card_slug").notNull(),
    count: integer("count").notNull().default(1),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.cardSlug] }),
    index("idx_user_cards_user_id").on(table.userId),
  ],
);

export const referralInvites = sqliteTable(
  "referral_invites",
  {
    inviteCode: text("invite_code").primaryKey(),
    referrerUserId: text("referrer_user_id")
      .notNull()
      .references(() => users.discordId, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_referral_invites_referrer").on(table.referrerUserId)],
);

export const referralInviteRequests = sqliteTable(
  "referral_invite_requests",
  {
    userId: text("user_id").primaryKey().references(() => users.discordId, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    error: text("error"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_referral_invite_requests_status").on(table.status, table.updatedAt)],
);

export const referrals = sqliteTable(
  "referrals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    referrerUserId: text("referrer_user_id")
      .notNull()
      .references(() => users.discordId, { onDelete: "cascade" }),
    referredUserId: text("referred_user_id")
      .notNull()
      .references(() => users.discordId, { onDelete: "cascade" }),
    inviteCode: text("invite_code").notNull(),
    status: text("status").notNull().default("pending"),
    rewardTokens: integer("reward_tokens").notNull().default(1),
    verifyAfter: integer("verify_after").notNull(),
    createdAt: integer("created_at").notNull(),
    verifiedAt: integer("verified_at"),
  },
  (table) => [
    uniqueIndex("idx_referrals_referred_unique").on(table.referredUserId),
    index("idx_referrals_pending").on(table.status, table.verifyAfter),
    index("idx_referrals_referrer").on(table.referrerUserId),
  ],
);

export const siteSettings = sqliteTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const auditLog = sqliteTable(
  "audit_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    targetId: text("target_id"),
    payload: text("payload").notNull().default("{}"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_audit_log_created_at").on(table.createdAt)],
);

export const operations = sqliteTable("operations", {
 id: text("id").primaryKey(), userId: text("user_id").notNull(), action: text("action").notNull(),
 result: text("result").notNull(), valid: integer("valid").notNull(), createdAt: integer("created_at").notNull(),
}, (t)=>[check("operation_valid",sql`${t.valid} = 1`)]);
export const shopOrders = sqliteTable("shop_orders", {
 id: text("id").primaryKey(), userId: text("user_id").notNull(), productId:text("product_id").notNull(),
 name:text("name").notNull(), price:integer("price").notNull(), status:text("status").notNull().default("pending"),createdAt:integer("created_at").notNull(),
});

export const loginLimits=sqliteTable('login_limits',{key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expires:integer('expires').notNull()});
export const userProfiles=sqliteTable('user_profiles',{userId:text('user_id').primaryKey(),nickname:text('nickname').notNull().default(''),bio:text('bio').notNull().default(''),status:text('status').notNull().default('На связи'),avatar:text('avatar').notNull().default('shinigami'),equipped:text('equipped').notNull().default('{}'),showcase:text('showcase').notNull().default('[]')});
export const userCosmetics=sqliteTable('user_cosmetics',{userId:text('user_id').notNull(),itemId:text('item_id').notNull(),createdAt:integer('created_at').notNull()},t=>[primaryKey({columns:[t.userId,t.itemId]})]);
export const prizeClaims=sqliteTable('prize_claims',{orderId:text('order_id').primaryKey(),userId:text('user_id').notNull(),status:text('status').notNull().default('waiting_bot'),ticketId:text('ticket_id'),createdAt:integer('created_at').notNull()});

export const cardLocks=sqliteTable('card_locks',{userId:text('user_id').notNull(),cardSlug:text('card_slug').notNull()},t=>[primaryKey({columns:[t.userId,t.cardSlug]})]);
export const collectionClaims=sqliteTable('collection_claims',{userId:text('user_id').notNull(),setId:text('set_id').notNull(),reward:text('reward').notNull(),createdAt:integer('created_at').notNull()},t=>[primaryKey({columns:[t.userId,t.setId]})]);
export const eventEntries=sqliteTable('event_entries',{id:text('id').primaryKey(),userId:text('user_id').notNull(),scope:text('scope').notNull(),eventId:text('event_id').notNull(),evidence:text('evidence').notNull(),status:text('status').notNull().default('pending'),reward:integer('reward').notNull(),createdAt:integer('created_at').notNull()},t=>[uniqueIndex('idx_event_user_once').on(t.userId,t.eventId),index('idx_event_scope_status').on(t.scope,t.status)]);

export const profileExtras=sqliteTable('profile_extras',{userId:text('user_id').primaryKey(),wishlist:text('wishlist').notNull().default('[]'),presets:text('presets').notNull().default('[]')});

export const rewardCodes=sqliteTable('reward_codes',{id:text('id').primaryKey(),code:text('code').notNull(),scope:text('scope').notNull(),kind:text('kind').notNull(),rewardType:text('reward_type').notNull().default('coupons'),rewardItem:text('reward_item').notNull().default(''),rewardAmount:integer('reward_amount').notNull().default(0),coupons:integer('coupons').notNull(),maxUses:integer('max_uses').notNull(),uses:integer('uses').notNull().default(0),active:integer('active').notNull().default(1),creator:text('creator').notNull(),note:text('note').notNull().default(''),createdAt:integer('created_at').notNull()},t=>[uniqueIndex('idx_reward_code_scope').on(t.scope,t.code)]);
export const codeRedemptions=sqliteTable('code_redemptions',{codeId:text('code_id').notNull(),userId:text('user_id').notNull(),coupons:integer('coupons').notNull(),createdAt:integer('created_at').notNull()},t=>[primaryKey({columns:[t.codeId,t.userId]})]);
