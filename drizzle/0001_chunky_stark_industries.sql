CREATE TYPE "public"."TransactionType" AS ENUM('recharge', 'checkin', 'exchange', 'consume', 'adjust');--> statement-breakpoint
CREATE TABLE "CoinConfig" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" json NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"updatedBy" text,
	CONSTRAINT "CoinConfig_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "CoinTransaction" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" "TransactionType" NOT NULL,
	"amount" integer NOT NULL,
	"balanceAfter" integer NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"metadata" json DEFAULT '{}'::json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserCheckin" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"checkinDate" timestamp NOT NULL,
	"streakCount" integer DEFAULT 1 NOT NULL,
	"coinsEarned" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserCoinBalance" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"totalEarned" integer DEFAULT 0 NOT NULL,
	"totalSpent" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "UserCoinBalance_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE INDEX "CoinConfig_key_idx" ON "CoinConfig" USING btree ("key");--> statement-breakpoint
CREATE INDEX "CoinTransaction_userId_idx" ON "CoinTransaction" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "CoinTransaction_type_idx" ON "CoinTransaction" USING btree ("type");--> statement-breakpoint
CREATE INDEX "CoinTransaction_createdAt_idx" ON "CoinTransaction" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "UserCheckin_userId_checkinDate_key" ON "UserCheckin" USING btree ("userId","checkinDate");--> statement-breakpoint
CREATE INDEX "UserCheckin_userId_idx" ON "UserCheckin" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserCheckin_checkinDate_idx" ON "UserCheckin" USING btree ("checkinDate");--> statement-breakpoint
CREATE INDEX "UserCoinBalance_userId_idx" ON "UserCoinBalance" USING btree ("userId");