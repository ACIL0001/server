import { Center } from "./center.model";
import * as crud from "../common/crud.helpers";
export async function findAll(query: any) { const f: any = {}; if (query.wilaya) f.wilaya = query.wilaya; if (query.commune) f.commune = query.commune; return crud.paginate(Center, f, query, undefined, ["wilaya", "commune"]); }
export async function findById(id: string) { return crud.findById(Center, id, ["wilaya", "commune"]); }
export async function create(data: any) { return crud.createDoc(Center, data); }
export async function update(id: string, data: any) { return crud.updateDoc(Center, id, data); }
export async function remove(id: string) { return crud.deleteDoc(Center, id); }
