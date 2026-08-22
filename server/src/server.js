import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const app = createApp(env);

export default app;
export const config = { runtime: "nodejs" };