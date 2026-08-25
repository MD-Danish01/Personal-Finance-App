import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// Serverless-safe singleton: Next.js dev hot-reloads modules, so cache the
// client on globalThis to avoid exhausting Postgres connections.
const globalForDb = globalThis as unknown as {
  __pgClient?: postgres.Sql;
};

function createClient(): postgres.Sql {
  const connectionString =
    process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;

  // If no URL is provided (e.g. during `next build` static analysis before
  // env vars are injected), fall back to a placeholder.  postgres-js opens
  // connections lazily — nothing actually connects until a query runs, so
  // the build completes safely and real queries still work at runtime.
  if (!connectionString) {
    console.warn(
      "[db] DATABASE_URL_POOLED / DATABASE_URL not set — using placeholder for build-time evaluation.",
    );
    return postgres("postgresql://postgres:postgres@localhost:5432/postgres", {
      prepare: false,
    });
  }

  // Guard against a secret that is set but is not a valid URL
  // (e.g. DSN format, unencoded special chars).  Again, no real connection
  // is opened here, so the placeholder only matters at query time.
  try {
    new URL(connectionString); // throws if not a valid URL
  } catch {
    console.warn(
      "[db] DATABASE_URL_POOLED / DATABASE_URL is not a valid URL — using placeholder for build-time evaluation.",
    );
    return postgres("postgresql://postgres:postgres@localhost:5432/postgres", {
      prepare: false,
    });
  }

  // prepare: false is required for Supabase "Transaction" pool mode (pgbouncer)
  return postgres(connectionString, { prepare: false });
}

const client = globalForDb.__pgClient ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle({ client, schema });
export { schema };
