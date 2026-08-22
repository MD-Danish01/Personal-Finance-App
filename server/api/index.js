import "dotenv/config";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";

const config = loadEnv();
const app = createApp(config);

export default app;
export const config = { runtime: "nodejs" };