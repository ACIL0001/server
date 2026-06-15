import { Wilaya } from "./wilaya.model";
import * as crud from "../common/crud.helpers";
import { getRedis } from "../../db/redis";

const CACHE_KEY = "wilayas:all";
const CACHE_TTL = 86400; // 24h

export async function findAll() {
  const redis = getRedis();
  if (redis) {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);
  }
  const data = await Wilaya.find().sort({ wilaya_code: 1 }).lean();
  if (redis) await redis.set(CACHE_KEY, JSON.stringify(data), "EX", CACHE_TTL);
  return data;
}

export async function findById(id: string) {
  return crud.findById(Wilaya, id);
}

export async function findAllPaginated(query: any) {
  const filter: Record<string, unknown> = {};
  if (query.search) {
    filter.$or = [
      { name_fr: { $regex: query.search, $options: "i" } },
      { name_ar: { $regex: query.search, $options: "i" } },
    ];
  }
  return crud.paginate(Wilaya, filter as any, query);
}
