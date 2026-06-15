import { ResultCenter } from "./result-center.model";
import * as crud from "../common/crud.helpers";
export async function create(data: any) { return crud.createDoc(ResultCenter, data); }
export async function findAll(query: any) { const f: any = {}; if (query.center) f.center = query.center; if (query.party) f.party = query.party; if (query.status) f.status = query.status; return crud.paginate(ResultCenter, f, query, undefined, ["center", "party"]); }
export async function findById(id: string) { return crud.findById(ResultCenter, id, ["center", "party"]); }
export async function update(id: string, data: any) { return crud.updateDoc(ResultCenter, id, data); }
