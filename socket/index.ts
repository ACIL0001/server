import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { getRedis } from "../db/redis";
import type { JwtUser } from "../middleware/auth";

// ────────────────────────────────────────────────────────────────
// Socket.IO — secured with JWT auth, room-based architecture,
// and per-connection event rate limiting.
// ────────────────────────────────────────────────────────────────

const MAX_EVENTS_PER_MIN = 30;

let ioInstance: Server | null = null;

export function initSocket(server: HttpServer): Server {
  const io = new Server(server, {
    cors: { origin: env.corsOrigins, credentials: true },
    maxHttpBufferSize: 1e6, // 1 MB max payload
  });
  ioInstance = io;

  // Redis adapter for horizontal scaling
  const redis = getRedis();
  if (redis) {
    const pubClient = redis;
    const subClient = redis.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  }

  // ── JWT Authentication middleware ──────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || token.length < 1) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, env.jwt.accessSecret, {
        issuer: env.jwt.issuer,
        audience: env.jwt.audience,
      }) as jwt.JwtPayload & JwtUser;

      if (!decoded.sub) return next(new Error("Invalid token"));

      // Attach user data to socket
      (socket as any).user = {
        sub: decoded.sub,
        role: decoded.role,
        wilaya_id: decoded.wilaya_id,
        commune_id: decoded.commune_id,
      };

      return next();
    } catch {
      return next(new Error("Invalid or expired token"));
    }
  });

  // ── Connection handler ─────────────────────────────────────
  io.on("connection", (socket) => {
    const user = (socket as any).user as JwtUser;

    // Auto-join user to their personal room, role, and scope rooms
    socket.join(`user:${user.sub}`);
    if (user.role) socket.join(user.role);
    if (user.wilaya_id) socket.join(`wilaya:${user.wilaya_id}`);
    if (user.commune_id) socket.join(`commune:${user.commune_id}`);

    // Rate limiting counter
    let eventCount = 0;
    const resetInterval = setInterval(() => { eventCount = 0; }, 60_000);

    socket.use(([event], next) => {
      eventCount++;
      if (eventCount > MAX_EVENTS_PER_MIN) {
        return next(new Error("Rate limit exceeded"));
      }
      return next();
    });

    socket.emit("connected", { ok: true, userId: user.sub, role: user.role });

    socket.on("disconnect", () => {
      clearInterval(resetInterval);
    });
  });

  return io;
}

// ── Helper: emit to specific rooms from controllers ──────────
export function emitToRoom(room: string, event: string, data: unknown) {
  if (ioInstance) {
    ioInstance.to(room).emit(event, data);
  }
}

export function getIO(): Server | null {
  return ioInstance;
}
