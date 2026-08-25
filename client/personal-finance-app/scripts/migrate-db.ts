import "dotenv/config";
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!url) {
    console.error("No DATABASE_URL found");
    process.exit(1);
  }

  console.log("Connecting to PostgreSQL...");
  const sql = postgres(url, { max: 1 });

  try {
    console.log("Applying column additions to financial_profiles...");

    await sql`
      ALTER TABLE financial_profiles 
      ADD COLUMN IF NOT EXISTS theme_color text NOT NULL DEFAULT 'emerald',
      ADD COLUMN IF NOT EXISTS theme_mode text NOT NULL DEFAULT 'system',
      ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
    `;

    console.log("Creating limits table if not exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS limits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        category text NOT NULL,
        monthly_limit integer NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `;

    console.log("Creating emergency_funds table if not exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS emergency_funds (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
        target_amount integer NOT NULL,
        current_amount integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `;

    console.log("Creating goal_contributions table if not exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS goal_contributions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
        amount integer NOT NULL,
        note text,
        contributed_at timestamptz NOT NULL DEFAULT now()
      );
    `;

    console.log("Creating connected_financial_accounts table if not exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS connected_financial_accounts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        fip_id text NOT NULL,
        fip_name text NOT NULL,
        masked_account_number text,
        account_type text NOT NULL DEFAULT 'DEPOSIT',
        linked_at timestamptz NOT NULL DEFAULT now()
      );
    `;

    console.log("Creating setu_consents table if not exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS setu_consents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        consent_id text NOT NULL UNIQUE,
        status text NOT NULL DEFAULT 'PENDING',
        consent_url text,
        data_range_from timestamptz,
        data_range_to timestamptz,
        consent_expiry timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `;

    console.log("Creating setu_data_sessions table if not exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS setu_data_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        consent_id text NOT NULL REFERENCES setu_consents(consent_id) ON DELETE CASCADE,
        session_id text NOT NULL UNIQUE,
        status text NOT NULL DEFAULT 'PENDING',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `;

    console.log("Creating setu_webhook_events table if not exists...");
    await sql`
      CREATE TABLE IF NOT EXISTS setu_webhook_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id text UNIQUE,
        event_type text NOT NULL,
        payload jsonb NOT NULL,
        processed boolean NOT NULL DEFAULT false,
        received_at timestamptz NOT NULL DEFAULT now()
      );
    `;

    console.log("✅ Database schema migration completed successfully!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await sql.end();
  }
}

main();
