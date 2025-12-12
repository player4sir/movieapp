CREATE TYPE "public"."MemberLevel" AS ENUM('free', 'vip', 'svip');--> statement-breakpoint
CREATE TYPE "public"."SourceCategory" AS ENUM('normal', 'adult');--> statement-breakpoint
CREATE TYPE "public"."UserRole" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."UserStatus" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TABLE "Favorite" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"vodId" integer NOT NULL,
	"vodName" text NOT NULL,
	"vodPic" text NOT NULL,
	"typeName" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserGroup" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"color" varchar(7) DEFAULT '#6b7280' NOT NULL,
	"permissions" json DEFAULT '{}'::json NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "UserGroup_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "UserSession" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"refreshToken" text NOT NULL,
	"deviceInfo" text DEFAULT '' NOT NULL,
	"ipAddress" text DEFAULT '' NOT NULL,
	"userAgent" text DEFAULT '' NOT NULL,
	"lastActivityAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	CONSTRAINT "UserSession_refreshToken_unique" UNIQUE("refreshToken")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"passwordHash" text NOT NULL,
	"nickname" text DEFAULT '' NOT NULL,
	"avatar" text DEFAULT '' NOT NULL,
	"role" "UserRole" DEFAULT 'user' NOT NULL,
	"status" "UserStatus" DEFAULT 'active' NOT NULL,
	"memberLevel" "MemberLevel" DEFAULT 'free' NOT NULL,
	"memberExpiry" timestamp,
	"groupId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	"lastLoginAt" timestamp,
	CONSTRAINT "User_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "VideoSource" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "SourceCategory" DEFAULT 'normal' NOT NULL,
	"apiUrl" text NOT NULL,
	"timeout" integer DEFAULT 10000 NOT NULL,
	"retries" integer DEFAULT 3 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"lastTestAt" timestamp,
	"lastTestResult" boolean,
	"lastTestResponseTime" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "WatchHistory" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"vodId" integer NOT NULL,
	"vodName" text NOT NULL,
	"vodPic" text NOT NULL,
	"episodeIndex" integer DEFAULT 0 NOT NULL,
	"episodeName" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"sourceIndex" integer DEFAULT 0 NOT NULL,
	"watchedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "Favorite_userId_vodId_key" ON "Favorite" USING btree ("userId","vodId");--> statement-breakpoint
CREATE INDEX "Favorite_userId_idx" ON "Favorite" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Favorite_vodId_idx" ON "Favorite" USING btree ("vodId");--> statement-breakpoint
CREATE INDEX "UserGroup_name_idx" ON "UserGroup" USING btree ("name");--> statement-breakpoint
CREATE INDEX "UserSession_userId_idx" ON "UserSession" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserSession_refreshToken_idx" ON "UserSession" USING btree ("refreshToken");--> statement-breakpoint
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "User_username_idx" ON "User" USING btree ("username");--> statement-breakpoint
CREATE INDEX "User_status_idx" ON "User" USING btree ("status");--> statement-breakpoint
CREATE INDEX "User_memberLevel_idx" ON "User" USING btree ("memberLevel");--> statement-breakpoint
CREATE INDEX "User_groupId_idx" ON "User" USING btree ("groupId");--> statement-breakpoint
CREATE INDEX "User_createdAt_idx" ON "User" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "VideoSource_enabled_idx" ON "VideoSource" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "VideoSource_priority_idx" ON "VideoSource" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "VideoSource_category_idx" ON "VideoSource" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "WatchHistory_userId_vodId_key" ON "WatchHistory" USING btree ("userId","vodId");--> statement-breakpoint
CREATE INDEX "WatchHistory_userId_idx" ON "WatchHistory" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "WatchHistory_watchedAt_idx" ON "WatchHistory" USING btree ("watchedAt");