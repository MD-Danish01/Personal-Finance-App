CREATE TYPE "allocation_key" AS ENUM('essentials', 'enjoyment', 'emergency', 'future_savings', 'long_term_wealth', 'buffer');--> statement-breakpoint
CREATE TYPE "consent_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "data_session_status" AS ENUM('PENDING', 'COMPLETED', 'EXPIRED', 'FAILED');--> statement-breakpoint
CREATE TYPE "goal_status" AS ENUM('on_track', 'at_risk', 'completed');--> statement-breakpoint
CREATE TYPE "insight_tone" AS ENUM('positive', 'warning', 'info');--> statement-breakpoint
CREATE TYPE "plan_status" AS ENUM('draft', 'recommended', 'active');--> statement-breakpoint
CREATE TYPE "transaction_category" AS ENUM('Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Others');--> statement-breakpoint
CREATE TYPE "transaction_source" AS ENUM('MANUAL', 'ACCOUNT_AGGREGATOR');--> statement-breakpoint
CREATE TYPE "transaction_type" AS ENUM('expense', 'income');--> statement-breakpoint
CREATE TABLE "connected_financial_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"fip_id" text NOT NULL,
	"fip_name" text NOT NULL,
	"masked_account_number" text,
	"account_type" text DEFAULT 'DEPOSIT' NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_funds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL UNIQUE,
	"target_amount" integer NOT NULL,
	"current_amount" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL UNIQUE,
	"monthly_income" integer NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"essentials_percent" integer DEFAULT 50 NOT NULL,
	"savings_percent" integer DEFAULT 20 NOT NULL,
	"enjoyment_percent" integer DEFAULT 20 NOT NULL,
	"buffer_percent" integer DEFAULT 10 NOT NULL,
	"emergency_months_target" integer DEFAULT 6 NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"goal_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"note" text,
	"contributed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"icon" text DEFAULT 'target' NOT NULL,
	"target_amount" integer NOT NULL,
	"current_amount" integer DEFAULT 0 NOT NULL,
	"deadline" date,
	"monthly_target" integer DEFAULT 0 NOT NULL,
	"status" "goal_status" DEFAULT 'on_track'::"goal_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"tone" "insight_tone" DEFAULT 'info'::"insight_tone" NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"category" "transaction_category" NOT NULL,
	"monthly_limit" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"plan_id" uuid NOT NULL,
	"key" "allocation_key" NOT NULL,
	"amount" integer NOT NULL,
	"percent" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"monthly_income" integer NOT NULL,
	"status" "plan_status" DEFAULT 'draft'::"plan_status" NOT NULL,
	"why_this_plan" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setu_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"consent_id" text NOT NULL UNIQUE,
	"status" "consent_status" DEFAULT 'PENDING'::"consent_status" NOT NULL,
	"consent_url" text,
	"purpose_code" text,
	"data_range_from" timestamp with time zone,
	"data_range_to" timestamp with time zone,
	"consent_expiry" timestamp with time zone,
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setu_data_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"consent_id" text NOT NULL,
	"session_id" text NOT NULL UNIQUE,
	"status" "data_session_status" DEFAULT 'PENDING'::"data_session_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setu_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event_id" text NOT NULL UNIQUE,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"processed" boolean DEFAULT false NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" "transaction_type" NOT NULL,
	"category" "transaction_category" NOT NULL,
	"merchant" text DEFAULT '' NOT NULL,
	"description" text,
	"transaction_date" date NOT NULL,
	"source" "transaction_source" DEFAULT 'MANUAL'::"transaction_source" NOT NULL,
	"setu_transaction_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "cfa_user_id_idx" ON "connected_financial_accounts" ("user_id");--> statement-breakpoint
CREATE INDEX "goal_contributions_goal_id_idx" ON "goal_contributions" ("goal_id");--> statement-breakpoint
CREATE INDEX "goals_user_id_idx" ON "goals" ("user_id");--> statement-breakpoint
CREATE INDEX "insights_user_id_idx" ON "insights" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "limits_user_category_idx" ON "limits" ("user_id","category");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" ("user_id","read");--> statement-breakpoint
CREATE INDEX "plan_allocations_plan_id_idx" ON "plan_allocations" ("plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_user_month_year_idx" ON "plans" ("user_id","month","year");--> statement-breakpoint
CREATE INDEX "plans_user_id_idx" ON "plans" ("user_id");--> statement-breakpoint
CREATE INDEX "setu_consents_user_id_idx" ON "setu_consents" ("user_id");--> statement-breakpoint
CREATE INDEX "setu_data_sessions_consent_idx" ON "setu_data_sessions" ("consent_id");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" ("user_id","transaction_date");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_setu_id_idx" ON "transactions" ("setu_transaction_id");--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "plan_allocations" ADD CONSTRAINT "plan_allocations_plan_id_plans_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "setu_data_sessions" ADD CONSTRAINT "setu_data_sessions_consent_id_setu_consents_consent_id_fkey" FOREIGN KEY ("consent_id") REFERENCES "setu_consents"("consent_id");