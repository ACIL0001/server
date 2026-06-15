import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

// ────────────────────────────────────────────────────────────────
// JWT payload shape attached to every authenticated request.
// ────────────────────────────────────────────────────────────────

export type UserRole =
  | "super_admin"
  | "admin_wilaya"
  | "admin_commun"
  | "member_actif"
  | "role_election_day"
  | "citizen";

export interface JwtUser {
  sub: string;          // user id
  role: UserRole;
  wilaya_id?: string;   // scoped for admin_wilaya / admin_commun
  commune_id?: string;  // scoped for admin_commun
  election_role?: string;  // specific election-day sub-role (observateur_bureau, etc.)
  center_id?: string;      // assigned center for election-day roles
  desk_id?: string;        // assigned desk for observateur_bureau
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function getBearerToken(authHeader: unknown): string | null {
  if (typeof authHeader !== "string") return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

// ────────────────────────────────────────────────────────────────
// Middleware: require a valid access-token
// ────────────────────────────────────────────────────────────────

export const requireAuth: RequestHandler = (req, res, next) => {
  const token = getBearerToken(req.headers.authorization) || (req.query.token as string);
  if (!token) return res.status(401).json({ ok: false, message: "Missing token" });

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret, {
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    }) as jwt.JwtPayload & JwtUser;

    if (!decoded.sub) return res.status(401).json({ ok: false, message: "Invalid token" });

    req.user = {
      sub: decoded.sub,
      role: decoded.role,
      wilaya_id: decoded.wilaya_id,
      commune_id: decoded.commune_id,
      election_role: decoded.election_role,
      center_id: decoded.center_id,
      desk_id: decoded.desk_id,
    };
    return next();
  } catch {
    return res.status(401).json({ ok: false, message: "Invalid or expired token" });
  }
};

// ────────────────────────────────────────────────────────────────
// Middleware: require one of the listed roles
// ────────────────────────────────────────────────────────────────

export function requireRoles(...allowed: UserRole[]): RequestHandler {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    return next();
  };
}

// ────────────────────────────────────────────────────────────────
// Middleware: require the user owns the resource (param-based)
// ────────────────────────────────────────────────────────────────

export function requireOwnership(paramField = "id"): RequestHandler {
  return (req, res, next) => {
    if (req.user?.role === "super_admin") return next();
    if (req.params[paramField] === req.user?.sub) return next();
    return res.status(403).json({ ok: false, message: "Forbidden" });
  };
}
