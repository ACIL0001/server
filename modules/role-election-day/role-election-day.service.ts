import { RoleElectionDay } from "./role-election-day.model";
import * as crud from "../common/crud.helpers";
import { hashPassword } from "../auth/auth.service";
export async function create(data: any) { data.password = await hashPassword(data.password); return crud.createDoc(RoleElectionDay, data); }
export async function findAll(query: any) { const f: any = {}; if (query.wilaya) f.wilaya = query.wilaya; if (query.center) f.center = query.center; if (query.role) f.role = query.role; return crud.paginate(RoleElectionDay, f, query, undefined, ["wilaya", "commune", "center", "desk"]); }
export async function findById(id: string) { return crud.findById(RoleElectionDay, id, ["wilaya", "commune", "center", "desk"]); }
export async function update(id: string, data: any) { if (data.password) data.password = await hashPassword(data.password); return crud.updateDoc(RoleElectionDay, id, data); }
export async function remove(id: string) { return crud.deleteDoc(RoleElectionDay, id); }
