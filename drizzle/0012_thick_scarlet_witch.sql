ALTER TABLE "AgentProfile" ADD COLUMN "parentAgentId" text;--> statement-breakpoint
ALTER TABLE "AgentProfile" ADD COLUMN "level1AgentId" text;--> statement-breakpoint
ALTER TABLE "AgentProfile" ADD COLUMN "level2AgentId" text;--> statement-breakpoint
ALTER TABLE "AgentProfile" ADD COLUMN "commissionRate" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "AgentProfile" ADD COLUMN "subAgentRate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "AgentProfile_parentAgentId_idx" ON "AgentProfile" USING btree ("parentAgentId");--> statement-breakpoint
CREATE INDEX "AgentProfile_level1AgentId_idx" ON "AgentProfile" USING btree ("level1AgentId");