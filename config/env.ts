import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Joi from "joi";

const envDir = fileURLToPath(new URL("..", import.meta.url));
config({ path: resolve(envDir, ".env") });

const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  PORT: Joi.number().port().default(4000),

  MONGODB_URI: Joi.string().uri({ scheme: [/mongodb(\+srv)?/] }).required(),

  // Comma-separated list of allowed origins. Example:
  // CORS_ORIGINS=http://localhost:3000,https://app.example.com
  CORS_ORIGINS: Joi.string().default("http://localhost:3000"),

  // JWT auth
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ISSUER: Joi.string().default("project_election"),
  JWT_AUDIENCE: Joi.string().default("project_election"),

  // Cookie / CSRF (only required if you enable CSRF below)
  COOKIE_SECRET: Joi.string().min(32).required(),
  CSRF_ENABLED: Joi.boolean().default(false),

  // When behind a proxy (nginx, cloudflare, render, etc) set to 1 (or "true")
  TRUST_PROXY: Joi.alternatives()
    .try(Joi.boolean(), Joi.number().integer().min(0).max(10), Joi.string())
    .default(false),

  // Socket security
  SOCKET_REQUIRE_AUTH: Joi.boolean().default(false),

  // Redis (recommended for scaling across multiple instances)
  REDIS_URL: Joi.string().uri().optional(),
  REDIS_ENABLED: Joi.boolean().default(false),

  // NetBEOPEN / PlaySMS
  NETBEOPEN_API_URL: Joi.string().uri().optional(),
  NETBEOPEN_WEBSERVICES_USERNAME: Joi.string().optional(),
  NETBEOPEN_WEBSERVICES_TOKEN: Joi.string().optional(),
  NETBEOPEN_SENDER_ID: Joi.string().allow("").optional(),

  // OTP
  OTP_EXPIRY_MINUTES: Joi.number().integer().min(1).max(60).default(5),
  OTP_RATE_LIMIT_MINUTES: Joi.number().integer().min(0).max(60).default(1),
  OTP_MAX_ATTEMPTS_PER_DAY: Joi.number().integer().min(1).default(100000),
  OTP_LENGTH: Joi.number().integer().min(4).max(10).default(6),
  OTP_TYPE: Joi.string().valid("NUMERIC", "ALPHANUMERIC").default("NUMERIC"),

  ROLE_SMS_ENABLED: Joi.boolean().default(true),
}).unknown(true);

const { value, error } = envSchema.validate(process.env, {
  abortEarly: false,
  allowUnknown: true,
  convert: true,
});

if (error) {
  // Fail fast on boot rather than running insecurely/misconfigured.
  throw new Error(`Invalid environment configuration:\n${error.message}`);
}

function parseOrigins(input: string): string[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: value.NODE_ENV as "development" | "test" | "production",
  isProd: value.NODE_ENV === "production",
  port: value.PORT as number,
  mongoUri: value.MONGODB_URI as string,
  corsOrigins: parseOrigins(value.CORS_ORIGINS as string),
  trustProxy: value.TRUST_PROXY as boolean | number | string,

  jwt: {
    accessSecret: value.JWT_ACCESS_SECRET as string,
    issuer: value.JWT_ISSUER as string,
    audience: value.JWT_AUDIENCE as string,
  },

  cookieSecret: value.COOKIE_SECRET as string,
  csrfEnabled: value.CSRF_ENABLED as boolean,

  socketRequireAuth: value.SOCKET_REQUIRE_AUTH as boolean,

  redis: {
    enabled: value.REDIS_ENABLED as boolean,
    url: value.REDIS_URL as string | undefined,
  },

  netbeopen: {
    apiUrl: value.NETBEOPEN_API_URL as string | undefined,
    username: value.NETBEOPEN_WEBSERVICES_USERNAME as string | undefined,
    token: value.NETBEOPEN_WEBSERVICES_TOKEN as string | undefined,
    senderId: value.NETBEOPEN_SENDER_ID as string | undefined,
  },

  otp: {
    expiryMinutes: value.OTP_EXPIRY_MINUTES as number,
    rateLimitMinutes: value.OTP_RATE_LIMIT_MINUTES as number,
    maxAttemptsPerDay: value.OTP_MAX_ATTEMPTS_PER_DAY as number,
    length: value.OTP_LENGTH as number,
    type: value.OTP_TYPE as "NUMERIC" | "ALPHANUMERIC",
  },

  roleSms: {
    enabled: value.ROLE_SMS_ENABLED as boolean,
  },
};

