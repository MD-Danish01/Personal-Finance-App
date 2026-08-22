import { createRemoteJWKSet, jwtVerify } from "jose";

export function createRequireAuth(config) {
  const jwks = createRemoteJWKSet(new URL(config.jwksUrl));

  return async function requireAuth(req, res, next) {
    const authorization = req.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : null;

    if (!token) {
      return res.status(401).json({ error: "Missing bearer token" });
    }

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: config.jwtIssuer,
        audience: "authenticated",
      });

      if (typeof payload.sub !== "string") {
        return res.status(401).json({ error: "Token has no user id" });
      }

      req.user = {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email : undefined,
      };
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  };
}