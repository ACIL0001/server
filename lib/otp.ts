import crypto from "node:crypto";
import { env } from "../config/env";
import { getRedis } from "../db/redis";
import { normalizeAlgerianPhone } from "./phone";

type OtpRecord = { code: string; purpose: string; createdAt: number };

const memoryOtps = new Map<string, OtpRecord>();
const memoryDailyAttempts = new Map<string, { count: number; dayKey: string }>();
const memoryRateUntil = new Map<string, number>();

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function otpStorageKey(phone: string, purpose: string): string {
  return `otp:${purpose}:${phone}`;
}

function dailyKey(phone: string): string {
  return `otp:daily:${phone}:${todayKey()}`;
}

function rateKey(phone: string): string {
  return `otp:rate:${phone}`;
}

export function generateOtpCode(): string {
  const length = env.otp.length;
  if (env.otp.type === "NUMERIC") {
    let code = "";
    for (let i = 0; i < length; i++) {
      code += crypto.randomInt(0, 10).toString();
    }
    return code;
  }
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length).toUpperCase();
}

async function checkRateLimit(phone: string): Promise<string | null> {
  const redis = getRedis();
  const limitMs = env.otp.rateLimitMinutes * 60 * 1000;

  if (redis) {
    const exists = await redis.get(rateKey(phone));
    if (exists) {
      return `Please wait ${env.otp.rateLimitMinutes} minute(s) before requesting another code`;
    }
    return null;
  }

  const until = memoryRateUntil.get(phone);
  if (until && until > Date.now()) {
    return `Please wait ${env.otp.rateLimitMinutes} minute(s) before requesting another code`;
  }
  return null;
}

async function recordRateLimit(phone: string): Promise<void> {
  const redis = getRedis();
  const ttlSec = env.otp.rateLimitMinutes * 60;

  if (redis) {
    await redis.set(rateKey(phone), "1", "EX", ttlSec);
    return;
  }
  memoryRateUntil.set(phone, Date.now() + ttlSec * 1000);
}

async function checkDailyLimit(phone: string): Promise<string | null> {
  const max = env.otp.maxAttemptsPerDay;
  const redis = getRedis();

  if (redis) {
    const key = dailyKey(phone);
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 86_400);
    if (count > max) return "Daily OTP limit reached";
    return null;
  }

  const day = todayKey();
  const entry = memoryDailyAttempts.get(phone);
  if (!entry || entry.dayKey !== day) {
    memoryDailyAttempts.set(phone, { count: 1, dayKey: day });
    return null;
  }
  entry.count += 1;
  if (entry.count > max) return "Daily OTP limit reached";
  return null;
}

async function storeOtp(phone: string, purpose: string, code: string): Promise<void> {
  const ttlSec = env.otp.expiryMinutes * 60;
  const redis = getRedis();
  const payload = JSON.stringify({ code, purpose, createdAt: Date.now() });

  if (redis) {
    await redis.set(otpStorageKey(phone, purpose), payload, "EX", ttlSec);
    return;
  }

  memoryOtps.set(otpStorageKey(phone, purpose), {
    code,
    purpose,
    createdAt: Date.now(),
  });
  setTimeout(() => memoryOtps.delete(otpStorageKey(phone, purpose)), ttlSec * 1000).unref?.();
}

export type IssueOtpResult =
  | { ok: true; code: string; expiresInMinutes: number }
  | { ok: false; error: string };

/**
 * Generate OTP, enforce rate/daily limits, persist for verification.
 */
export async function issueOtp(phone: string, purpose: string): Promise<IssueOtpResult> {
  const normalized = normalizeAlgerianPhone(phone);
  if (!normalized) return { ok: false, error: "Invalid Algerian phone number" };

  const rateErr = await checkRateLimit(normalized);
  if (rateErr) return { ok: false, error: rateErr };

  const dailyErr = await checkDailyLimit(normalized);
  if (dailyErr) return { ok: false, error: dailyErr };

  const code = generateOtpCode();
  await storeOtp(normalized, purpose, code);
  await recordRateLimit(normalized);

  return { ok: true, code, expiresInMinutes: env.otp.expiryMinutes };
}

export async function verifyOtp(phone: string, purpose: string, code: string): Promise<boolean> {
  const normalized = normalizeAlgerianPhone(phone);
  if (!normalized) return false;
  const redis = getRedis();
  const key = otpStorageKey(normalized, purpose);

  if (redis) {
    const raw = await redis.get(key);
    if (!raw) return false;
    const record = JSON.parse(raw) as OtpRecord;
    if (record.code !== code) return false;
    await redis.del(key);
    return true;
  }

  const record = memoryOtps.get(key);
  if (!record || record.code !== code) return false;
  memoryOtps.delete(key);
  return true;
}
