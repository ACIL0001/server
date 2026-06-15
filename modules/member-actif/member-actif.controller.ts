import { MemberActif } from "./member-actif.model";
import { makeListHandler, makeGetHandler, makeCreateHandler, makeUpdateHandler, makeDeleteHandler } from "../common/crud.controller";
import { hashPassword } from "../auth/auth.service";

export const list = makeListHandler(MemberActif, (q) => {
  const f: any = {};
  if (q.wilaya) f.wilaya = q.wilaya;
  if (q.commune) f.commune = q.commune;
  if (q.party) f.party = q.party;
  if (q.search) f.full_name = { $regex: q.search, $options: "i" };
  return f;
}, undefined, ["wilaya", "commune", "party"]);

export const getById = makeGetHandler(MemberActif, ["wilaya", "commune", "party"]);
export const create = makeCreateHandler(MemberActif, async (body, req) => { body.password = await hashPassword(body.password); body.created_by = req.user?.sub; return body; });
export const update = makeUpdateHandler(MemberActif);
export const remove = makeDeleteHandler(MemberActif);
