import type { Request, RequestHandler } from "express";
import { Desk } from "./desk.model";
import { Center } from "../center/center.model";
import * as crud from "../common/crud.helpers";
import type { JwtUser } from "../../middleware/auth";

const POPULATE = ["center", "wilaya", "commune"];

async function centerIdsForUser(user: JwtUser | undefined): Promise<string[] | null> {
  if (!user || user.role === "super_admin") return null;
  const filter: Record<string, unknown> = {};
  if (user.role === "admin_wilaya" && user.wilaya_id) filter.wilaya = user.wilaya_id;
  else if (user.role === "admin_commun" && user.commune_id) filter.commune = user.commune_id;
  else if (user.role === "role_election_day" && user.center_id) return [user.center_id];
  else return [];
  const centers = await Center.find(filter).select("_id").lean();
  return centers.map((c) => String(c._id));
}

async function assertDeskInScope(req: Request, deskId: string) {
  const user = req.user as JwtUser | undefined;
  if (!user || user.role === "super_admin") return;
  const allowed = await centerIdsForUser(user);
  if (!allowed) return;
  const desk = await Desk.findById(deskId).select("center").lean();
  if (!desk) {
    const err = new Error("Not found") as Error & { status: number };
    err.status = 404;
    throw err;
  }
  if (!allowed.includes(String(desk.center))) {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}

async function assertCenterInScope(req: Request, centerId: string) {
  const user = req.user as JwtUser | undefined;
  if (!user || user.role === "super_admin") return;
  const allowed = await centerIdsForUser(user);
  if (!allowed?.includes(String(centerId))) {
    const err = new Error("Forbidden") as Error & { status: number };
    err.status = 403;
    throw err;
  }
}

export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as JwtUser | undefined;
    const filter: Record<string, unknown> = {};
    if (req.query.center) filter.center = req.query.center;

    const allowedCenters = await centerIdsForUser(user);
    if (allowedCenters !== null) {
      if (allowedCenters.length === 0) {
        return res.json({ ok: true, data: [], total: 0, page: 1, limit: 50, pages: 0 });
      }
      filter.center = filter.center
        ? { $in: allowedCenters.filter((id) => String(filter.center) === id) }
        : { $in: allowedCenters };
    }

    const result = await crud.paginate(Desk, filter as any, req.query as any, undefined, POPULATE);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    await assertDeskInScope(req, req.params.id as string);
    const doc = await crud.findById(Desk, req.params.id as string, POPULATE);
    res.json({ ok: true, data: doc });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    await assertCenterInScope(req, req.body.center);
    // Ensure wilaya/commune are correct for the chosen center (defense-in-depth)
    const center = await Center.findById(req.body.center).select("wilaya commune").lean();
    if (!center) return res.status(400).json({ ok: false, message: "Invalid center" });
    req.body.wilaya = String((center as any).wilaya);
    req.body.commune = String((center as any).commune);
    const doc = await crud.createDoc(Desk, req.body);
    res.status(201).json({ ok: true, data: doc });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const update: RequestHandler = async (req, res, next) => {
  try {
    await assertDeskInScope(req, req.params.id as string);
    if (req.body.center) {
      await assertCenterInScope(req, req.body.center);
      const center = await Center.findById(req.body.center).select("wilaya commune").lean();
      if (!center) return res.status(400).json({ ok: false, message: "Invalid center" });
      req.body.wilaya = String((center as any).wilaya);
      req.body.commune = String((center as any).commune);
    }
    const doc = await crud.updateDoc(Desk, req.params.id as string, req.body);
    res.json({ ok: true, data: doc });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const remove: RequestHandler = async (req, res, next) => {
  try {
    await assertDeskInScope(req, req.params.id as string);
    await crud.deleteDoc(Desk, req.params.id as string);
    res.json({ ok: true, message: "Deleted" });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};
