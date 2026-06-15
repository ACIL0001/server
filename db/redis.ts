import Redis from "ioredis";
import { env } from "../config/env";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!env.redis.enabled) return null;
  if (!env.redis.url) return null;
  if (client) return client;

  client = new Redis(env.redis.url, {
    // Keep retries bounded; let orchestration restart unhealthy instances.
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  return client;
}

export async function connectRedis(): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  if (redis.status === "ready") return;
  await redis.connect();
}

export async function disconnectRedis(): Promise<void> {
  if (!client) return;
  const toClose = client;
  client = null;
  await toClose.quit();
}

