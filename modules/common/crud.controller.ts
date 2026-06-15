import type { RequestHandler } from "express";
import type { Model } from "mongoose";
import * as crud from "./crud.helpers";

// ────────────────────────────────────────────────────────────────
// Generic controller factory — generates standard CRUD handlers.
// Each module can override/extend these as needed.
// ────────────────────────────────────────────────────────────────

export function makeListHandler<T>(
  model: Model<T>,
  buildFilter: (query: any) => Record<string, unknown> = () => ({}),
  select?: string,
  populate?: string | string[]
): RequestHandler {
  return async (req, res, next) => {
    try {
      const filter = buildFilter(req.query);
      const result = await crud.paginate(model, filter as any, req.query as any, select, populate);
      res.json({ ok: true, ...result });
    } catch (err) { next(err); }
  };
}

export function makeGetHandler<T>(
  model: Model<T>,
  populate?: string | string[]
): RequestHandler {
  return async (req, res, next) => {
    try {
      const doc = await crud.findById(model, req.params.id as string, populate);
      res.json({ ok: true, data: doc });
    } catch (err: any) {
      res.status(err.status || 500).json({ ok: false, message: err.message });
    }
  };
}

export function makeCreateHandler<T>(
  model: Model<T>,
  beforeCreate?: (body: any, req: any) => Promise<any> | any
): RequestHandler {
  return async (req, res, next) => {
    try {
      let data = req.body;
      if (beforeCreate) data = await beforeCreate(data, req);
      const doc = await crud.createDoc(model, data);
      res.status(201).json({ ok: true, data: doc });
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ ok: false, message: "Duplicate entry", details: err.keyPattern });
      }
      res.status(err.status || 500).json({ ok: false, message: err.message });
    }
  };
}

export function makeUpdateHandler<T>(
  model: Model<T>,
  beforeUpdate?: (body: any, req: any) => Promise<any> | any
): RequestHandler {
  return async (req, res, next) => {
    try {
      let data = req.body;
      if (beforeUpdate) data = await beforeUpdate(data, req);
      const doc = await crud.updateDoc(model, req.params.id as string, data);
      res.json({ ok: true, data: doc });
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(409).json({ ok: false, message: "Duplicate entry", details: err.keyPattern });
      }
      res.status(err.status || 500).json({ ok: false, message: err.message });
    }
  };
}

export function makeDeleteHandler<T>(model: Model<T>): RequestHandler {
  return async (req, res, next) => {
    try {
      await crud.deleteDoc(model, req.params.id as string);
      res.json({ ok: true, message: "Deleted" });
    } catch (err: any) {
      res.status(err.status || 500).json({ ok: false, message: err.message });
    }
  };
}
