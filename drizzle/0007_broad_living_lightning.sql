ALTER TYPE "public"."OrderStatus" ADD VALUE 'paid' BEFORE 'approved';--> statement-breakpoint
CREATE TABLE "CoinOrder" (
	"id" text PRIMARY KEY NOT NULL,
	"orderNo" varchar(32) NOT NULL,
	"userId" text NOT NULL,
	"amount" integer NOT NULL,
	"price" integer NOT NULL,
	"status" "OrderStatus" DEFAULT 'pending' NOT NULL,
	"paymentType" "PaymentType",
	"paymentScreenshot" text,
	"transactionNote" text,
	"remarkCode" varchar(6),
	"reviewedBy" text,
	"reviewedAt" timestamp,
	"rejectReason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "CoinOrder_orderNo_unique" UNIQUE("orderNo")
);
--> statement-breakpoint
DROP INDEX "WatchHistory_userId_vodId_key";--> statement-breakpoint
ALTER TABLE "MembershipOrder" ADD COLUMN "remarkCode" varchar(6);--> statement-breakpoint
ALTER TABLE "WatchHistory" ADD COLUMN "sourceCategory" "SourceCategory" DEFAULT 'normal' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "CoinOrder_orderNo_key" ON "CoinOrder" USING btree ("orderNo");--> statement-breakpoint
CREATE INDEX "CoinOrder_userId_idx" ON "CoinOrder" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "CoinOrder_status_idx" ON "CoinOrder" USING btree ("status");--> statement-breakpoint
CREATE INDEX "CoinOrder_createdAt_idx" ON "CoinOrder" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "WatchHistory_userId_vodId_sourceCategory_key" ON "WatchHistory" USING btree ("userId","vodId","sourceCategory");--> statement-breakpoint
CREATE INDEX "WatchHistory_sourceCategory_idx" ON "WatchHistory" USING btree ("sourceCategory");