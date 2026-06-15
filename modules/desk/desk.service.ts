import { Desk } from "./desk.model";
import * as crud from "../common/crud.helpers";
export async function findAll(query: any) { const f: any = {}; if (query.center) f.center = query.center; return crud.paginate(Desk, f, query, undefined, "center"); }
export async function findById(id: string) { return crud.findById(Desk, id, "center"); }
export async function create(data: any) { return crud.createDoc(Desk, data); }
export async function update(id: string, data: any) { return crud.updateDoc(Desk, id, data); }
export async function remove(id: string) { return crud.deleteDoc(Desk, id); }
