import type { RequestHandler } from "express";
import { Citizen } from "./citizen.model";
import * as crud from "../common/crud.helpers";
import { makeGetHandler, makeCreateHandler, makeUpdateHandler, makeDeleteHandler } from "../common/crud.controller";
import { hashPassword } from "../auth/auth.service";
import { buildCitizenListFilter } from "./citizen-scope";
import { normalizeAlgerianPhone, normalizeNin } from "./citizen.utils";
import type { JwtUser } from "../../middleware/auth";

const POPULATE = [
  {
    path: "member_actif",
    select: "full_name wilaya commune",
    populate: [
      { path: "wilaya", select: "name name_fr name_ar wilaya_code" },
      { path: "commune", select: "name name_fr name_ar" },
    ],
  },
  { path: "party", select: "name acronym" },
  { path: "wilaya", select: "name name_fr name_ar wilaya_code" },
  { path: "commune", select: "name name_fr name_ar" },
];

const SELECT =
  "full_name email phone nin date_of_birth member_actif party wilaya commune createdAt updatedAt";

async function enrichCitizenBody(body: Record<string, unknown>) {
  const memberId = body.member_actif;
  if (!memberId) return body;
  const { MemberActif } = await import("../member-actif/member-actif.model");
  const member = await MemberActif.findById(memberId).select("wilaya commune party").lean();
  if (!member) return body;
  if (!body.wilaya && member.wilaya) body.wilaya = member.wilaya;
  if (!body.commune && member.commune) body.commune = member.commune;
  if (!body.party && member.party) body.party = member.party;
  return body;
}

function normalizeCitizenFields(body: Record<string, unknown>) {
  if (typeof body.phone === "string") {
    const phone = normalizeAlgerianPhone(body.phone);
    if (phone) body.phone = phone;
  }
  if (typeof body.nin === "string") {
    const nin = normalizeNin(body.nin);
    if (nin) body.nin = nin;
  }
  if (body.email === "") delete body.email;
  return body;
}

async function prepareCitizenBody(
  body: Record<string, unknown>,
  req: { user?: JwtUser; params?: { id?: string } }
): Promise<Record<string, unknown>> {
  normalizeCitizenFields(body);
  const user = req.user;
  if (user?.role === "member_actif") {
    body.member_actif = user.sub;
    const { MemberActif } = await import("../member-actif/member-actif.model");
    const member = await MemberActif.findById(user.sub).select("wilaya commune party").lean();
    if (member) {
      if (!body.wilaya && member.wilaya) body.wilaya = member.wilaya;
      if (!body.commune && member.commune) body.commune = member.commune;
      if (!body.party && member.party) body.party = member.party;
    }
  }
  return enrichCitizenBody(body);
}

async function assertMemberOwnsCitizen(citizenId: string, memberId: string) {
  const doc = await Citizen.findById(citizenId).select("member_actif").lean();
  if (!doc) {
    const err = new Error("Citizen not found") as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  if (String(doc.member_actif) !== memberId) {
    const err = new Error("Forbidden") as Error & { status?: number };
    err.status = 403;
    throw err;
  }
}

export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as JwtUser | undefined;
    const filter = await buildCitizenListFilter(req.query as Record<string, unknown>, user);
    const result = await crud.paginate(
      Citizen,
      filter as Record<string, unknown>,
      req.query as Record<string, unknown>,
      SELECT,
      POPULATE as unknown as string[]
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getById = makeGetHandler(Citizen, POPULATE as unknown as string[]);
export const create = makeCreateHandler(Citizen, async (body, req) => {
  const prepared = await prepareCitizenBody(body, req);
  prepared.password = await hashPassword(String(prepared.password));
  return prepared;
});
export const update = makeUpdateHandler(Citizen, async (body, req) => {
  normalizeCitizenFields(body);
  const user = req.user as JwtUser | undefined;
  if (user?.role === "member_actif") {
    await assertMemberOwnsCitizen(String(req.params.id), user.sub);
    delete body.member_actif;
    delete body.wilaya;
    delete body.commune;
    delete body.party;
  }
  if (body.password) body.password = await hashPassword(String(body.password));
  return enrichCitizenBody(body);
});
export const remove: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as JwtUser | undefined;
    if (user?.role === "member_actif") {
      await assertMemberOwnsCitizen(String(req.params.id), user.sub);
    }
    await crud.deleteDoc(Citizen, req.params.id as string);
    res.json({ ok: true, message: "Deleted" });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};
