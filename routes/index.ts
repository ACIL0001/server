import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { scopeGuard } from "../middleware/scopeGuard";
import { authLimiter, writeLimiter, uploadLimiter } from "../middleware/rateLimiters";
import { uploadImage, uploadMessageFiles } from "../middleware/upload";

// ── Auth ──
import * as authCtrl from "../modules/auth/auth.controller";
import {
  loginSchema,
  registerSuperAdminSchema,
  updateProfileSchema,
  changePasswordSchema,
} from "../modules/auth/auth.validator";

// ── Wilaya & Commune ──
import * as wilayaCtrl from "../modules/wilaya/wilaya.controller";
import * as wilayaVal from "../modules/wilaya/wilaya.validator";
import * as communeCtrl from "../modules/commune/commune.controller";
import * as communeVal from "../modules/commune/commune.validator";

// ── Admins ──
import * as adminCtrl from "../modules/admin/admin.controller";
import * as adminVal from "../modules/admin/admin.validator";

// ── Entities ──
import * as partiesCtrl from "../modules/parties/parties.controller";
import * as partiesVal from "../modules/parties/parties.validator";
import * as candidatsCtrl from "../modules/candidats/candidats.controller";
import * as candidatsVal from "../modules/candidats/candidats.validator";
import * as memberActifCtrl from "../modules/member-actif/member-actif.controller";
import * as memberActifVal from "../modules/member-actif/member-actif.validator";
import * as citizenCtrl from "../modules/citizen/citizen.controller";
import * as citizenVal from "../modules/citizen/citizen.validator";

// ── Infrastructure ──
import * as centerCtrl from "../modules/center/center.controller";
import * as centerVal from "../modules/center/center.validator";
import * as deskCtrl from "../modules/desk/desk.controller";
import * as deskVal from "../modules/desk/desk.validator";
import * as roleEdCtrl from "../modules/role-election-day/role-election-day.controller";
import * as roleEdVal from "../modules/role-election-day/role-election-day.validator";
import * as infraImportCtrl from "../modules/infrastructure/infrastructure-import.controller";

// ── Results ──
import * as resultDeskCtrl from "../modules/result-desk/result-desk.controller";
import * as resultDeskVal from "../modules/result-desk/result-desk.validator";
import * as resultCenterVal from "../modules/result-center/result-center.validator";

// ── Messaging ──

import * as notifCtrl from "../modules/notification/notification.controller";
import * as notifVal from "../modules/notification/notification.validator";

// ── Models for Inline Observer Routes ──
import { Party } from "../modules/parties/parties.model";
import { Candidat } from "../modules/candidats/candidats.model";
import { Desk } from "../modules/desk/desk.model";
import { Center } from "../modules/center/center.model";
import { ResultDesk } from "../modules/result-desk/result-desk.model";
import { RoleElectionDay } from "../modules/role-election-day/role-election-day.model";

// ── Settings ──
import * as settingsCtrl from "../modules/election-day-access/election-day-access.controller";

export const apiRouter = Router();

// ────────────────────────── Health ──────────────────────────
apiRouter.get("/health", (_req, res) => res.json({ ok: true }));

// ────────────────────────── Settings ──────────────────────────
apiRouter.get("/settings/public", settingsCtrl.getPublicSettings);
apiRouter.put("/settings", requireAuth, requireRoles("super_admin"), writeLimiter, settingsCtrl.updateSettings);

// ────────────────────────── Auth ────────────────────────────
apiRouter.post("/auth/register", authLimiter, validate(registerSuperAdminSchema), authCtrl.registerHandler);
apiRouter.post("/auth/login", authLimiter, validate(loginSchema), authCtrl.loginHandler);
apiRouter.post("/auth/refresh", authLimiter, authCtrl.refreshHandler);
apiRouter.post("/auth/logout", authCtrl.logoutHandler);
apiRouter.get("/auth/me", requireAuth, authCtrl.meHandler);
apiRouter.patch("/auth/me", requireAuth, writeLimiter, validate(updateProfileSchema), authCtrl.updateMeHandler);
apiRouter.patch("/auth/password", requireAuth, authLimiter, validate(changePasswordSchema), authCtrl.changePasswordHandler);

// ────────────────────────── Wilayas (public) ────────────────
apiRouter.get("/wilayas", validate(wilayaVal.listSchema), wilayaCtrl.list);
apiRouter.get("/wilayas/:id", validate(wilayaVal.getByIdSchema), wilayaCtrl.getById);
apiRouter.get("/wilayas/:id/communes", validate(wilayaVal.getByIdSchema), wilayaCtrl.getCommunes);
apiRouter.post("/wilayas", requireAuth, requireRoles("super_admin"), writeLimiter, validate(wilayaVal.createSchema), wilayaCtrl.create);
apiRouter.put("/wilayas/:id", requireAuth, requireRoles("super_admin"), writeLimiter, validate(wilayaVal.updateSchema), wilayaCtrl.update);
apiRouter.delete("/wilayas/:id", requireAuth, requireRoles("super_admin"), writeLimiter, wilayaCtrl.remove);

