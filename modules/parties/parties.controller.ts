import type { RequestHandler } from "express";
import { Party } from "./parties.model";
import * as crud from "../common/crud.helpers";
import type { JwtUser } from "../../middleware/auth";
import { assertPartyInScope } from "./parties-scope";

const PARTY_SELECT = "name acronym leader founded wilaya createdAt";
const PARTY_POPULATE = "wilaya";

export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as JwtUser | undefined;
    const filter: Record<string, unknown> = {};
    if (req.query.wilaya) filter.wilaya = req.query.wilaya;
    if (user?.role === "admin_wilaya" && user.wilaya_id) filter.wilaya = user.wilaya_id;
    if (user?.role === "admin_commun" && user.wilaya_id) filter.wilaya = user.wilaya_id;
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: "i" };
    }
    const result = await crud.paginate(
      Party,
      filter as any,
      req.query as any,
      PARTY_SELECT,
      PARTY_POPULATE
    );
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    await assertPartyInScope(req, req.params.id as string);
    const doc = await crud.findById(Party, req.params.id as string, PARTY_POPULATE);
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
    req.body.created_by = user?.sub;
    const doc = await crud.createDoc(Party, req.body);
    res.status(201).json({ ok: true, data: doc });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ ok: false, message: "Duplicate entry", details: err.keyPattern });
    }
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    await assertPartyInScope(req, req.params.id as string, { write: true });
    const user = req.user as JwtUser | undefined;
    if (user?.role === "admin_wilaya" && user.wilaya_id) {
      req.body.wilaya = user.wilaya_id;
    }
    const doc = await crud.updateDoc(Party, req.params.id as string, req.body);
    res.json({ ok: true, data: doc });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ ok: false, message: "Duplicate entry", details: err.keyPattern });
    }
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await assertPartyInScope(req, req.params.id as string, { write: true });
    await crud.deleteDoc(Party, req.params.id as string);
    res.json({ ok: true, message: "Deleted" });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};
