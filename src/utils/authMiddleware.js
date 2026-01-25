import { env } from "./env.js";

/**
 * Simple shared-token auth.
 * If DCC_AUTH_TOKEN is empty, auth is disabled.
 * Otherwise, clients must pass header: x-dcc-token: <token>
 */
export function authMiddleware(req, res, next) {
  if (!env.DCC_AUTH_TOKEN) return next();
  const token = req.header("x-dcc-token");
  if (token && token === env.DCC_AUTH_TOKEN) return next();
  res.status(401).json({ error: "Unauthorized" });
}
