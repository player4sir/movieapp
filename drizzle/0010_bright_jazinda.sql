CREATE TYPE "public"."AgentProfileStatus" AS ENUM('pending', 'active', 'rejected', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."PaymentMethod" AS ENUM('alipay', 'wechat', 'bank', 'kangxun');--> statement-breakpoint
CREATE TABLE "AgentProfile" (
	"userId" text PRIMARY KEY NOT NULL,
	"levelId" text NOT NULL,
	"agentCode" varchar(12),
	"status" "AgentProfileStatus" DEFAULT 'pending' NOT NULL,
	"realName" varchar(100) DEFAULT '' NOT NULL,
	"contact" varchar(100) DEFAULT '' NOT NULL,
	"paymentMethod" "PaymentMethod",
	"paymentAccount" text,
	"totalIncome" integer DEFAULT 0 NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "AgentProfile_agentCode_unique" UNIQUE("agentCode")
);
--> statement-breakpoint
CREATE TABLE "SettlementRecord" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"amount" integer NOT NULL,
	"method" "PaymentMethod" NOT NULL,
	"account" text NOT NULL,
	"transactionId" text,
	"note" text,
	"settledBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "AgentRecord" ADD COLUMN "userId" text;--> statement-breakpoint
ALTER TABLE "CoinOrder" ADD COLUMN "agentId" text;--> statement-breakpoint
ALTER TABLE "MembershipOrder" ADD COLUMN "agentId" text;--> statement-breakpoint
ALTER TABLE "AgentProfile" ADD CONSTRAINT "AgentProfile_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "AgentProfile_status_idx" ON "AgentProfile" USING btree ("status");--> statement-breakpoint
CREATE INDEX "AgentProfile_levelId_idx" ON "AgentProfile" USING btree ("levelId");--> statement-breakpoint
CREATE UNIQUE INDEX "AgentProfile_agentCode_key" ON "AgentProfile" USING btree ("agentCode");--> statement-breakpoint
CREATE INDEX "SettlementRecord_userId_idx" ON "SettlementRecord" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "SettlementRecord_createdAt_idx" ON "SettlementRecord" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "AgentRecord_userId_idx" ON "AgentRecord" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "CoinOrder_agentId_idx" ON "CoinOrder" USING btree ("agentId");--> statement-breakpoint
CREATE INDEX "MembershipOrder_agentId_idx" ON "MembershipOrder" USING btree ("agentId");