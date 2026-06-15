import type { RequestHandler } from "express";
import * as notifService from "./notification.service";

export const list: RequestHandler = async (req, res, next) => {
  try { const result = await notifService.findForUser(req.user!.sub, req.query); res.json({ ok: true, ...result }); } catch (err) { next(err); }
};

export const markRead: RequestHandler = async (req, res) => {
  try { await notifService.markRead(req.params.id as string); res.json({ ok: true }); }
  catch (err: any) { res.status(err.status || 500).json({ ok: false, message: err.message }); }
};

export const markAllRead: RequestHandler = async (req, res) => {
  try { await notifService.markAllRead(req.user!.sub); res.json({ ok: true }); }
  catch (err: any) { res.status(err.status || 500).json({ ok: false, message: err.message }); }
};

export const create: RequestHandler = async (req, res) => {
  try { const doc = await notifService.create({ ...req.body, sender: req.user?.sub }); res.status(201).json({ ok: true, data: doc }); }
  catch (err: any) { res.status(err.status || 500).json({ ok: false, message: err.message }); }
};

export const createReclamation: RequestHandler = async (req, res, next) => {
  try {
    const data = {
      ...req.body,
      sender: req.user?.sub,
      role: req.user?.role,
      wilaya_id: req.user?.wilaya_id,
      commune_id: req.user?.commune_id,
      center_id: req.user?.center_id,
      title: req.body.title || (req.body.type === "reclamation" ? "Nouvelle Réclamation" : "Nouveau Message"),
    };
    
    const notif = await notifService.createReclamation(data);
    res.status(201).json({ ok: true, data: notif });
  } catch (err) {
    next(err);
  }
};

export const listReclamations: RequestHandler = async (req, res, next) => {
  try {
    const query: any = { ...req.query };
    
    // Apply role-based filtering
    if (req.user?.role === "admin_wilaya") {
      query.wilaya_id = req.user.wilaya_id;
    } else if (req.user?.role === "admin_commun") {
      query.commune_id = req.user.commune_id;
    }
    
    const result = await notifService.findReclamations(query);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};
