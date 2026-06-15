import { MemberActif } from "./member-actif.model";
import * as crud from "../common/crud.helpers";
import { hashPassword } from "../auth/auth.service";

export async function create(data: any) { data.password = await hashPassword(data.password); return crud.createDoc(MemberActif, data); }
export async function findAll(query: any) {
  const f: any = {};
  if (query.wilaya) f.wilaya = query.wilaya;
  if (query.commune) f.commune = query.commune;
  if (query.party) f.party = query.party;
  if (query.search) f.full_name = { $regex: query.search, $options: "i" };
  return crud.paginate(MemberActif, f, query, undefined, ["wilaya", "commune", "party"]);
}
export async function findById(id: string) { return crud.findById(MemberActif, id, ["wilaya", "commune", "party"]); }
export async function update(id: string, data: any) { if (data.password) data.password = await hashPassword(data.password); return crud.updateDoc(MemberActif, id, data); }
export async function remove(id: string) { return crud.deleteDoc(MemberActif, id); }
