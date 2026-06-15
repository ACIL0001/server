import { env } from "../config/env";
import {
  formatPhoneForSmsGateway,
  formatPhoneLocalForSmsGateway,
  normalizeAlgerianPhone,
} from "./phone";

export interface SmsSendResult {
  ok: boolean;
  error?: string;
  providerResponse?: unknown;
  to?: string;
  parts?: number;
}

type PlaySmsResponse = {
  data?: { status?: string; error?: string | number; to?: string }[];
  error_string?: string | null;
};

function parsePlaySmsResponse(text: string, resOk: boolean): SmsSendResult {
  let parsed: PlaySmsResponse | null = null;
  try {
    parsed = JSON.parse(text) as PlaySmsResponse;
  } catch {
    parsed = null;
  }

  const first = parsed?.data?.[0];
  const statusOk =
    resOk && (first?.status === "OK" || String(first?.error) === "0");

  if (statusOk) {
    return { ok: true, providerResponse: parsed ?? text, to: first?.to };
  }

  const errMsg =
    parsed?.error_string ||
    first?.error?.toString() ||
    text.slice(0, 300) ||
    "SMS provider error";

  return { ok: false, error: errMsg, providerResponse: parsed ?? text, to: first?.to };
}

function needsUnicode(message: string): boolean {
  return /[^\x00-\x7F]/.test(message);
}

function stripToAscii(message: string): string {
  return message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n]/g, " ");
}

/** Split long text so each chunk fits one Unicode/GSM SMS part after provider encoding. */
export function splitSmsMessage(message: string, unicode: boolean): string[] {
  const maxLen = unicode ? 280 : 480;
  if (message.length <= maxLen) return [message];

  const chunks: string[] = [];
  let rest = message.trim();

  while (rest.length > 0) {
    if (rest.length <= maxLen) {
      chunks.push(rest);
      break;
    }

    let cut = rest.lastIndexOf("\n", maxLen);
    if (cut < Math.floor(maxLen * 0.35)) {
      cut = rest.lastIndexOf(" ", maxLen);
    }
    if (cut < Math.floor(maxLen * 0.35)) {
      cut = maxLen;
    }

    const piece = rest.slice(0, cut).trim();
    if (piece) chunks.push(piece);
    rest = rest.slice(cut).trim();
  }

  const total = chunks.length;
  if (total <= 1) return chunks;

  return chunks.map((chunk, i) => `(${i + 1}/${total}) ${chunk}`);
}

async function sendSmsOnce(
  to: string,
  message: string,
  unicode = false
): Promise<SmsSendResult> {
  const { apiUrl, username, token, senderId } = env.netbeopen;

  if (!apiUrl || !username || !token) {
    const err = "SMS provider not configured (check NETBEOPEN_* in server/.env)";
    if (!env.isProd) {
      // eslint-disable-next-line no-console
      console.warn("[sms]", err);
    }
    return { ok: false, error: err };
  }

  const body = new URLSearchParams();
  body.set("op", "pv");
  body.set("u", username);
  body.set("h", token);
  body.set("to", to);
  body.set("msg", message);
  body.set("format", "json");
  // Prevent PlaySMS from appending a global footer (e.g. "SAM26") to the end.
  body.set("nofooter", "1");
  if (unicode) body.set("unicode", "1");
  if (senderId) body.set("from", senderId);

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  return parsePlaySmsResponse(text, res.ok);
}

async function sendWithFormat(
  gatewayTo: string,
  message: string,
  unicode: boolean
): Promise<SmsSendResult> {
  let result = await sendSmsOnce(gatewayTo, message, unicode);
  if (result.ok) return { ...result, to: gatewayTo };

  const localTo = formatPhoneLocalForSmsGateway(gatewayTo);
  if (localTo && localTo !== gatewayTo) {
    result = await sendSmsOnce(localTo, message, unicode);
    if (result.ok) return { ...result, to: localTo };
  }

  return { ...result, to: gatewayTo };
}

/**
 * Send SMS via NetBEOPEN / PlaySMS (POST body — avoids URL truncation).
 * Long messages are split into multiple SMS parts automatically.
 */
export async function sendSms(to: string, message: string): Promise<SmsSendResult> {
  const normalized = normalizeAlgerianPhone(to);
  const gatewayTo = formatPhoneForSmsGateway(to);
  if (!normalized || !gatewayTo) {
    return {
      ok: false,
      error: "Invalid Algerian phone (use 05 Ooredoo, 06 Mobilis, 07 Djezzy — 10 digits)",
    };
  }

  const unicode = needsUnicode(message);
  const payload = unicode ? message : stripToAscii(message);
  const parts = splitSmsMessage(payload, unicode);

  if (!env.isProd) {
    // eslint-disable-next-line no-console
    console.info("[sms] sending:", {
      local: normalized,
      gatewayTo,
      parts: parts.length,
      chars: payload.length,
      unicode,
    });
  }

  let last: SmsSendResult = { ok: true, to: gatewayTo, parts: 0 };

  for (const part of parts) {
    last = await sendWithFormat(gatewayTo, part, unicode);
    if (!last.ok) {
      return {
        ...last,
        parts: parts.length,
        error: `${last.error || "SMS failed"} (part ${parts.indexOf(part) + 1}/${parts.length})`,
      };
    }
  }

  if (!env.isProd) {
    // eslint-disable-next-line no-console
    console.info("[sms] send result:", { ok: true, to: last.to || gatewayTo, parts: parts.length });
  }

  return { ok: true, to: last.to || gatewayTo, parts: parts.length, providerResponse: last.providerResponse };
}