// ────────────────────────── Communes (public) ───────────────
apiRouter.get("/communes", validate(communeVal.listSchema), communeCtrl.list);
apiRouter.get("/communes/:id", validate(communeVal.getByIdSchema), communeCtrl.getById);
apiRouter.post("/communes", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, validate(communeVal.createSchema), scopeGuard(), communeCtrl.create);
apiRouter.put("/communes/:id", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, validate(communeVal.updateSchema), scopeGuard(), communeCtrl.update);
apiRouter.delete("/communes/:id", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, communeCtrl.remove);

// ────────────────────────── Admins (unified) ────────────────────
apiRouter.get("/admins", requireAuth, requireRoles("super_admin", "admin_wilaya"), validate(adminVal.listSchema), adminCtrl.list);
apiRouter.get("/admins/:id", requireAuth, requireRoles("super_admin", "admin_wilaya"), validate(adminVal.getByIdSchema), adminCtrl.getById);
apiRouter.post("/admins", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, validate(adminVal.createSchema), adminCtrl.create);
apiRouter.put("/admins/:id", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, validate(adminVal.updateSchema), adminCtrl.update);
apiRouter.delete("/admins/:id", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, adminCtrl.remove);

// ────────────────────────── Parties ─────────────────────────
apiRouter.get("/parties", requireAuth, validate(partiesVal.listSchema), scopeGuard(), partiesCtrl.list);
apiRouter.get("/parties/:id", requireAuth, validate(partiesVal.getByIdSchema), partiesCtrl.getById);
apiRouter.post("/parties", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, validate(partiesVal.createSchema), scopeGuard(), partiesCtrl.create);
apiRouter.put("/parties/:id", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, validate(partiesVal.updateSchema), partiesCtrl.update);
apiRouter.delete("/parties/:id", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, partiesCtrl.remove);

