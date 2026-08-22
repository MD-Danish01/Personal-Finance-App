import { jwtVerify } from "jose";

export function createRequireAuth(config) {
  const secret = new TextEncoder().encode(config.authSecret);

  return async function requireAuth(req, res, next) {
    const authorization = req.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!token) {
      return res.status(401).json({ error: "Missing bearer token" });
    }

    try {
      const { payload } = await jwtVerify(token, secret);

      if (typeof payload.sub !== "string") {
        return res.status(401).json({ error: "Token has no user id" });
      }

      req.user = {
        id: payload.sub,
        email:
          typeof payload.email === "string" ? payload.email : undefined,
        name:
          typeof payload.name === "string" ? payload.name : undefined,
      };
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}