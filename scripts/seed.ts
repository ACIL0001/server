import mongoose from "mongoose";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import bcrypt from "bcryptjs";
import dns from "node:dns";
import { env } from "../config/env";
import { Wilaya } from "../modules/wilaya/wilaya.model";
import { Commune } from "../modules/commune/commune.model";
import { Admin } from "../modules/admin/admin.model";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

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

  console.log("Preparing bulk write operations...");
  
  // 1. Prepare and execute Wilaya bulk operations
  const wilayaOps = wilayas.map((w) => ({
    updateOne: {
      filter: { wilaya_code: w.wilayaCode },
      update: {
        $setOnInsert: {
          name_fr: w.nameFr,
          name_ar: w.nameAr,
          wilaya_code: w.wilayaCode,
          seats_count: 0,
        },
      },
      upsert: true,
    },
  }));

  console.log(`Executing bulkWrite for ${wilayas.length} wilayas...`);
  await Wilaya.bulkWrite(wilayaOps);
  console.log("Wilayas written successfully. Fetching database records for mappings...");

  // 2. Fetch all wilayas to map their db _id by wilaya_code
  const dbWilayas = await Wilaya.find({});
  const wilayaMap = new Map<number, mongoose.Types.ObjectId>();
  dbWilayas.forEach((w) => {
    wilayaMap.set(w.wilaya_code, w._id as mongoose.Types.ObjectId);
  });

  // 3. Prepare and execute Commune bulk operations
  const communeOps: any[] = [];
  for (const w of wilayas) {
    const wilayaDbId = wilayaMap.get(w.wilayaCode);
    if (!wilayaDbId) {
      console.warn(`Warning: Wilaya with code ${w.wilayaCode} not found in database!`);
      continue;
    }
    for (const c of w.communes) {
      communeOps.push({
        updateOne: {
          filter: { commune_id: c.id },
          update: {
            $setOnInsert: {
              name_fr: c.nameFr,
              name_ar: c.nameAr,
              commune_id: c.id,
              wilaya: wilayaDbId,
            },
          },
          upsert: true,
        },
      });
    }
  }

  console.log(`Executing bulkWrite for ${communeOps.length} communes...`);
  await Commune.bulkWrite(communeOps);
  console.log(`Seeded ${wilayas.length} wilayas and ${communeOps.length} communes.`);

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
