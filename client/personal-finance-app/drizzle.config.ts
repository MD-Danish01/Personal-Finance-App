import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const runtimeUrl = process.env.DATABASE_URL_POOLED ?? process.env.DATABASE_URL;
if (!runtimeUrl) {
  throw new Error("DATABASE_URL_POOLED or DATABASE_URL is not set");
}

const configuredMigrationUrl = process.env.DATABASE_URL_MIGRATE;
const migrationSource = configuredMigrationUrl?.includes(".pooler.supabase.com")
  ? configuredMigrationUrl
  : runtimeUrl;
const migrationUrl = new URL(migrationSource);
migrationUrl.port = "5432";

export default defineConfig({
  out: "./drizzle",
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl.toString(),
  },
});
