import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createRequireAuth } from "./auth/require-auth.js";

 function createApp(config) {
  const app = express();
  const requireAuth = createRequireAuth(config);

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "personal-finance-api" });
  });

  app.get("/api/profile", requireAuth, (req, res) => {
    res.json({ id: req.user.id, email: req.user.email ?? null });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

export { createApp };