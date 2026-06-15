import { Center } from "./center.model";
import { makeListHandler, makeGetHandler, makeCreateHandler, makeUpdateHandler, makeDeleteHandler } from "../common/crud.controller";

export const list = makeListHandler(Center, (q) => {
  const f: any = {};
  if (q.wilaya) f.wilaya = q.wilaya;
  if (q.commune) f.commune = q.commune;
  if (q.search) f.name = { $regex: q.search, $options: "i" };
  return f;
}, undefined, ["wilaya", "commune"]);
export const getById = makeGetHandler(Center, ["wilaya", "commune"]);
export const create = makeCreateHandler(Center);
export const update = makeUpdateHandler(Center);
export const remove = makeDeleteHandler(Center);
