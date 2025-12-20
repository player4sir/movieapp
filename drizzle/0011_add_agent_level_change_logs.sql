CREATE TABLE "AgentLevelChangeLog" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"previousLevelId" text,
	"previousLevelName" varchar(50),
	"newLevelId" text NOT NULL,
	"newLevelName" varchar(50) NOT NULL,
	"changeType" varchar(20) NOT NULL,
	"changedBy" text,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "AgentLevelChangeLog_userId_idx" ON "AgentLevelChangeLog" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "AgentLevelChangeLog_createdAt_idx" ON "AgentLevelChangeLog" USING btree ("createdAt");