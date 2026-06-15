import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedis } from "../db/redis";

function redisStoreIfEnabled(): RedisStore | undefined {
  const redis = getRedis();
  if (!redis) return undefined;
  return new RedisStore({
    sendCommand: (...args: string[]) => (redis as any).call(...args),
  });
}

/** Global — 120 req/min */
export const globalLimiter = rateLimit({
  limit: 120,
  windowMs: 60_000,
  message: "Too many requests",
  legacyHeaders: false,
  standardHeaders: "draft-7",
  store: redisStoreIfEnabled(),
});

/** Auth endpoints — 10 req/min per IP */
export const authLimiter = rateLimit({
  limit: 10,
  windowMs: 60_000,
  message: "Too many auth attempts",
  legacyHeaders: false,
  standardHeaders: "draft-7",
  store: redisStoreIfEnabled(),
});

/** Write operations (POST/PUT/DELETE) — 30 req/min */
export const writeLimiter = rateLimit({
  limit: 30,
  windowMs: 60_000,
  message: "Too many write requests",
  legacyHeaders: false,
  standardHeaders: "draft-7",
  store: redisStoreIfEnabled(),
});

/** File uploads — 10 req/min */
export const uploadLimiter = rateLimit({
  limit: 10,
  windowMs: 60_000,
  message: "Too many upload requests",
  legacyHeaders: false,
  standardHeaders: "draft-7",
  store: redisStoreIfEnabled(),
});
