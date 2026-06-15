import type { RequestHandler } from "express";
import { RoleElectionDay } from "./role-election-day.model";
import {
  makeListHandler,
  makeDeleteHandler,
} from "../common/crud.controller";
import * as crud from "../common/crud.helpers";
import { hashPassword } from "../auth/auth.service";
import { normalizeAlgerianPhone } from "../../lib/phone";
import { sendRoleAssignmentNotification } from "./role-election-day.notify";

const POPULATE = ["wilaya", "commune", "center", "desk"] as const;

const CREDENTIAL_VIEW_ROLES = new Set(["super_admin", "admin_wilaya", "admin_commun"]);

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]?\$/.test(value);
}

/** Plain password for admin UI / SMS (password_plain field, or legacy unhashed password). */
function resolvePlainPassword(doc: { password_plain?: string; password?: string }): string {
  const plain = String(doc.password_plain || "").trim();
  if (plain) return plain;

  const stored = String(doc.password || "").trim();
  if (stored && !isBcryptHash(stored)) return stored;

  return "";
}

function serializeRoleDoc(doc: Record<string, unknown>, includeCredentials: boolean) {
  const out: Record<string, unknown> = {
    ...doc,
    id: doc._id ?? doc.id,
  };
  delete out.password;
  delete out.__v;

  if (includeCredentials) {
    out.password_plain = resolvePlainPassword(
      doc as { password_plain?: string; password?: string }
    );
  } else {
    delete out.password_plain;
  }

  return out;
}

function normalizeMissionTime(t?: string): string {
  const raw = String(t || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

function normalizeMissionDateKey(d?: Date | string): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function missionFieldsChanged(
  existing: { role?: string; assigned_time?: string; assigned_date?: Date | string },
  data: Record<string, unknown>
): boolean {
  if (data.role !== undefined && String(data.role) !== String(existing.role || "")) {
    return true;
  }
  if (
    data.assigned_time !== undefined &&
    normalizeMissionTime(String(data.assigned_time)) !== normalizeMissionTime(existing.assigned_time)
  ) {
    return true;
  }
  if (
    data.assigned_date !== undefined &&
    normalizeMissionDateKey(data.assigned_date as Date | string) !==
      normalizeMissionDateKey(existing.assigned_date)
  ) {
    return true;
  }
  return false;
}

export const list = makeListHandler(
  RoleElectionDay,
  (q) => {
    const f: Record<string, unknown> = {};
    if (q.wilaya) f.wilaya = q.wilaya;
    if (q.commune) f.commune = q.commune;
    if (q.center) f.center = q.center;
    if (q.role) f.role = q.role;
    if (q.search) f.full_name = { $regex: q.search, $options: "i" };
    return f;
  },
  undefined,
  [...POPULATE]
);

export const getById: RequestHandler = async (req, res) => {
  try {
    const canSeeCredentials = CREDENTIAL_VIEW_ROLES.has(req.user?.role || "");
    let query = RoleElectionDay.findById(req.params.id);
    if (canSeeCredentials) {
      query = query.select("+password_plain +password");
    }
    const doc = await query.populate([...POPULATE]).lean();
    if (!doc) {
      return res.status(404).json({ ok: false, message: "Not found" });
    }

    const plain = resolvePlainPassword(doc as { password_plain?: string; password?: string });
    if (canSeeCredentials && plain && !(doc as { password_plain?: string }).password_plain) {
      await RoleElectionDay.updateOne(
        { _id: doc._id },
        { $set: { password_plain: plain } }
      );
      (doc as { password_plain?: string }).password_plain = plain;
    }

    res.json({
      ok: true,
      data: serializeRoleDoc(doc as unknown as Record<string, unknown>, canSeeCredentials),
    });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    res.status(e.status || 500).json({ ok: false, message: e.message || "Get failed" });
  }
};

function normalizePhoneField(data: Record<string, unknown>): string | null {
  const normalized = normalizeAlgerianPhone(String(data.phone || ""));
  if (normalized) data.phone = normalized;
  return normalized;
}

export const create: RequestHandler = async (req, res) => {
  try {
    const data = { ...req.body };
    if (!normalizePhoneField(data)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid phone (use 05 Ooredoo, 06 Mobilis, 07 Djezzy — 10 digits)",
      });
    }
    const plainPassword = String(data.password || "");
    const accountEmail = String(data.email || "").trim().toLowerCase();
    const nin = String(data.nin || "").trim();

    // Prevent duplicates with same NIN or email (friendly error before DB insert).
    const existing = await RoleElectionDay.findOne({
      $or: [{ nin }, { email: accountEmail }],
    })
      .select("nin email")
      .lean();
    if (existing) {
      const existingAny = existing as unknown as { nin?: string; email?: string };
      const conflicts: string[] = [];
      if (existingAny.nin && existingAny.nin === nin) conflicts.push("NIN");
      if (existingAny.email && String(existingAny.email).toLowerCase() === accountEmail) conflicts.push("Email");
      return res.status(409).json({
        ok: false,
        message:
          conflicts.length > 0
            ? `Duplicate ${conflicts.join(" & ")}: a role already exists with the same ${conflicts.join(" and ")}`
            : "Duplicate entry: a role already exists with the same NIN or email",
      });
    }

    data.password = await hashPassword(plainPassword);
    data.password_plain = plainPassword;
    data.email = accountEmail;
    data.created_by = req.user?.sub;

    const doc = await crud.createDoc(RoleElectionDay, data);

    const populated = await RoleElectionDay.findById(doc._id)
      .populate([...POPULATE])
      .lean();

    let sms: {
      sent: boolean;
      error?: string;
      phone?: string;
      parts?: number;
    } = { sent: false };
    if (populated) {
      try {
        const notifyResult = await sendRoleAssignmentNotification(
          populated as unknown as Record<string, unknown>,
          { email: accountEmail, plainPassword }
        );
        sms = {
          sent: notifyResult.sent,
          error: notifyResult.error,
          phone: notifyResult.phone || String((populated as { phone?: string }).phone || ""),
          parts: notifyResult.parts,
        };
        if (!notifyResult.sent) {
          // eslint-disable-next-line no-console
          console.error("[role-election-day] SMS not sent:", notifyResult.error);
        }
      } catch (smsErr) {
        // eslint-disable-next-line no-console
        console.error("[role-election-day] SMS notification failed:", smsErr);
        sms = {
          sent: false,
          error: smsErr instanceof Error ? smsErr.message : "SMS notification failed",
        };
      }
    } else {
      sms = { sent: false, error: "Could not load created user for SMS" };
    }

    res.status(201).json({ ok: true, data: doc, sms });
  } catch (err: unknown) {
    const e = err as { code?: number; status?: number; message?: string; keyPattern?: unknown };
    if (e.code === 11000) {
      return res.status(409).json({ ok: false, message: "Duplicate entry", details: e.keyPattern });
    }
    res.status(e.status || 500).json({ ok: false, message: e.message || "Create failed" });
  }
};

