import "dotenv/config";

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export function loadEnv() {
  return {
    port: Number(process.env.PORT || 5000),
    nodeEnv: process.env.NODE_ENV || "development",
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    authSecret: required("AUTH_SECRET"),
  };
}