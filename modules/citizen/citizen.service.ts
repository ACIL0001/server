import { Citizen } from "./citizen.model";
import * as crud from "../common/crud.helpers";
import { hashPassword } from "../auth/auth.service";

export async function create(data: any) { data.password = await hashPassword(data.password); return crud.createDoc(Citizen, data); }
export async function findAll(query: any) {
  const f: any = {};
  if (query.member_actif) f.member_actif = query.member_actif;
  if (query.party) f.party = query.party;
  if (query.search) f.full_name = { $regex: query.search, $options: "i" };
  return crud.paginate(Citizen, f, query, "full_name email phone nin member_actif party createdAt", ["member_actif", "party"]);
}
export async function findById(id: string) { return crud.findById(Citizen, id, ["member_actif", "party"]); }
export async function update(id: string, data: any) { if (data.password) data.password = await hashPassword(data.password); return crud.updateDoc(Citizen, id, data); }
export async function remove(id: string) { return crud.deleteDoc(Citizen, id); }
