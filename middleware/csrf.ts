import type { ErrorRequestHandler, RequestHandler } from "express";
import csurf from "csurf";
import { env } from "../config/env";

export function csrfProtection(): RequestHandler {
  // Only applies to cookie-based auth flows.
  // For pure Bearer/JWT APIs, keep CSRF disabled.
  if (!env.csrfEnabled) {
    return (req, res, next) => next();
  }

  return csurf({
    cookie: {
      key: "csrf",
      httpOnly: true,
      sameSite: "lax",
      secure: env.isProd,
      signed: true,
    },
  });
}

export const csrfErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // csurf throws EBADCSRFTOKEN
  if (err && typeof err === "object" && "code" in err && (err as any).code === "EBADCSRFTOKEN") {
    return res.status(403).json({ ok: false, message: "Invalid CSRF token" });
  }
  return next(err);
};

