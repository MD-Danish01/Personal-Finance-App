import "dotenv/config";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export function loadEnv() {
  const supabaseUrl = required("SUPABASE_URL");

  return {
    port: Number(process.env.PORT || 5000),
    nodeEnv: process.env.NODE_ENV || "development",
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    supabaseUrl,
    jwtIssuer: process.env.SUPABASE_JWT_ISSUER || `${supabaseUrl}/auth/v1`,
    jwksUrl:
      process.env.SUPABASE_JWKS_URL || `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
  };
}