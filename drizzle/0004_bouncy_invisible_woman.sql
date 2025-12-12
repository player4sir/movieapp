CREATE TYPE "public"."RotationStrategy" AS ENUM('random', 'sequential');--> statement-breakpoint
CREATE TABLE "AdClick" (
	"id" text PRIMARY KEY NOT NULL,
	"adId" text NOT NULL,
	"slotId" text NOT NULL,
	"userId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AdImpression" (
	"id" text PRIMARY KEY NOT NULL,
	"adId" text NOT NULL,
	"slotId" text NOT NULL,
	"userId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AdSlotAssignment" (
	"id" text PRIMARY KEY NOT NULL,
	"adId" text NOT NULL,
	"slotId" text NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AdSlot" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"position" varchar(50) NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"rotationStrategy" "RotationStrategy" DEFAULT 'random' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Ad" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"imageUrl" text NOT NULL,
	"targetUrl" text NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"targetMemberLevels" json DEFAULT '[]'::json NOT NULL,
	"targetGroupIds" json DEFAULT '[]'::json NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "AdClick_adId_idx" ON "AdClick" USING btree ("adId");--> statement-breakpoint
CREATE INDEX "AdClick_slotId_idx" ON "AdClick" USING btree ("slotId");--> statement-breakpoint
CREATE INDEX "AdClick_userId_idx" ON "AdClick" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AdClick_createdAt_idx" ON "AdClick" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "AdImpression_adId_idx" ON "AdImpression" USING btree ("adId");--> statement-breakpoint
CREATE INDEX "AdImpression_slotId_idx" ON "AdImpression" USING btree ("slotId");--> statement-breakpoint
CREATE INDEX "AdImpression_userId_idx" ON "AdImpression" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AdImpression_createdAt_idx" ON "AdImpression" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "AdSlotAssignment_adId_slotId_key" ON "AdSlotAssignment" USING btree ("adId","slotId");--> statement-breakpoint
CREATE INDEX "AdSlotAssignment_adId_idx" ON "AdSlotAssignment" USING btree ("adId");--> statement-breakpoint
CREATE INDEX "AdSlotAssignment_slotId_idx" ON "AdSlotAssignment" USING btree ("slotId");--> statement-breakpoint
CREATE INDEX "AdSlotAssignment_priority_idx" ON "AdSlotAssignment" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "AdSlot_position_idx" ON "AdSlot" USING btree ("position");--> statement-breakpoint
CREATE INDEX "AdSlot_enabled_idx" ON "AdSlot" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "Ad_enabled_idx" ON "Ad" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "Ad_deleted_idx" ON "Ad" USING btree ("deleted");--> statement-breakpoint
CREATE INDEX "Ad_startDate_idx" ON "Ad" USING btree ("startDate");--> statement-breakpoint
CREATE INDEX "Ad_endDate_idx" ON "Ad" USING btree ("endDate");--> statement-breakpoint
CREATE INDEX "Ad_priority_idx" ON "Ad" USING btree ("priority");