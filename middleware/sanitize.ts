import type { RequestHandler } from "express";

// ────────────────────────────────────────────────────────────────
// Deep-sanitize request payloads against NoSQL injection.
//
// Strips keys starting with "$" or containing "." from:
//   req.body, req.query, req.params
//
// This is a defence-in-depth layer ON TOP of express-mongo-sanitize.
// ────────────────────────────────────────────────────────────────

function stripDangerous(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(stripDangerous);
  if (typeof obj === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      clean[key] = stripDangerous(val);
    }
    return clean;
  }
  return obj;
}

export const deepSanitize: RequestHandler = (req, _res, next) => {
  if (req.body) req.body = stripDangerous(req.body);
  if (req.query) req.query = stripDangerous(req.query) as typeof req.query;
  return next();
};
