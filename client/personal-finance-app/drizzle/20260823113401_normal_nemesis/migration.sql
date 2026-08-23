DROP INDEX "transactions_setu_id_idx";--> statement-breakpoint
ALTER TABLE "connected_financial_accounts" ADD COLUMN "setu_consent_id" text;--> statement-breakpoint
ALTER TABLE "connected_financial_accounts" ADD COLUMN "setu_link_ref_number" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "setu_account_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "cfa_user_link_ref_idx" ON "connected_financial_accounts" ("user_id","setu_link_ref_number");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_setu_account_transaction_idx" ON "transactions" ("setu_account_id","setu_transaction_id");