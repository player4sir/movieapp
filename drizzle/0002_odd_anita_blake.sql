CREATE TYPE "public"."UnlockType" AS ENUM('purchase', 'vip');--> statement-breakpoint
CREATE TABLE "ContentAccess" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"vodId" integer NOT NULL,
	"episodeIndex" integer DEFAULT -1 NOT NULL,
	"sourceCategory" "SourceCategory" DEFAULT 'normal' NOT NULL,
	"unlockType" "UnlockType" NOT NULL,
	"coinsSpent" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "ContentAccess_userId_vodId_episodeIndex_key" ON "ContentAccess" USING btree ("userId","vodId","episodeIndex");--> statement-breakpoint
CREATE INDEX "ContentAccess_userId_idx" ON "ContentAccess" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "ContentAccess_vodId_idx" ON "ContentAccess" USING btree ("vodId");--> statement-breakpoint
CREATE INDEX "ContentAccess_sourceCategory_idx" ON "ContentAccess" USING btree ("sourceCategory");--> statement-breakpoint
CREATE INDEX "ContentAccess_createdAt_idx" ON "ContentAccess" USING btree ("createdAt");