export const update: RequestHandler = async (req, res) => {
  try {
    const id = String(req.params.id);
    const existing = await RoleElectionDay.findById(id).select("+password_plain").lean();
    if (!existing) {
      return res.status(404).json({ ok: false, message: "Not found" });
    }

    const data: Record<string, unknown> = { ...req.body };
    if (data.phone !== undefined && !normalizePhoneField(data)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid phone (use 05 Ooredoo, 06 Mobilis, 07 Djezzy — 10 digits)",
      });
    }

    // If email/nin are being updated, prevent duplicates with another record.
    const nextEmail =
      data.email !== undefined ? String(data.email || "").trim().toLowerCase() : null;
    const nextNin = data.nin !== undefined ? String(data.nin || "").trim() : null;
    if (nextEmail || nextNin) {
      const dup = await RoleElectionDay.findOne({
        _id: { $ne: id },
        $or: [
          ...(nextNin ? [{ nin: nextNin }] : []),
          ...(nextEmail ? [{ email: nextEmail }] : []),
        ],
      })
        .select("nin email")
        .lean();
      if (dup) {
        const d = dup as unknown as { nin?: string; email?: string };
        const conflicts: string[] = [];
        if (nextNin && d.nin === nextNin) conflicts.push("NIN");
        if (nextEmail && String(d.email).toLowerCase() === nextEmail) conflicts.push("Email");
        return res.status(409).json({
          ok: false,
          message:
            conflicts.length > 0
              ? `Duplicate ${conflicts.join(" & ")}: another role already exists with the same ${conflicts.join(" and ")}`
              : "Duplicate entry: another role already exists with the same NIN or email",
        });
      }
      if (nextEmail) data.email = nextEmail;
      if (nextNin) data.nin = nextNin;
    }

    let plainPassword = resolvePlainPassword(
      existing as { password_plain?: string; password?: string }
    );

    if (data.password !== undefined && String(data.password).trim()) {
      plainPassword = String(data.password);
      data.password = await hashPassword(plainPassword);
      data.password_plain = plainPassword;
    } else {
      delete data.password;
    }

    const shouldResendSms = missionFieldsChanged(existing, data);
    const accountEmail = String(data.email || existing.email || "")
      .trim()
      .toLowerCase();

    const doc = await crud.updateDoc(RoleElectionDay, id, data as Record<string, unknown>);

    let sms: { sent: boolean; error?: string; phone?: string; parts?: number; skipped?: boolean } = {
      sent: false,
      skipped: !shouldResendSms,
    };

    if (shouldResendSms) {
      if (!plainPassword) {
        sms = {
          sent: false,
          skipped: false,
          error: "No stored password — set a new password before resending SMS",
        };
      } else {
        const populated = await RoleElectionDay.findById(id).populate([...POPULATE]).lean();
        if (populated) {
          try {
            const notifyResult = await sendRoleAssignmentNotification(
              populated as unknown as Record<string, unknown>,
              { email: accountEmail, plainPassword }
            );
            sms = {
              sent: notifyResult.sent,
              error: notifyResult.error,
              phone: notifyResult.phone || String((populated as { phone?: string }).phone || ""),
              parts: notifyResult.parts,
              skipped: false,
            };
          } catch (smsErr) {
            sms = {
              sent: false,
              skipped: false,
              error: smsErr instanceof Error ? smsErr.message : "SMS notification failed",
            };
          }
        }
      }
    }

    res.json({ ok: true, data: doc, sms });
  } catch (err: unknown) {
    const e = err as { code?: number; status?: number; message?: string; keyPattern?: unknown };
    if (e.code === 11000) {
      return res.status(409).json({ ok: false, message: "Duplicate entry", details: e.keyPattern });
    }
    res.status(e.status || 500).json({ ok: false, message: e.message || "Update failed" });
  }
};

export const remove = makeDeleteHandler(RoleElectionDay);
