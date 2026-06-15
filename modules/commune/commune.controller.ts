import type { RequestHandler } from "express";
import { Commune } from "./commune.model";
import * as crud from "../common/crud.helpers";
import type { JwtUser } from "../../middleware/auth";
import { assertCommuneInScope } from "./commune-scope";

export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as JwtUser | undefined;
    const filter: Record<string, unknown> = {};
    if (req.query.wilaya) filter.wilaya = req.query.wilaya;
    if (user?.role === "admin_wilaya" && user.wilaya_id) {
      filter.wilaya = user.wilaya_id;
    }
    if (user?.role === "admin_commun" && user.commune_id) {
      filter._id = user.commune_id;
    }
    if (req.query.search) {
      filter.$or = [
        { name_fr: { $regex: req.query.search, $options: "i" } },
        { name_ar: { $regex: req.query.search, $options: "i" } },
      ];
    }
    const result = await crud.paginate(Commune, filter as any, req.query as any);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    await assertCommuneInScope(req, req.params.id as string);
    const doc = await crud.findById(Commune, req.params.id as string);
    res.json({ ok: true, data: doc });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as JwtUser | undefined;
    if (user?.role === "admin_wilaya" && user.wilaya_id) {
      req.body.wilaya = user.wilaya_id;
    }
    if (user?.role === "admin_commun") {
      const err = new Error("Forbidden") as Error & { status: number };
      err.status = 403;
      throw err;
    }
    const doc = await crud.createDoc(Commune, req.body);
    res.status(201).json({ ok: true, data: doc });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    await assertCommuneInScope(req, req.params.id as string);
    const user = req.user as JwtUser | undefined;
    if (user?.role === "admin_wilaya" && user.wilaya_id) {
      req.body.wilaya = user.wilaya_id;
    }
    const doc = await crud.updateDoc(Commune, req.params.id as string, req.body);
    res.json({ ok: true, data: doc });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await assertCommuneInScope(req, req.params.id as string);
    await crud.deleteDoc(Commune, req.params.id as string);
    res.json({ ok: true, message: "Deleted" });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};
