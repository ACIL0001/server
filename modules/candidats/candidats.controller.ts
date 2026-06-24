import type { Request, RequestHandler } from "express";
import { Candidat } from "./candidats.model";
import * as crud from "../common/crud.helpers";
import {
  assertCanAccessCandidat,
  buildCandidatListFilter,
  prepareCandidatBody,
  validateCandidatParty,
} from "./candidats-scope";
import type { JwtUser } from "../../middleware/auth";

const POPULATE = ["party", "wilaya", "commune"];
const SELECT = "full_name nin phone party wilaya commune is_favorite result number created_by createdAt updatedAt";

const handleImage = (body: Record<string, unknown>, req: Request) => {
  const file = (req as Request & { file?: { buffer: Buffer; mimetype: string } }).file;
  if (file) {
    body.image = file.buffer;
    body.image_mimetype = file.mimetype;
  }
  return body;
};

export const list: RequestHandler = async (req, res, next) => {
  try {
    const user = req.user as JwtUser | undefined;
    const filter = await buildCandidatListFilter(req.query as Record<string, unknown>, user);
    const result = await crud.paginate(Candidat, filter as any, req.query as any, SELECT, POPULATE);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    await assertCanAccessCandidat(req, req.params.id as string);
    const doc = await crud.findById(Candidat, req.params.id as string, POPULATE);
    res.json({ ok: true, data: doc });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const create: RequestHandler = async (req, res, next) => {
  try {
    let data = handleImage({ ...req.body }, req);
    data = await prepareCandidatBody(data, req);
    data = await validateCandidatParty(data, req);
    const doc = await crud.createDoc(Candidat, data as any);
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
    await assertCanAccessCandidat(req, req.params.id as string);
    let data = handleImage({ ...req.body }, req);
    data = await prepareCandidatBody(data, req);
    if (data.party) {
      data = await validateCandidatParty(data, req);
    }
    const doc = await crud.updateDoc(Candidat, req.params.id as string, data as any);
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
    await assertCanAccessCandidat(req, req.params.id as string);
    await crud.deleteDoc(Candidat, req.params.id as string);
    res.json({ ok: true, message: "Deleted" });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const getPortrait: RequestHandler = async (req, res, next) => {
  try {
    await assertCanAccessCandidat(req, req.params.id as string);
    const cand = await Candidat.findById(req.params.id).select("+image +image_mimetype");
    if (!cand || !cand.image) {
      return res.status(404).json({ ok: false, message: "Image not found" });
    }
    res.set("Content-Type", cand.image_mimetype || "image/jpeg");
    res.send(cand.image);
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};
