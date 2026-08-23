CREATE TYPE "financial_bucket" AS ENUM('essentials', 'enjoyment', 'emergency', 'future_savings', 'long_term_wealth', 'buffer', 'unknown');--> statement-breakpoint
CREATE TABLE "emergency_fund_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"emergency_fund_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"note" text,
	"contributed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "financial_bucket" "financial_bucket" DEFAULT 'unknown'::"financial_bucket" NOT NULL;--> statement-breakpoint
CREATE INDEX "emergency_fund_contributions_fund_idx" ON "emergency_fund_contributions" ("emergency_fund_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_one_active_user_idx" ON "plans" ("user_id") WHERE "status" = 'active';--> statement-breakpoint
ALTER TABLE "emergency_fund_contributions" ADD CONSTRAINT "emergency_fund_contributions_n5fdqfttboXg_fkey" FOREIGN KEY ("emergency_fund_id") REFERENCES "emergency_funds"("id") ON DELETE CASCADE;