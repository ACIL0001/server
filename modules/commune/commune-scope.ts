import type { Request } from "express";
import type { JwtUser } from "../../middleware/auth";
import { Commune } from "./commune.model";

function refId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

export async function assertCommuneInScope(req: Request, communeId: string) {
  const user = req.user as JwtUser | undefined;
  if (!user || user.role === "super_admin") return;

  const commune = await Commune.findById(communeId).select("wilaya").lean();
  if (!commune) {
    const err = new Error("Not found") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  if (user.role === "admin_wilaya" && user.wilaya_id && refId(commune.wilaya) !== String(user.wilaya_id)) {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }

  if (user.role === "admin_commun") {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}
