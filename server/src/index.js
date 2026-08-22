import "dotenv/config";

import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const config = loadEnv();
const app = createApp(config);

app.listen(config.port, () => {
  console.log(`Personal finance API listening on port ${config.port}`);
});