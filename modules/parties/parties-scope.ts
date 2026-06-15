import type { Request } from "express";
import type { JwtUser } from "../../middleware/auth";
import { Party } from "./parties.model";

function refId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value !== null) {
    const o = value as { _id?: unknown; id?: unknown };
    if (o._id != null) return String(o._id);
    if (o.id != null) return String(o.id);
  }
  return String(value);
}

export async function assertPartyInScope(
  req: Request,
  partyId: string,
  options: { write?: boolean } = {}
) {
  const user = req.user as JwtUser | undefined;
  if (!user || user.role === "super_admin") return;

  const party = await Party.findById(partyId).select("wilaya").lean();
  if (!party) {
    const err = new Error("Not found") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  if (user.role === "admin_commun") {
    if (options.write) {
      const err = new Error("Forbidden") as Error & { status: number };
      err.status = 403;
      throw err;
    }
    if (user.wilaya_id && refId(party.wilaya) !== String(user.wilaya_id)) {
      const err = new Error("Forbidden") as Error & { status: number };
      err.status = 403;
      throw err;
    }
    return;
  }

  if (user.role === "admin_wilaya" && user.wilaya_id && refId(party.wilaya) !== String(user.wilaya_id)) {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}
