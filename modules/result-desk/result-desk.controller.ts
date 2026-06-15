import type { RequestHandler } from "express";
import * as resultService from "./result-desk.service";
import * as crud from "../common/crud.helpers";
import { ResultDesk } from "./result-desk.model";
import { ResultCenter } from "../result-center/result-center.model";
import { Desk } from "../desk/desk.model";

export const submitDesk: RequestHandler = async (req, res, next) => {
  try {
    const data = { ...req.body, owner: req.user?.sub };
    if (req.file) { data.image = req.file.buffer; data.image_mimetype = req.file.mimetype; }
    const doc = await resultService.submitDeskResult(data);

    // If an image was uploaded, auto-trigger OCR in the background
    if (req.file && doc._id) {
      resultService.processOcr(String(doc._id)).catch((err) => {
        console.error(`[OCR] Background OCR failed for result ${doc._id}:`, err.message);
      });
    }

    res.status(201).json({ ok: true, data: doc });
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ ok: false, message: "Result already submitted for this desk/party/candidat" });
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const listDesk: RequestHandler = async (req, res, next) => {
  try {
    const { wilayaId, communeId, centerId, ...rest } = req.query as any;

    // Enforce scope: admin_wilaya can only see their wilaya
    const role = req.user?.role;
    let scopedWilayaId = wilayaId;
    let scopedCommuneId = communeId;

    if (role === "admin_wilaya") {
      scopedWilayaId = req.user?.wilaya_id;
    } else if (role === "admin_commun") {
      scopedWilayaId = req.user?.wilaya_id;
      scopedCommuneId = req.user?.commune_id;
    }

    const result = await resultService.findAllDeskResultsScoped(
      rest,
      { wilayaId: scopedWilayaId, communeId: scopedCommuneId, centerId }
    );
    res.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("listDesk ERROR:", error);
    next(error);
  }
};

export const getDeskById: RequestHandler = async (req, res) => {
  try { const data = await resultService.findDeskResultById(req.params.id as string); res.json({ ok: true, data }); }
  catch (err: any) { res.status(err.status || 500).json({ ok: false, message: err.message }); }
};

export const updateDeskStatus: RequestHandler = async (req, res) => {
  try {
    if (req.user?.role === "role_election_day" && req.user?.election_role !== "observateur_centre") {
      return res.status(403).json({ ok: false, message: "Only observateur_centre can verify results" });
    }
    const data = await resultService.updateDeskResultStatus(req.params.id as string, req.body.status, req.body.ocr_result);
    res.json({ ok: true, data });
  } catch (err: any) { res.status(err.status || 500).json({ ok: false, message: err.message }); }
};

