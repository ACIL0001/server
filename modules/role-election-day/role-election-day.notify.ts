import { sendSms } from "../../lib/sms";
import { normalizeAlgerianPhone } from "../../lib/phone";
import { env } from "../../config/env";

const ROLE_LABELS_FR: Record<string, string> = {
  chef_centre: "Chef de centre",
  observateur_bureau: "Observateur de bureau",
  observateur_centre: "Observateur de centre",
  scrutateur: "Scrutateur",
};

const ROLE_LABELS_AR: Record<string, string> = {
  chef_centre: "رئيس مركز",
  observateur_bureau: "مراقب مكتب",
  observateur_centre: "مراقب مركز",
  scrutateur: "مصوت",
};

type PopulatedRef = { name?: string; name_fr?: string; name_ar?: string; desk_number?: number } | null;

function centerDisplayName(doc: Record<string, unknown>): string {
  const location = typeof doc.location === "string" ? doc.location.trim() : "";
  if (location) return location;

  const center = doc.center as PopulatedRef;
  if (center?.name_fr) return center.name_fr;
  if (center?.name_ar) return center.name_ar;
  if (center?.name) return center.name;

  return "—";
}

function formatMissionDayFr(date: Date | string | undefined): string {
  if (date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    }
  }
  return "2 juillet";
}

function formatMissionDayAr(date: Date | string | undefined): string {
  if (date) {
    const d = date instanceof Date ? date : new Date(date);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("ar-DZ", { day: "numeric", month: "long" });
    }
  }
  return "2 جويلية";
}

function formatMissionTime(assignedTime: string | undefined): string {
  const raw = (assignedTime || "08:00").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "8h00";
  const h = String(Number(match[1]));
  const m = match[2];
  return `${h}h${m}`;
}

function buildFrenchMessage(params: {
  fullName: string;
  role: string;
  centerName: string;
  missionDayFr: string;
  missionTime: string;
  email: string;
  password: string;
}): string {
  const name = params.fullName.trim() || "";
  const roleFr = ROLE_LABELS_FR[params.role] || params.role;

  return [
    `PVP - Bonjour ${name}.`,
    `Mission: ${params.missionDayFr} a ${params.missionTime}, centre ${params.centerName}, role ${roleFr}.`,
    "Acces plateforme:",
    `Email: ${params.email}`,
    `Mot de passe: ${params.password}`,
  ].join("\n");
}

function buildArabicMessage(params: {
  fullName: string;
  role: string;
  centerName: string;
  missionDayAr: string;
  missionTime: string;
  email: string;
  password: string;
}): string {
  const name = params.fullName.trim() || "";
  const roleAr = ROLE_LABELS_AR[params.role] || params.role;

  return [
    `PVP - مرحبا ${name}.`,
    `المهمة: ${params.missionDayAr} الساعة ${params.missionTime}، المركز ${params.centerName}، الدور ${roleAr}.`,
    "الدخول للمنصة:",
    `البريد: ${params.email}`,
    `كلمة المرور: ${params.password}`,
  ].join("\n");
}

export type RoleSmsNotifyResult = {
  sent: boolean;
  error?: string;
  phone?: string;
  parts?: number;
};

export type RoleSmsCredentials = {
  email: string;
  plainPassword: string;
};

/**
 * Send assignment SMS (FR then AR) so the full message is never truncated.
 */
export async function sendRoleAssignmentNotification(
  doc: Record<string, unknown>,
  credentials: RoleSmsCredentials
): Promise<RoleSmsNotifyResult> {
  if (!env.roleSms.enabled) {
    return { sent: false, error: "Role assignment SMS disabled" };
  }

  const phone = normalizeAlgerianPhone(String(doc.phone || ""));
  if (!phone) {
    return { sent: false, error: "Invalid or missing phone number (05/06/07 + 8 digits)" };
  }

  const email = credentials.email.trim();
  const password = credentials.plainPassword;
  if (!email || !password) {
    return { sent: false, error: "Email and password are required for SMS" };
  }

  const assignedDate = doc.assigned_date as Date | string | undefined;
  const base = {
    fullName: String(doc.full_name || ""),
    role: String(doc.role || ""),
    centerName: centerDisplayName(doc),
    missionTime: formatMissionTime(doc.assigned_time as string | undefined),
    email,
    password,
  };

  const french = buildFrenchMessage({
    ...base,
    missionDayFr: formatMissionDayFr(assignedDate),
  });

  const arabic = buildArabicMessage({
    ...base,
    missionDayAr: formatMissionDayAr(assignedDate),
  });

  const smsFr = await sendSms(phone, french);
  if (!smsFr.ok) {
    return {
      sent: false,
      error: smsFr.error || "SMS (FR) send failed",
      phone,
    };
  }

  const smsAr = await sendSms(phone, arabic);
  if (!smsAr.ok) {
    return {
      sent: false,
      error: smsAr.error || "SMS (AR) send failed",
      phone,
      parts: (smsFr.parts || 1) + (smsAr.parts || 0),
    };
  }

  return {
    sent: true,
    phone,
    parts: (smsFr.parts || 1) + (smsAr.parts || 1),
  };
}
