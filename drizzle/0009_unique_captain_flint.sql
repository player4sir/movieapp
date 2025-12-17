CREATE TYPE "public"."AgentRecordStatus" AS ENUM('pending', 'settled');--> statement-breakpoint
CREATE TABLE "AgentLevel" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"recruitRequirement" varchar(100) DEFAULT '' NOT NULL,
	"dailyPerformance" integer DEFAULT 0 NOT NULL,
	"commissionRate" integer DEFAULT 1000 NOT NULL,
	"hasBonus" boolean DEFAULT false NOT NULL,
	"bonusRate" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "AgentRecord" (
	"id" text PRIMARY KEY NOT NULL,
	"agentName" varchar(100) NOT NULL,
	"agentContact" varchar(100) DEFAULT '' NOT NULL,
	"levelId" text NOT NULL,
	"month" varchar(7) NOT NULL,
	"recruitCount" integer DEFAULT 0 NOT NULL,
	"dailySales" integer DEFAULT 0 NOT NULL,
	"totalSales" integer DEFAULT 0 NOT NULL,
	"commissionAmount" integer DEFAULT 0 NOT NULL,
	"bonusAmount" integer DEFAULT 0 NOT NULL,
	"totalEarnings" integer DEFAULT 0 NOT NULL,
	"status" "AgentRecordStatus" DEFAULT 'pending' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AdSlot" ADD COLUMN "displayMode" varchar(20) DEFAULT 'cover' NOT NULL;--> statement-breakpoint
ALTER TABLE "AdSlot" ADD COLUMN "maxVisible" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "AdSlot" ADD COLUMN "carouselInterval" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
CREATE INDEX "AgentLevel_sortOrder_idx" ON "AgentLevel" USING btree ("sortOrder");--> statement-breakpoint
CREATE INDEX "AgentLevel_enabled_idx" ON "AgentLevel" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "AgentRecord_levelId_idx" ON "AgentRecord" USING btree ("levelId");--> statement-breakpoint
CREATE INDEX "AgentRecord_month_idx" ON "AgentRecord" USING btree ("month");--> statement-breakpoint
CREATE INDEX "AgentRecord_status_idx" ON "AgentRecord" USING btree ("status");--> statement-breakpoint
CREATE INDEX "AgentRecord_agentName_idx" ON "AgentRecord" USING btree ("agentName");