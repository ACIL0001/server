/** Normalize Algerian mobile numbers to 0[5-7]XXXXXXXX */
export function normalizeAlgerianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("213")) local = local.slice(3);
  if (local.startsWith("0")) local = local.slice(1);

  if (local.length !== 9) return null;
  if (!/^[5-7]/.test(local)) return null;

  return `0${local}`;
}

export function normalizeNin(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 18) return null;
  return digits;
}
