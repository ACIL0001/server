import type { RequestHandler } from "express";
import { Wilaya } from "./wilaya.model";
import { Commune } from "../commune/commune.model";
import { makeListHandler, makeGetHandler, makeCreateHandler, makeUpdateHandler, makeDeleteHandler } from "../common/crud.controller";
import { getRedis } from "../../db/redis";

const CACHE_KEY = "wilayas:all";

async function clearCache() {
  const redis = getRedis();
  if (redis) await redis.del(CACHE_KEY);
}

export const list = makeListHandler(Wilaya, (q) => {
  const filter: any = {};
  if (q.search) {
    filter.$or = [
      { name_fr: { $regex: q.search, $options: "i" } },
      { name_ar: { $regex: q.search, $options: "i" } },
    ];
  }
  return filter;
});

export const getById = makeGetHandler(Wilaya);

export const create = makeCreateHandler(Wilaya, async (body) => {
  await clearCache();
  return body;
});

export const update = makeUpdateHandler(Wilaya, async (body) => {
  await clearCache();
  return body;
});

export const remove: RequestHandler = async (req, res, next) => {
  try {
    const { deleteDoc } = await import("../common/crud.helpers");
    await deleteDoc(Wilaya, req.params.id as string);
    await clearCache();
    res.json({ ok: true, message: "Deleted" });
  } catch (err) { next(err); }
};

export const getCommunes: RequestHandler = async (req, res, next) => {
  try {
    const communes = await Commune.find({ wilaya: req.params.id as string }).sort({ name_fr: 1 }).lean();
    res.json({ ok: true, data: communes });
  } catch (err) { next(err); }
};
