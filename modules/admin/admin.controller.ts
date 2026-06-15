import type { RequestHandler } from "express";
import { Admin } from "./admin.model";
import * as crud from "../common/crud.helpers";
import { hashPassword } from "../auth/auth.service";
import type { JwtUser } from "../../middleware/auth";
import {
  assertCanMutateAdmin,
  buildAdminListFilter,
  sanitizeAdminBodyForActor,
} from "./admin-scope";

const POPULATE = ["wilaya", "commune"];

export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as JwtUser | undefined;
    const filter = buildAdminListFilter(user, req.query as Record<string, unknown>);
    const result = await crud.paginate(Admin, filter as any, req.query as any, undefined, POPULATE);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    await assertCanMutateAdmin(req, req.params.id as string);
    const doc = await crud.findById(Admin, req.params.id as string, POPULATE);
    res.json({ ok: true, data: doc });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as JwtUser | undefined;
    let data = sanitizeAdminBodyForActor(user, req.body, true) as Record<string, unknown>;
    data.password = await hashPassword(data.password as string);
    data.created_by = user?.sub;
    const doc = await crud.createDoc(Admin, data as any);
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
    const user = req.user as JwtUser | undefined;
    await assertCanMutateAdmin(req, req.params.id as string);
    let data = sanitizeAdminBodyForActor(user, req.body, false) as Record<string, unknown>;
    if (data.password) data.password = await hashPassword(data.password as string);
    const doc = await crud.updateDoc(Admin, req.params.id as string, data as any);
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
    await assertCanMutateAdmin(req, req.params.id as string);
    await crud.deleteDoc(Admin, req.params.id as string);
    res.json({ ok: true, message: "Deleted" });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};
