import type { Request } from "express";
import type { JwtUser } from "../../middleware/auth";
import { Admin } from "./admin.model";

export function refObjectId(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    return String((value as { id: unknown }).id);
  }
  return String(value);
}

export function assertCanManageAdmins(user: JwtUser | undefined) {
  if (!user || (user.role !== "super_admin" && user.role !== "admin_wilaya")) {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}

export async function assertCanMutateAdmin(req: Request, adminId: string) {
  const user = req.user as JwtUser | undefined;
  assertCanManageAdmins(user);

  if (user!.role === "super_admin") return;

  const target = await Admin.findById(adminId).select("role wilaya commune").lean();
  if (!target) {
    const err = new Error("Not found") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  if (target.role !== "admin_commun") {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }

  if (user!.wilaya_id && refObjectId(target.wilaya) !== String(user!.wilaya_id)) {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}

export function sanitizeAdminBodyForActor(
  user: JwtUser | undefined,
  body: Record<string, unknown>,
  isCreate: boolean
) {
  if (!user || user.role === "super_admin") return body;

  if (user.role === "admin_wilaya") {
    const next: Record<string, unknown> = { ...body, role: "admin_commun" };
    if (user.wilaya_id) next.wilaya = user.wilaya_id;
    return next;
  }

  const err = new Error("Forbidden") as Error & { status: number };
  err.status = 403;
  throw err;
}

export function buildAdminListFilter(user: JwtUser | undefined, query: Record<string, unknown>) {
  const f: Record<string, unknown> = {};
  if (query.status) f.status = query.status;
  if (query.search) f.full_name = { $regex: query.search, $options: "i" };

  if (user?.role === "super_admin") {
    if (query.role) f.role = query.role;
    if (query.wilaya) f.wilaya = query.wilaya;
    if (query.commune) f.commune = query.commune;
    return f;
  }

  if (user?.role === "admin_wilaya") {
    f.role = "admin_commun";
    if (user.wilaya_id) f.wilaya = user.wilaya_id;
    return f;
  }

  const err = new Error("Forbidden") as Error & { status: number };
  err.status = 403;
  throw err;
}
