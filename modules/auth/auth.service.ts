import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { Admin, type AdminRole } from "../admin/admin.model";
import { MemberActif } from "../member-actif/member-actif.model";
import { RoleElectionDay } from "../role-election-day/role-election-day.model";
import { getRedis } from "../../db/redis";
import type { UserRole, JwtUser } from "../../middleware/auth";
import crypto from "node:crypto";

const ALLOWED_OBSERVER_ROLES = ["observateur_bureau", "observateur_centre"];

const BCRYPT_ROUNDS = 12;
const ACCESS_EXPIRES = "7d";
const REFRESH_EXPIRES_SEC = 7 * 24 * 60 * 60; // 7 days
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_SEC = 15 * 60; // 15 min

const DASHBOARD_ROLES: AdminRole[] = ["super_admin", "admin_wilaya", "admin_commun"];

function refId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
}

export function toAuthUser(user: Record<string, unknown>) {
  return {
    id: String(user._id),
    _id: String(user._id),
    full_name: user.full_name as string,
    email: user.email as string,
    phone: user.phone as string,
    nin: user.nin as string,
    role: user.role as UserRole,
    wilaya_id: refId(user.wilaya),
    commune_id: refId(user.commune),
    party_id: refId(user.party),
    status: (user.status as string) || "active",
    date_of_birth: user.date_of_birth
      ? new Date(user.date_of_birth as string | Date).toISOString().slice(0, 10)
      : undefined,
    goal: user.goal as string | undefined,
    election_role: (user.election_role || user.electionRole) as string | undefined,
    center_id: user.center ? refId(user.center) : (user.center_id as string | undefined),
    desk_id: user.desk ? refId(user.desk) : (user.desk_id as string | undefined),
  };
}

function signAccessToken(user: JwtUser): string {
  return jwt.sign(
    {
      role: user.role,
      wilaya_id: user.wilaya_id,
      commune_id: user.commune_id,
      election_role: user.election_role,
      center_id: user.center_id,
      desk_id: user.desk_id,
    },
    env.jwt.accessSecret,
    { subject: user.sub, issuer: env.jwt.issuer, audience: env.jwt.audience, expiresIn: ACCESS_EXPIRES }
  );
}

function signRefreshToken(sub: string, familyId: string): { token: string; jti: string } {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { familyId },
    env.jwt.accessSecret,
    { subject: sub, jwtid: jti, issuer: env.jwt.issuer, audience: env.jwt.audience, expiresIn: `${REFRESH_EXPIRES_SEC}s` }
  );
  return { token, jti };
}

async function checkLockout(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const attempts = await redis.get(`lockout:${key}`);
  return attempts !== null && parseInt(attempts, 10) >= MAX_LOGIN_ATTEMPTS;
}

async function recordFailedAttempt(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const k = `lockout:${key}`;
  await redis.incr(k);
  await redis.expire(k, LOCKOUT_SEC);
}

async function clearAttempts(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`lockout:${key}`);
}

export async function findAdminById(id: string) {
  const user = await Admin.findById(id).populate("wilaya commune").lean();
  if (!user) return null;
  return toAuthUser(user as unknown as Record<string, unknown>);
}

export async function findMemberActifById(id: string) {
  const user = await MemberActif.findById(id).populate("wilaya commune party").lean();
  if (!user) return null;
  const { password: _pw, ...safe } = user as typeof user & { password?: string };
  return toAuthUser({ ...safe, role: "member_actif", status: "active" } as unknown as Record<string, unknown>);
}

export async function findRoleElectionDayById(id: string) {
  const user = await RoleElectionDay.findById(id).populate("wilaya commune center desk").lean();
  if (!user) return null;
  const { password: _pw, ...safe } = user as typeof user & { password?: string };
  return {
    ...toAuthUser({ ...safe, role: "role_election_day", status: "active" } as unknown as Record<string, unknown>),
    election_role: user.role,
    center_id: user.center ? String(typeof user.center === "object" && "_id" in user.center ? user.center._id : user.center) : undefined,
    desk_id: user.desk ? String(typeof user.desk === "object" && "_id" in user.desk ? user.desk._id : user.desk) : undefined,
  };
}

