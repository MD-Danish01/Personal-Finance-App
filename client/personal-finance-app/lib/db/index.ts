import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Serverless-safe singleton: Next.js dev hot-reloads modules, so cache the
// client on globalThis to avoid exhausting Postgres connections.
const globalForDb = globalThis as unknown as {
  __pgClient?: postgres.Sql;
};

function createClient() {
  // Pooled connection (pgbouncer) for runtime queries; direct URL is
  // reserved for Drizzle Kit migrations (see drizzle.config.ts).
  const connectionString =
    process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL_POOLED or DATABASE_URL environment variable is not set",
    );
  }
  // prepare: false is required for Supabase "Transaction" pool mode (pgbouncer)
  return postgres(connectionString, { prepare: false });
}

const client = globalForDb.__pgClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle({ client });
export { schema };
