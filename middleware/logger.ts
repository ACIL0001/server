import pinoHttp from "pino-http";
import { env } from "../config/env";

export const httpLogger = pinoHttp({
  enabled: env.nodeEnv !== "test",
  level: env.isProd ? "info" : "debug",
  redact: {
    paths: [
      // Auth headers
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers.set-cookie",
      "res.headers.set-cookie",
      // PII fields in request body
      "req.body.password",
      "req.body.nin",
      "req.body.phone",
      "req.body.email",
      "req.body.full_name",
    ],
    remove: true,
  },
  // Don't log health-check spam
  autoLogging: {
    ignore: (req) => req.url === "/api/health",
  },
});
