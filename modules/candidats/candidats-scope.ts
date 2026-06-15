import type { Request } from "express";
import { Candidat } from "./candidats.model";
import { MemberActif } from "../member-actif/member-actif.model";
import { Party } from "../parties/parties.model";
import { assertPartyInScope } from "../parties/parties-scope";
import type { JwtUser } from "../../middleware/auth";

function refId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

export async function buildCandidatListFilter(query: Record<string, unknown>, user?: JwtUser) {
  const f: Record<string, unknown> = {};
  if (query.party) f.party = query.party;
  if (query.search) f.full_name = { $regex: query.search, $options: "i" };

  if (user?.role === "member_actif") {
    f.created_by = user.sub;
    return f;
  }

  if (user?.role === "admin_commun" && user.commune_id) {
    const memberIds = await MemberActif.find({ commune: user.commune_id }).distinct("_id");
    f.$or = [
      { commune: user.commune_id },
      { created_by: { $in: memberIds } },
    ];
    return f;
  }

  if (user?.role === "admin_wilaya" && user.wilaya_id) {
    f.wilaya = user.wilaya_id;
    if (query.commune) f.commune = query.commune;
    return f;
  }

  if (user?.role === "super_admin") {
    if (query.wilaya) f.wilaya = query.wilaya;
    if (query.commune) f.commune = query.commune;
    return f;
  }

  if (query.wilaya) f.wilaya = query.wilaya;
  if (query.commune) f.commune = query.commune;
  return f;
}

export async function assertCanAccessCandidat(req: Request, candidatId: string) {
  const user = req.user as JwtUser | undefined;
  if (!user || user.role === "super_admin") return;

  const doc = await Candidat.findById(candidatId).select("created_by wilaya commune").lean();
  if (!doc) {
    const err = new Error("Not found") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  if (user.role === "member_actif" && String(doc.created_by) !== String(user.sub)) {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }

  if (user.role === "admin_wilaya" && user.wilaya_id && String(doc.wilaya) !== String(user.wilaya_id)) {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }

  if (user.role === "admin_commun" && user.commune_id) {
    if (doc.commune && String(doc.commune) === String(user.commune_id)) return;
    if (doc.created_by) {
      const member = await MemberActif.findById(doc.created_by).select("commune").lean();
      if (member && String(member.commune) === String(user.commune_id)) return;
    }
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}

export async function prepareCandidatBody(body: Record<string, unknown>, req: Request) {
  const user = req.user as JwtUser | undefined;
  if (user?.role !== "member_actif") return body;

  const member = await MemberActif.findById(user.sub).lean();
  if (!member) {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }

  return {
    ...body,
    created_by: user.sub,
    party: member.party,
    wilaya: member.wilaya,
    commune: member.commune,
  };
}

/** Ensures party exists, is in scope, and matches the candidat wilaya */
export async function validateCandidatParty(body: Record<string, unknown>, req: Request) {
  const user = req.user as JwtUser | undefined;
  if (user?.role === "member_actif") return body;

  const partyId = body.party ? String(body.party) : "";
  if (!partyId) {
    const err = new Error("Party is required") as Error & { status: number };
    err.status = 400;
    throw err;
  }

  await assertPartyInScope(req, partyId);

  const party = await Party.findById(partyId).select("wilaya").lean();
  if (!party) {
    const err = new Error("Party not found") as Error & { status: number };
    err.status = 404;
    throw err;
  }

  let targetWilaya = body.wilaya ? String(body.wilaya) : undefined;
  if (user?.role === "admin_wilaya" && user.wilaya_id) {
    targetWilaya = user.wilaya_id;
    body.wilaya = user.wilaya_id;
  }

  if (targetWilaya && refId(party.wilaya) !== targetWilaya) {
    const err = new Error("Party must belong to the selected wilaya") as Error & { status: number };
    err.status = 400;
    throw err;
  }

  return body;
}
