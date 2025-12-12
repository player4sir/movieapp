ALTER TYPE "public"."TransactionType" ADD VALUE 'promotion';--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "referralCode" varchar(12);--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "referredBy" text;--> statement-breakpoint
CREATE UNIQUE INDEX "User_referralCode_key" ON "User" USING btree ("referralCode");--> statement-breakpoint
CREATE INDEX "User_referredBy_idx" ON "User" USING btree ("referredBy");--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_referralCode_unique" UNIQUE("referralCode");