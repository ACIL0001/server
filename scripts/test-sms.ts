/**
 * Test NetBEOPEN SMS from server/.env
 * Usage: bun run scripts/test-sms.ts 0555123456
 */
import { sendSms } from "../lib/sms";
import { issueOtp } from "../lib/otp";
import { env } from "../config/env";

const phone = process.argv[2];
if (!phone) {
  console.error("Usage: bun run scripts/test-sms.ts <phone>");
  console.error("Example: bun run scripts/test-sms.ts 0555123456");
  process.exit(1);
}

console.log("NETBEOPEN configured:", Boolean(env.netbeopen.apiUrl && env.netbeopen.token));
console.log("ROLE_SMS_ENABLED:", env.roleSms.enabled);

const otp = await issueOtp(phone, "test");
console.log("OTP issue:", otp);

if (otp.ok) {
  const msg = `PVP test. Code: ${otp.code}. Valide ${env.otp.expiryMinutes} min.`;
  const sms = await sendSms(phone, msg);
  console.log("SMS send:", sms);
}
