import mongoose from "mongoose";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { Wilaya } from "../modules/wilaya/wilaya.model";
import { Commune } from "../modules/commune/commune.model";
import { Admin } from "../modules/admin/admin.model";

// ────────────────────────────────────────────────────────────────
// Idempotent seed script — safe to run multiple times.
// Seeds: 58 wilayas, ~1541 communes, 1 default super admin.
// Run: bun run scripts/seed.ts
// ────────────────────────────────────────────────────────────────

interface WilayaData {
  wilayaCode: number;
  nameFr: string;
  nameAr: string;
  communes: { id: number; nameFr: string; nameAr: string }[];
}

async function seed() {
  console.log("Connecting to MongoDB...");
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri, { autoIndex: true });
  console.log("Connected.");

  // ── 1. Seed Wilayas ──────────────────────────────────────
  const dataPath = resolve(__dirname, "../../wilayas-with-municipalities.json");
  const raw = readFileSync(dataPath, "utf-8");
  const wilayas: WilayaData[] = JSON.parse(raw);

  let wilayaCount = 0;
  let communeCount = 0;

  for (const w of wilayas) {
    const wilaya = await Wilaya.findOneAndUpdate(
      { wilaya_code: w.wilayaCode },
      { $setOnInsert: { name_fr: w.nameFr, name_ar: w.nameAr, wilaya_code: w.wilayaCode, seats_count: 0 } },
      { upsert: true, new: true }
    );
    wilayaCount++;

    for (const c of w.communes) {
      await Commune.findOneAndUpdate(
        { commune_id: c.id },
        { $setOnInsert: { name_fr: c.nameFr, name_ar: c.nameAr, commune_id: c.id, wilaya: wilaya._id } },
        { upsert: true }
      );
      communeCount++;
    }
  }

  console.log(`Seeded ${wilayaCount} wilayas and ${communeCount} communes.`);

  // ── 2. Default super_admin (Admin collection) ─────────────
  const DEFAULT_EMAIL = "admin@pvp.dz";
  const DEFAULT_PASSWORD = "Admin123!";

  const exists = await Admin.findOne({ email: DEFAULT_EMAIL });
  if (!exists) {
    const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    await Admin.create({
      full_name: "Super Admin PVP",
      email: DEFAULT_EMAIL,
      password: hashed,
      role: "super_admin",
      status: "active",
      phone: "0550000000",
      nin: "000000000000000001",
    });
    console.log(`Default admin created: ${DEFAULT_EMAIL} / ${DEFAULT_PASSWORD}`);
  } else {
    console.log("Default admin already exists, skipping.");
  }

  await mongoose.disconnect();
  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
