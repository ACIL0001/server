import type { RequestHandler } from "express";
import type { JwtUser } from "./auth";

// ────────────────────────────────────────────────────────────────
// Scope guard — enforces data isolation based on JWT claims.
//
// admin_wilaya  → can only access resources within their wilaya
// admin_commun  → can only access resources within their commune
// super_admin   → unrestricted
// ────────────────────────────────────────────────────────────────

export function scopeGuard(
  wilayaField = "wilaya",
  communeField = "commune"
): RequestHandler {
  return (req, _res, next) => {
    const user = req.user as JwtUser | undefined;
    if (!user) return next();

    // Super admins bypass scope restrictions
    if (user.role === "super_admin") return next();

    // Inject scope filters into query AND body for admin_wilaya
    if (user.role === "admin_wilaya" && user.wilaya_id) {
      // For GET requests, inject into query
      if (req.method === "GET") {
        req.query[wilayaField] = user.wilaya_id;
      }
      // For POST/PUT, inject into body
      if (req.body && typeof req.body === "object") {
        req.body[wilayaField] = user.wilaya_id;
      }
    }

    // Inject scope for admin_commun (both wilaya + commune)
    if (user.role === "admin_commun" && user.commune_id) {
      if (req.method === "GET") {
        if (user.wilaya_id) req.query[wilayaField] = user.wilaya_id;
        req.query[communeField] = user.commune_id;
      }
      if (req.body && typeof req.body === "object") {
        if (user.wilaya_id) req.body[wilayaField] = user.wilaya_id;
        req.body[communeField] = user.commune_id;
      }
    }

    return next();
  };
}