/** Resolve dashboard user from Admin, MemberActif, or RoleElectionDay */
export async function findUserById(id: string) {
  const admin = await findAdminById(id);
  if (admin) return admin;
  const member = await findMemberActifById(id);
  if (member) return member;
  return findRoleElectionDayById(id);
}

async function issueSession(jwtUser: JwtUser, safeUser: Record<string, unknown>) {
  const accessToken = signAccessToken(jwtUser);
  const familyId = crypto.randomUUID();
  const { token: refreshToken, jti } = signRefreshToken(jwtUser.sub, familyId);

  const redis = getRedis();
  if (redis) {
    await redis.set(
      `rt:${jti}`,
      JSON.stringify({ familyId, sub: jwtUser.sub, used: false }),
      "EX",
      REFRESH_EXPIRES_SEC
    );
  }

  return {
    accessToken,
    refreshToken,
    user: toAuthUser(safeUser),
  };
}

// ── Login: Admin first, then MemberActif ───────────────────────

export async function login(emailInput: string, passwordInput: string, ip: string) {
  if (await checkLockout(`ip:${ip}`)) {
    throw Object.assign(new Error("Too many login attempts. Try again later."), { status: 429 });
  }

  const emailNorm = emailInput.toLowerCase().trim();

  const admin = await Admin.findOne({ email: emailNorm, status: "active" })
    .select("+password")
    .populate("wilaya commune")
    .lean();

  if (admin) {
    if (!DASHBOARD_ROLES.includes(admin.role as AdminRole)) {
      throw Object.assign(new Error("Access denied for this account type"), { status: 403 });
    }

    if (await checkLockout(`acct:${admin._id}`)) {
      throw Object.assign(new Error("Account locked. Try again later."), { status: 429 });
    }

    const match = await bcrypt.compare(passwordInput, admin.password);
    if (!match) {
      await recordFailedAttempt(`ip:${ip}`);
      await recordFailedAttempt(`acct:${admin._id}`);
      throw Object.assign(new Error("Invalid email or password"), { status: 401 });
    }

    await clearAttempts(`ip:${ip}`);
    await clearAttempts(`acct:${admin._id}`);

    const jwtUser: JwtUser = {
      sub: String(admin._id),
      role: admin.role as UserRole,
      wilaya_id: refId(admin.wilaya),
      commune_id: refId(admin.commune),
    };

    const { password: _pw, ...safeUser } = admin;
    return await issueSession(jwtUser, { ...safeUser, role: admin.role } as unknown as Record<string, unknown>);
  }

  const member = await MemberActif.findOne({ email: emailNorm })
    .select("+password")
    .populate("wilaya commune party")
    .lean();

  if (member) {
    if (await checkLockout(`acct:${member._id}`)) {
      throw Object.assign(new Error("Account locked. Try again later."), { status: 429 });
    }

    const matchMember = await bcrypt.compare(passwordInput, member.password);
    if (!matchMember) {
      await recordFailedAttempt(`ip:${ip}`);
      await recordFailedAttempt(`acct:${member._id}`);
      throw Object.assign(new Error("Invalid email or password"), { status: 401 });
    }

    await clearAttempts(`ip:${ip}`);
    await clearAttempts(`acct:${member._id}`);

    const jwtUser: JwtUser = {
      sub: String(member._id),
      role: "member_actif",
      wilaya_id: refId(member.wilaya),
      commune_id: refId(member.commune),
    };

    const { password: _pw, ...safeMember } = member;
    return await issueSession(jwtUser, {
      ...safeMember,
      role: "member_actif",
      status: "active",
    } as unknown as Record<string, unknown>);
  }

  // ── Login: RoleElectionDay (observateur_bureau / observateur_centre) ──
  const roleUser = await RoleElectionDay.findOne({ email: emailNorm })
    .select("+password")
    .populate("wilaya commune center desk")
    .lean();

  if (!roleUser) {
    await recordFailedAttempt(`ip:${ip}`);
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  if (!ALLOWED_OBSERVER_ROLES.includes(roleUser.role)) {
    throw Object.assign(new Error("Access denied for this account type"), { status: 403 });
  }

  // Check if Election Day is open
  const { ElectionDay } = await import("../election-day-access/election-day-access.model");
  const settings = await ElectionDay.findOne();
  if (!settings || !settings.is_election_day_open) {
    throw Object.assign(new Error("L'élection n'est pas encore ouverte."), { status: 403 });
  }

  if (await checkLockout(`acct:${roleUser._id}`)) {
    throw Object.assign(new Error("Account locked. Try again later."), { status: 429 });
  }

  const matchRole = await bcrypt.compare(passwordInput, roleUser.password);
  if (!matchRole) {
    await recordFailedAttempt(`ip:${ip}`);
    await recordFailedAttempt(`acct:${roleUser._id}`);
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }

  await clearAttempts(`ip:${ip}`);
  await clearAttempts(`acct:${roleUser._id}`);

  const jwtUserRole: JwtUser = {
    sub: String(roleUser._id),
    role: "role_election_day",
    wilaya_id: refId(roleUser.wilaya),
    commune_id: refId(roleUser.commune),
    election_role: roleUser.role,
    center_id: refId(roleUser.center),
    desk_id: refId(roleUser.desk),
  };

  const { password: _pwRole, ...safeRoleUser } = roleUser;
  return await issueSession(jwtUserRole, {
    ...safeRoleUser,
    role: "role_election_day",
    election_role: roleUser.role,
    center_id: refId(roleUser.center),
    desk_id: refId(roleUser.desk),
    status: "active",
  } as unknown as Record<string, unknown>);
}

export async function refreshTokens(oldRefreshToken: string) {
  let decoded: jwt.JwtPayload;
  try {
    decoded = jwt.verify(oldRefreshToken, env.jwt.accessSecret, {
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    }) as jwt.JwtPayload;
  } catch {
    throw Object.assign(new Error("Invalid refresh token"), { status: 401 });
  }

  const jti = decoded.jti;
  const sub = decoded.sub;
  const familyId = decoded.familyId as string;
  if (!jti || !sub || !familyId) {
    throw Object.assign(new Error("Invalid refresh token"), { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    throw Object.assign(new Error("Refresh tokens require Redis"), { status: 500 });
  }

  const stored = await redis.get(`rt:${jti}`);
  if (!stored) {
    throw Object.assign(new Error("Refresh token expired or revoked"), { status: 401 });
  }

  const meta = JSON.parse(stored) as { familyId: string; sub: string; used: boolean };

  if (meta.used) {
    const keys = await redis.keys(`rt:*`);
    for (const key of keys) {
      const val = await redis.get(key);
      if (val) {
        try {
          const parsed = JSON.parse(val);
          if (parsed.familyId === familyId) await redis.del(key);
        } catch { /* skip */ }
      }
    }
    throw Object.assign(new Error("Refresh token reuse detected — session revoked"), { status: 401 });
  }

  await redis.set(`rt:${jti}`, JSON.stringify({ ...meta, used: true }), "EX", 60);

  let jwtUser: JwtUser;

  const userDoc = await Admin.findById(sub).lean();
  if (userDoc && userDoc.status === "active") {
    jwtUser = {
      sub,
      role: userDoc.role as UserRole,
      wilaya_id: userDoc.wilaya ? String(userDoc.wilaya) : undefined,
      commune_id: userDoc.commune ? String(userDoc.commune) : undefined,
    };
  } else {
    const memberDoc = await MemberActif.findById(sub).lean();
    if (memberDoc) {
      jwtUser = {
        sub,
        role: "member_actif",
        wilaya_id: memberDoc.wilaya ? String(memberDoc.wilaya) : undefined,
        commune_id: memberDoc.commune ? String(memberDoc.commune) : undefined,
      };
    } else {
      const roleDoc = await RoleElectionDay.findById(sub).lean();
      if (!roleDoc) {
        throw Object.assign(new Error("User not found"), { status: 401 });
      }
      jwtUser = {
        sub,
        role: "role_election_day",
        wilaya_id: roleDoc.wilaya ? String(roleDoc.wilaya) : undefined,
        commune_id: roleDoc.commune ? String(roleDoc.commune) : undefined,
        election_role: roleDoc.role,
        center_id: roleDoc.center ? String(roleDoc.center) : undefined,
        desk_id: roleDoc.desk ? String(roleDoc.desk) : undefined,
      };
    }
  }

  const accessToken = signAccessToken(jwtUser);
  const { token: newRefreshToken, jti: newJti } = signRefreshToken(sub, familyId);
  await redis.set(`rt:${newJti}`, JSON.stringify({ familyId, sub, used: false }), "EX", REFRESH_EXPIRES_SEC);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken: string): Promise<void> {
  try {
    const decoded = jwt.verify(refreshToken, env.jwt.accessSecret, {
      issuer: env.jwt.issuer,
      audience: env.jwt.audience,
    }) as jwt.JwtPayload;
    const redis = getRedis();
    if (redis && decoded.jti) await redis.del(`rt:${decoded.jti}`);
  } catch { /* token already expired */ }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/** Public registration — always creates role super_admin */
export async function registerSuperAdmin(data: {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  nin: string;
}) {
  const emailNorm = data.email.toLowerCase().trim();

  if (await Admin.findOne({ email: emailNorm })) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }
  if (await Admin.findOne({ nin: data.nin.trim() })) {
    throw Object.assign(new Error("NIN already registered"), { status: 409 });
  }

  const hashed = await hashPassword(data.password);
  await Admin.create({
    full_name: data.full_name.trim(),
    email: emailNorm,
    password: hashed,
    phone: data.phone.trim(),
    nin: data.nin.trim(),
    role: "super_admin",
    status: "active",
  });

  return await login(emailNorm, data.password, "register");
}

async function assertEmailAvailable(emailNorm: string, userId: string): Promise<void> {
  const adminTaken = await Admin.findOne({ email: emailNorm });
  if (adminTaken && String(adminTaken._id) !== userId) {
    throw Object.assign(new Error("Email already in use"), { status: 409 });
  }
  const memberTaken = await MemberActif.findOne({ email: emailNorm });
  if (memberTaken && String(memberTaken._id) !== userId) {
    throw Object.assign(new Error("Email already in use"), { status: 409 });
  }
}

export async function updateProfile(
  userId: string,
  role: UserRole,
  data: {
    full_name?: string;
    email?: string;
    phone?: string;
    goal?: string;
    date_of_birth?: string;
  }
) {
  if (role === "member_actif") {
    const member = await MemberActif.findById(userId);
    if (!member) {
      throw Object.assign(new Error("User not found"), { status: 404 });
    }
    if (data.full_name !== undefined) member.full_name = data.full_name.trim();
    if (data.phone !== undefined) member.phone = data.phone.trim();
    if (data.goal !== undefined) member.goal = data.goal.trim() || undefined;
    if (data.date_of_birth !== undefined) {
      member.date_of_birth = new Date(data.date_of_birth);
    }
    if (data.email !== undefined) {
      const emailNorm = data.email.toLowerCase().trim();
      if (emailNorm !== member.email) {
        await assertEmailAvailable(emailNorm, userId);
        member.email = emailNorm;
      }
    }
    await member.save();
    const updated = await findMemberActifById(userId);
    if (!updated) throw Object.assign(new Error("User not found"), { status: 404 });
    return updated;
  }

  const admin = await Admin.findById(userId);
  if (!admin) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  if (data.full_name !== undefined) admin.full_name = data.full_name.trim();
  if (data.phone !== undefined) admin.phone = data.phone.trim();
  if (data.email !== undefined) {
    const emailNorm = data.email.toLowerCase().trim();
    if (emailNorm !== admin.email) {
      await assertEmailAvailable(emailNorm, userId);
      admin.email = emailNorm;
    }
  }
  await admin.save();
  const updated = await findAdminById(userId);
  if (!updated) throw Object.assign(new Error("User not found"), { status: 404 });
  return updated;
}

export async function changePassword(
  userId: string,
  role: UserRole,
  currentPassword: string,
  newPassword: string
) {
  if (role === "member_actif") {
    const member = await MemberActif.findById(userId).select("+password");
    if (!member) {
      throw Object.assign(new Error("User not found"), { status: 404 });
    }
    const match = await bcrypt.compare(currentPassword, member.password);
    if (!match) {
      throw Object.assign(new Error("Current password is incorrect"), { status: 400 });
    }
    member.password = await hashPassword(newPassword);
    await member.save();
    return;
  }

  const admin = await Admin.findById(userId).select("+password");
  if (!admin) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }
  const match = await bcrypt.compare(currentPassword, admin.password);
  if (!match) {
    throw Object.assign(new Error("Current password is incorrect"), { status: 400 });
  }
  admin.password = await hashPassword(newPassword);
  await admin.save();
}
