CREATE TYPE "public"."OrderStatus" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."PaymentType" AS ENUM('wechat', 'alipay');--> statement-breakpoint
CREATE TABLE "MembershipAdjustLog" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"adminId" text NOT NULL,
	"previousLevel" "MemberLevel" NOT NULL,
	"newLevel" "MemberLevel" NOT NULL,
	"previousExpiry" timestamp,
	"newExpiry" timestamp,
	"reason" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MembershipOrder" (
	"id" text PRIMARY KEY NOT NULL,
	"orderNo" varchar(32) NOT NULL,
	"userId" text NOT NULL,
	"planId" text NOT NULL,
	"memberLevel" "MemberLevel" NOT NULL,
	"duration" integer NOT NULL,
	"price" integer NOT NULL,
	"status" "OrderStatus" DEFAULT 'pending' NOT NULL,
	"paymentType" "PaymentType",
	"paymentScreenshot" text,
	"transactionNote" text,
	"reviewedBy" text,
	"reviewedAt" timestamp,
	"rejectReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "MembershipOrder_orderNo_unique" UNIQUE("orderNo")
);
--> statement-breakpoint
CREATE TABLE "MembershipPlan" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"memberLevel" "MemberLevel" NOT NULL,
	"duration" integer NOT NULL,
	"price" integer NOT NULL,
	"coinPrice" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PaymentQRCode" (
	"id" text PRIMARY KEY NOT NULL,
	"paymentType" "PaymentType" NOT NULL,
	"imageUrl" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "MembershipAdjustLog_userId_idx" ON "MembershipAdjustLog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "MembershipAdjustLog_adminId_idx" ON "MembershipAdjustLog" USING btree ("adminId");--> statement-breakpoint
CREATE INDEX "MembershipAdjustLog_createdAt_idx" ON "MembershipAdjustLog" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "MembershipOrder_orderNo_key" ON "MembershipOrder" USING btree ("orderNo");--> statement-breakpoint
CREATE INDEX "MembershipOrder_userId_idx" ON "MembershipOrder" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "MembershipOrder_planId_idx" ON "MembershipOrder" USING btree ("planId");--> statement-breakpoint
CREATE INDEX "MembershipOrder_status_idx" ON "MembershipOrder" USING btree ("status");--> statement-breakpoint
CREATE INDEX "MembershipOrder_createdAt_idx" ON "MembershipOrder" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "MembershipPlan_memberLevel_idx" ON "MembershipPlan" USING btree ("memberLevel");--> statement-breakpoint
CREATE INDEX "MembershipPlan_enabled_idx" ON "MembershipPlan" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "MembershipPlan_sortOrder_idx" ON "MembershipPlan" USING btree ("sortOrder");--> statement-breakpoint
CREATE INDEX "PaymentQRCode_paymentType_idx" ON "PaymentQRCode" USING btree ("paymentType");--> statement-breakpoint
CREATE INDEX "PaymentQRCode_enabled_idx" ON "PaymentQRCode" USING btree ("enabled");