// ────────────────────────── Candidats ───────────────────────
apiRouter.get("/candidats", requireAuth, validate(candidatsVal.listSchema), scopeGuard(), candidatsCtrl.list);
apiRouter.get("/candidats/:id", requireAuth, validate(candidatsVal.getByIdSchema), candidatsCtrl.getById);
apiRouter.get("/candidats/:id/portrait", candidatsCtrl.getPortrait);
apiRouter.post("/candidats", requireAuth, requireRoles("super_admin", "admin_wilaya", "member_actif"), writeLimiter, uploadImage.single("image"), validate(candidatsVal.createSchema), scopeGuard(), candidatsCtrl.create);
apiRouter.put("/candidats/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "member_actif"), writeLimiter, uploadImage.single("image"), validate(candidatsVal.updateSchema), candidatsCtrl.update);
apiRouter.delete("/candidats/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "member_actif"), writeLimiter, candidatsCtrl.remove);

// ────────────────────────── Members Actifs ──────────────────
apiRouter.get("/members-actifs", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), validate(memberActifVal.listSchema), scopeGuard(), memberActifCtrl.list);
apiRouter.get("/members-actifs/:id", requireAuth, validate(memberActifVal.getByIdSchema), memberActifCtrl.getById);
apiRouter.post("/members-actifs", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, validate(memberActifVal.createSchema), scopeGuard(), memberActifCtrl.create);
apiRouter.put("/members-actifs/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, validate(memberActifVal.updateSchema), memberActifCtrl.update);
apiRouter.delete("/members-actifs/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, memberActifCtrl.remove);

// ────────────────────────── Citizens ────────────────────────
apiRouter.get(
  "/citizens",
  requireAuth,
  requireRoles("super_admin", "admin_wilaya", "admin_commun", "member_actif"),
  validate(citizenVal.listSchema),
  citizenCtrl.list
);
apiRouter.get("/citizens/:id", requireAuth, validate(citizenVal.getByIdSchema), citizenCtrl.getById);
apiRouter.post("/citizens", requireAuth, requireRoles("super_admin", "admin_commun", "member_actif"), writeLimiter, validate(citizenVal.createSchema), citizenCtrl.create);
apiRouter.put("/citizens/:id", requireAuth, requireRoles("super_admin", "admin_commun", "member_actif"), writeLimiter, validate(citizenVal.updateSchema), citizenCtrl.update);
apiRouter.delete("/citizens/:id", requireAuth, requireRoles("super_admin", "admin_commun", "member_actif"), writeLimiter, citizenCtrl.remove);

// ────────────────────────── Centers ─────────────────────────
apiRouter.get("/centers", requireAuth, validate(centerVal.listSchema), scopeGuard(), centerCtrl.list);
apiRouter.get("/centers/:id", requireAuth, validate(centerVal.getByIdSchema), centerCtrl.getById);
apiRouter.post("/centers", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, validate(centerVal.createSchema), scopeGuard(), centerCtrl.create);
apiRouter.put("/centers/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, validate(centerVal.updateSchema), scopeGuard(), centerCtrl.update);
apiRouter.delete("/centers/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, scopeGuard(), centerCtrl.remove);

// ────────────────────────── Desks ───────────────────────────
apiRouter.get("/desks", requireAuth, validate(deskVal.listSchema), deskCtrl.list);
apiRouter.get("/desks/:id", requireAuth, validate(deskVal.getByIdSchema), deskCtrl.getById);
apiRouter.post("/desks", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, validate(deskVal.createSchema), deskCtrl.create);
apiRouter.put("/desks/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, validate(deskVal.updateSchema), deskCtrl.update);
apiRouter.delete("/desks/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, deskCtrl.remove);

// ────────────────────────── Infrastructure Import ─────────────
apiRouter.post(
  "/infrastructure/import-centers-desks",
  requireAuth,
  requireRoles("super_admin"),
  writeLimiter,
  infraImportCtrl.importCentersAndDesks
);

// ────────────────────────── Roles Election Day ──────────────
apiRouter.get("/roles-election-day", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), validate(roleEdVal.listSchema), scopeGuard(), roleEdCtrl.list);
apiRouter.get("/roles-election-day/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), validate(roleEdVal.getByIdSchema), roleEdCtrl.getById);
apiRouter.post("/roles-election-day", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, validate(roleEdVal.createSchema), scopeGuard(), roleEdCtrl.create);
apiRouter.put("/roles-election-day/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, validate(roleEdVal.updateSchema), scopeGuard(), roleEdCtrl.update);
apiRouter.delete("/roles-election-day/:id", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, scopeGuard(), roleEdCtrl.remove);

// ────────────────────────── Results ─────────────────────────
apiRouter.post("/results/desk", requireAuth, requireRoles("role_election_day"), uploadLimiter, uploadImage.single("image"), validate(resultDeskVal.submitDeskSchema), resultDeskCtrl.submitDesk);
apiRouter.get("/results/desk", requireAuth, validate(resultDeskVal.listDeskSchema), resultDeskCtrl.listDesk);
apiRouter.get("/results/desk/:id/image", requireAuth, resultDeskCtrl.getDeskImage);
apiRouter.get("/results/desk/:id", requireAuth, validate(resultDeskVal.getByIdSchema), resultDeskCtrl.getDeskById);
apiRouter.put("/results/desk/:id/status", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun", "role_election_day"), writeLimiter, validate(resultDeskVal.updateStatusSchema), resultDeskCtrl.updateDeskStatus);
apiRouter.post("/results/desk/:id/ocr", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), writeLimiter, resultDeskCtrl.triggerOcr);
apiRouter.post("/results/desk/:id/human-review", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, resultDeskCtrl.requestHumanReview);

apiRouter.get("/results/ocr-summary", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), resultDeskCtrl.getOcrSummary);

// ── Verification ──
apiRouter.post("/results/desk/upload-image/:deskId", requireAuth, requireRoles("role_election_day"), uploadLimiter, uploadImage.single("image"), resultDeskCtrl.uploadDeskImage);
apiRouter.post("/results/desk/verify-desk/:deskId", requireAuth, requireRoles("role_election_day"), uploadLimiter, uploadImage.single("image"), validate(resultDeskVal.verifyDeskSchema), resultDeskCtrl.verifyDesk);
apiRouter.get("/results/desk/:deskId/verification", requireAuth, requireRoles("role_election_day"), validate(resultDeskVal.verifyDeskSchema), resultDeskCtrl.getDeskVerificationReport);

apiRouter.post("/results/center", requireAuth, requireRoles("role_election_day"), uploadLimiter, uploadImage.single("image"), validate(resultDeskVal.submitCenterSchema), resultDeskCtrl.submitCenter);
apiRouter.get("/results/center", requireAuth, validate(resultDeskVal.listCenterSchema), resultDeskCtrl.listCenter);
apiRouter.get("/results/center/:id", requireAuth, validate(resultDeskVal.getByIdSchema), resultDeskCtrl.getCenterById);

apiRouter.get("/results/aggregate/center/:centerId", requireAuth, resultDeskCtrl.aggregateByCenter);
apiRouter.get("/results/aggregate/wilaya/:wilayaId", requireAuth, resultDeskCtrl.aggregateByWilaya);
apiRouter.get("/results/aggregate/national", requireAuth, resultDeskCtrl.aggregateNational);

// ────────────────────────── Observer (Election Day) ──────────────────
apiRouter.get("/observer/my-desk", requireAuth, requireRoles("role_election_day"), async (req, res) => {
  try {
    const roleUser = await RoleElectionDay.findById(req.user?.sub).populate("center desk").lean();
    if (!roleUser) {
      return res.status(404).json({ ok: false, message: "Observer not found" });
    }
    res.json({ ok: true, data: roleUser });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

apiRouter.get("/observer/my-center", requireAuth, requireRoles("role_election_day"), async (req, res) => {
  try {
    const centerId = req.user?.center_id;
    if (!centerId) {
      return res.status(400).json({ ok: false, message: "No center assigned to this observer" });
    }
    const center = await Center.findById(centerId).lean();
    if (!center) {
      return res.status(404).json({ ok: false, message: "Center not found" });
    }
    const desks = await Desk.find({ center: centerId }).lean();
    const totalDesks = desks.length;
    const maleDesksCount = desks.filter((d: any) => d.type === "male").length;
    const femaleDesksCount = desks.filter((d: any) => d.type === "female").length;

    res.json({
      ok: true,
      data: {
        center,
        desks,
        stats: {
          totalDesks,
          maleDesksCount,
          femaleDesksCount,
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

apiRouter.get("/observer/parties-candidats", requireAuth, requireRoles("role_election_day"), async (req, res) => {
  try {
    const wilayaId = req.user?.wilaya_id;
    if (!wilayaId) {
      return res.status(400).json({ ok: false, message: "No wilaya associated with this observer" });
    }
    const parties = await Party.find({ wilaya: wilayaId }).lean();
    const candidats = await Candidat.find({ wilaya: wilayaId }).lean();
    
    const data = parties.map((p: any) => {
      const partyCandidats = candidats.filter((c: any) => String(c.party) === String(p._id)).map((c: any) => ({
        ...c,
        id: String(c._id)
      }));
      return {
        ...p,
        id: String(p._id),
        candidats: partyCandidats
      };
    });
    res.json({ ok: true, data });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

apiRouter.get("/observer/my-results", requireAuth, requireRoles("role_election_day"), async (req, res) => {
  try {
    const query: any = {};
    if (req.user?.desk_id) {
      query.desk = req.user.desk_id;
    } else {
      query.owner = req.user?.sub;
    }
    const results = await ResultDesk.find(query).lean();
    res.json({ ok: true, data: results });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Centre-scoped results for observateur_centre
apiRouter.get("/observer/centre-results", requireAuth, requireRoles("role_election_day"), async (req, res) => {
  try {
    const centerId = req.user?.center_id;
    if (!centerId) {
      return res.status(400).json({ ok: false, message: "No center assigned to this observer" });
    }

    const { page = 1, limit = 30, status } = req.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const deskMatch: any = { center: new (await import("mongoose")).Types.ObjectId(centerId) };
    const desks = await Desk.find(deskMatch).select("_id").lean();
    const deskIds = desks.map((d: any) => d._id);

    const resultFilter: any = { desk: { $in: deskIds } };
    if (status) resultFilter.status = status;

    const [total, results] = await Promise.all([
      ResultDesk.countDocuments(resultFilter),
      ResultDesk.find(resultFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("desk", "desk_number type")
        .populate("candidat", "full_name")
        .populate("party", "name")
        .select("-image -image_mimetype")
        .lean(),
    ]);

    // Add hasImage flag by checking if image field exists
    const resultsWithFlag = await Promise.all(
      results.map(async (r: any) => {
        const doc = await ResultDesk.exists({ _id: r._id, $expr: { $ne: [{ $type: "$image" }, "missing"] } });
        return { ...r, hasImage: !!doc };
      })
    );

    res.json({
      ok: true,
      data: resultsWithFlag,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});



// ────────────────────────── Notifications ───────────────────
apiRouter.get("/notifications", requireAuth, validate(notifVal.listSchema), notifCtrl.list);
apiRouter.put("/notifications/:id/read", requireAuth, notifCtrl.markRead);
apiRouter.put("/notifications/read-all", requireAuth, notifCtrl.markAllRead);
apiRouter.post("/notifications", requireAuth, requireRoles("super_admin", "admin_wilaya"), writeLimiter, validate(notifVal.createSchema), notifCtrl.create);
apiRouter.post("/notifications/reclamation", requireAuth, requireRoles("role_election_day"), writeLimiter, validate(notifVal.createReclamationSchema), notifCtrl.createReclamation);
apiRouter.get("/notifications/reclamation", requireAuth, requireRoles("super_admin", "admin_wilaya", "admin_commun"), notifCtrl.listReclamations);

