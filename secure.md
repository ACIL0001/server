# Server Security Notes (Best Practices)

This document explains the security hardening currently implemented in `server/`, how to configure it with `.env`, and what is still required before production use.

> Important: security is a system. Middleware helps, but **real security requires real auth, real secrets, and correct deployment settings**.

---

## 1) Environment & secrets (fail-fast)

**File:** `server/config/env.ts`

- Loads `.env` via `dotenv`.
- Validates required configuration via `joi`.
- If configuration is missing/invalid, the server **throws on startup** (fail-fast).

### Required `.env` keys

**File:** `server/.env` (ignored by git via `server/.gitignore`)

- `MONGODB_URI`: MongoDB connection string.
- `PORT`: HTTP port.
- `NODE_ENV`: `development` | `test` | `production`
- `CORS_ORIGINS`: comma-separated allowlist.
- `JWT_ACCESS_SECRET`: **required**, minimum 32 chars.
- `COOKIE_SECRET`: **required**, minimum 32 chars.
- `CSRF_ENABLED`: `true|false`
- `SOCKET_REQUIRE_AUTH`: `true|false`
- `TRUST_PROXY`: `false` or `1` (or similar) when behind a proxy.

### Production requirement (critical)

- **Replace placeholder secrets** in `.env` with real random secrets.
- Never commit secrets to git.

---

## 2) HTTP server bootstrap

**File:** `server/index.ts`

### CORS (allowlist)

- Only requests from `CORS_ORIGINS` are allowed.
- Requests with no `Origin` header (server-to-server / curl) are allowed.
- `credentials: true` is enabled.

### Request size limits

- `express.json({ limit: "64kb" })`
- `express.urlencoded({ limit: "64kb" })`

### Secure cookie parsing

- `cookie-parser` uses `COOKIE_SECRET` so signed cookies can be validated.

### Logging with redaction

**File:** `server/middleware/logger.ts`

- Uses `pino-http`.
- Redacts:
  - `Authorization` header
  - `Cookie` header
  - `Set-Cookie` headers

> Note: `morgan` is still enabled for request logs. If you want a stricter posture, remove `morgan` and rely only on `pino-http`.

### Rate limiting (layered)

**File:** `server/middleware/rateLimiters.ts`

- `globalLimiter`: applied to all requests.
- `authLimiter`: stricter limiter for auth endpoints.

### HPP protection

- Uses `hpp()` to mitigate HTTP Parameter Pollution attacks.

### Mongo query sanitization

- Uses `express-mongo-sanitize` to prevent `$` / `.` key operator injection patterns.

### Helmet security headers

- `helmet()` enables a suite of security headers.
- CSP: currently configured in an API-friendly way; if you serve HTML pages later, define a full CSP.

### CSRF protection (optional)

**File:** `server/middleware/csrf.ts`

- If `CSRF_ENABLED=false`, CSRF middleware is a no-op.
- If `CSRF_ENABLED=true`, CSRF protection is enabled using a **signed, httpOnly cookie**.

When to enable:
- Enable **only if you use cookies for auth** (browser automatically attaches cookies → CSRF matters).
- For pure Bearer-token APIs, CSRF can remain disabled.

---

## 3) Authentication & authorization (JWT)

**File:** `server/middleware/auth.ts`

- `requireAuth`: validates `Authorization: Bearer <token>` using:
  - `JWT_ACCESS_SECRET`
  - `JWT_ISSUER`
  - `JWT_AUDIENCE`
- Attaches `req.user = { sub, roles? }`
- `requireRole(role)`: basic role gate.

### Important (critical)

**Current state:** `POST /api/auth/token` is a **demo** endpoint that mints a JWT for any `userId` provided.

**Before production, you must implement real login:**
- MongoDB `User` model (Mongoose schema)
- Password hashing (bcrypt) + compare
- Lockout/backoff and/or throttling strategy
- Refresh token strategy (recommended)

---

## 4) Request validation

**File:** `server/middleware/validate.ts`

- Central Joi-based request validation for:
  - `body`, `query`, `params`, `headers`
- Returns `400` with safe, structured validation errors.

Best practice:
- Add a schema to **every route**.
- Never pass raw client objects directly into Mongo queries.

---

## 5) Routes

**File:** `server/routes/index.ts`

Endpoints currently present:

- `GET /api/health`
  - Health check.
- `POST /api/auth/token`
  - **Demo token minting** (not production-ready).
  - Protected by `authLimiter` and Joi validation.
- `GET /api/me`
  - Protected by `requireAuth`.

---

## 6) Socket.IO hardening

**File:** `server/socket/index.ts`

- Optional handshake auth:
  - If `SOCKET_REQUIRE_AUTH=true`, the server requires a JWT at connect time:
    - `socket.handshake.auth.token`
  - Token is verified with the same JWT issuer/audience/secret.

Best practice:
- Even with handshake auth, validate and authorize each event payload (and room joins) server-side.

---

## 7) Database

**File:** `server/db/mongoose.ts`

- Connects to MongoDB via Mongoose.
- `autoIndex` disabled in production for safety/performance.

Best practice:
- Use proper indexes via migrations/ops or carefully managed schema indexes.

---

## 8) Deployment hardening checklist (recommended)

These are outside code but required for “high security”:

- TLS termination (HTTPS) at a trusted proxy/load balancer.
- Set `TRUST_PROXY` correctly when behind a proxy (so secure cookies / rate limit IP work properly).
- Secrets management (do not store production secrets in local `.env` files).
- Monitoring & alerting:
  - Auth failures, rate limit hits, 5xx spikes
  - Mongo connection health
- Dependency hygiene:
  - Remove unused legacy deps (e.g. SQL/TypeORM packages if no longer used).
- Logging policy:
  - Ensure no secrets in URLs or request bodies.

---

## 9) Quick verification commands

From `server/`:

```bash
bun x tsc -p tsconfig.json --noEmit
```

Run server (dev):

```bash
bun run index.ts
```

