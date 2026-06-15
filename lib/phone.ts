/** Normalize Algerian mobile to 0[5-7]XXXXXXXX (10 digits, local format). */
export function normalizeAlgerianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("213")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);

  if (local.length !== 9 || !/^[5-7]\d{8}$/.test(local)) return null;
  return `0${local}`;
}

export function formatPhoneInternational(raw: string): string | null {
  const local = normalizeAlgerianPhone(raw);
  if (!local) return null;
  return `+213${local.slice(1)}`;
}

/**
 * PlaySMS / NetBEOPEN destination: 2135XXXXXXXX (no "+" — "+" in query strings breaks routing).
 */
export function formatPhoneForSmsGateway(raw: string): string | null {
  const local = normalizeAlgerianPhone(raw);
  if (!local) return null;
  return `213${local.slice(1)}`;
}

/** Alternate format some Algerian routes expect: 05XXXXXXXX */
export function formatPhoneLocalForSmsGateway(raw: string): string | null {
  return normalizeAlgerianPhone(raw);
}
