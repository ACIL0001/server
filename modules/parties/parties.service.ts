import { Party } from "./parties.model";
import * as crud from "../common/crud.helpers";

export async function findAll(query: any) {
  const filter: any = {};
  if (query.wilaya) filter.wilaya = query.wilaya;
  if (query.search) filter.name = { $regex: query.search, $options: "i" };
  return crud.paginate(Party, filter, query, "name wilaya createdAt", "wilaya");
}
export async function findById(id: string) { return crud.findById(Party, id, "wilaya"); }
export async function create(data: any) { return crud.createDoc(Party, data); }
export async function update(id: string, data: any) { return crud.updateDoc(Party, id, data); }
export async function remove(id: string) { return crud.deleteDoc(Party, id); }