// Serve PV image
export const getDeskImage: RequestHandler = async (req, res) => {
  try {
    const doc = await ResultDesk.findById(req.params.id).select("+image +image_mimetype");
    if (!doc || !doc.image) {
      return res.status(404).json({ ok: false, message: "Image not found" });
    }
    res.set("Content-Type", doc.image_mimetype || "image/jpeg");
    res.set("Cache-Control", "private, max-age=3600");
    res.send(doc.image);
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

// OCR Summary Stats
export const getOcrSummary: RequestHandler = async (req, res) => {
  try {
    const role = req.user?.role;
    const pipeline: any[] = [];

    // Scope via desk join if needed
    if (role === "admin_wilaya" || role === "admin_commun") {
      pipeline.push(
        { $lookup: { from: "desks", localField: "desk", foreignField: "_id", as: "_desk" } },
        { $unwind: "$_desk" }
      );
      if (role === "admin_wilaya" && req.user?.wilaya_id) {
        const { Types } = await import("mongoose");
        pipeline.push({ $match: { "_desk.wilaya": new Types.ObjectId(req.user.wilaya_id) } });
      } else if (role === "admin_commun" && req.user?.commune_id) {
        const { Types } = await import("mongoose");
        pipeline.push({ $match: { "_desk.commune": new Types.ObjectId(req.user.commune_id) } });
      }
    }

    pipeline.push({
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        hasImageCount: { 
          $sum: { $cond: [{ $ne: [{ $type: "$image" }, "missing"] }, 1, 0] } 
        }
      },
    });

    const raw = await ResultDesk.aggregate(pipeline);
    const summary: Record<string, number> = {};
    let pvUploads = 0;
    
    for (const r of raw) {
      summary[r._id] = r.count;
      pvUploads += r.hasImageCount;
    }

    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    res.json({ ok: true, data: { summary, total, pvUploads } });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

// OCR
export const triggerOcr: RequestHandler = async (req, res) => {
  try {
    const data = await resultService.processOcr(req.params.id as string);
    res.json({ ok: true, data, message: "OCR processing complete" });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const requestHumanReview: RequestHandler = async (req, res) => {
  try { const data = await resultService.requestHumanReview(req.params.id as string); res.json({ ok: true, data }); }
  catch (err: any) { res.status(err.status || 500).json({ ok: false, message: err.message }); }
};

// ── Desk-level Verification ─────────────────────────────────
export const uploadDeskImage: RequestHandler = async (req, res) => {
  try {
    const deskId = req.params.deskId as string;
    if (!req.file) return res.status(400).json({ ok: false, message: "No image uploaded" });
    
    await resultService.uploadDeskImage(deskId, req.file.buffer, req.file.mimetype);
    res.json({ ok: true, message: "Image uploaded successfully" });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const verifyDesk: RequestHandler = async (req, res) => {
  try {
    const deskId = req.params.deskId as string;
    // Modified to optionally accept req.file. If missing, it will use the existing image.
    const report = await resultService.verifyDeskWithImage(
      deskId,
      req.file?.buffer,
      req.file?.mimetype
    );
    res.json({ ok: true, data: report });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const getDeskVerificationReport: RequestHandler = async (req, res) => {
  try {
    const deskId = req.params.deskId as string;
    const report = await resultService.getDeskVerificationReport(deskId);
    res.json({ ok: true, data: report });
  } catch (err: any) {
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

// Aggregations
export const aggregateByCenter: RequestHandler = async (req, res) => {
  try { const data = await resultService.aggregateByCenter(req.params.centerId as string); res.json({ ok: true, data }); }
  catch (err: any) { res.status(err.status || 500).json({ ok: false, message: err.message }); }
};

export const aggregateByWilaya: RequestHandler = async (req, res) => {
  try { const data = await resultService.aggregateByWilaya(req.params.wilayaId as string); res.json({ ok: true, data }); }
  catch (err: any) { res.status(err.status || 500).json({ ok: false, message: err.message }); }
};

export const aggregateNational: RequestHandler = async (_req, res) => {
  try { const data = await resultService.aggregateNational(); res.json({ ok: true, data }); }
  catch (err: any) { res.status(err.status || 500).json({ ok: false, message: err.message }); }
};

// Result center
export const submitCenter: RequestHandler = async (req, res) => {
  try {
    const data = { ...req.body, owner: req.user?.sub };
    if (req.file) { data.image = req.file.buffer; data.image_mimetype = req.file.mimetype; }
    const doc = await crud.createDoc(ResultCenter, data);
    res.status(201).json({ ok: true, data: doc });
  } catch (err: any) {
    if (err.code === 11000) return res.status(409).json({ ok: false, message: "Center result already exists" });
    res.status(err.status || 500).json({ ok: false, message: err.message });
  }
};

export const listCenter: RequestHandler = async (req, res, next) => {
  try {
    const f: any = {};
    if (req.query.center) f.center = req.query.center;
    if (req.query.party) f.party = req.query.party;
    if (req.query.status) f.status = req.query.status;
    const result = await crud.paginate(ResultCenter, f, req.query as any, undefined, ["center", "party"]);
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
};

export const getCenterById: RequestHandler = async (req, res) => {
  try { const data = await crud.findById(ResultCenter, req.params.id as string, ["center", "party"]); res.json({ ok: true, data }); }
  catch (err: any) { res.status(err.status || 500).json({ ok: false, message: err.message }); }
};
