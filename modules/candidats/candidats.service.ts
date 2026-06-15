import { Candidat } from "./candidats.model";
import * as crud from "../common/crud.helpers";

export async function findAll(query: any) {
  const filter: any = {};
  if (query.wilaya) filter.wilaya = query.wilaya;
  if (query.party) filter.party = query.party;
  if (query.search) filter.full_name = { $regex: query.search, $options: "i" };
  return crud.paginate(Candidat, filter, query, "full_name nin phone party wilaya is_favorite result createdAt", ["party", "wilaya"]);
}
export async function findById(id: string) { return crud.findById(Candidat, id, ["party", "wilaya"]); }
export async function create(data: any) { return crud.createDoc(Candidat, data); }
export async function update(id: string, data: any) { return crud.updateDoc(Candidat, id, data); }
export async function remove(id: string) { return crud.deleteDoc(Candidat, id); }
