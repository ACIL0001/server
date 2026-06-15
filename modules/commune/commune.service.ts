import { Commune } from "./commune.model";
import * as crud from "../common/crud.helpers";

export async function findByWilaya(wilayaId: string) {
  return Commune.find({ wilaya: wilayaId }).sort({ name_fr: 1 }).lean();
}

export async function findById(id: string) {
  return crud.findById(Commune, id, "wilaya");
}

export async function findAllPaginated(query: any) {
  const filter: Record<string, unknown> = {};
  if (query.wilaya) filter.wilaya = query.wilaya;
  if (query.search) {
    filter.$or = [
      { name_fr: { $regex: query.search, $options: "i" } },
      { name_ar: { $regex: query.search, $options: "i" } },
    ];
  }
  return crud.paginate(Commune, filter as any, query, undefined, "wilaya");
}
