CREATE TABLE "SiteSettings" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"updatedBy" text,
	CONSTRAINT "SiteSettings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX "SiteSettings_key_idx" ON "SiteSettings" USING btree ("key");