import type { RequestHandler } from "express";
import Joi from "joi";
import { Wilaya } from "../wilaya/wilaya.model";
import { Commune } from "../commune/commune.model";
import { Center } from "../center/center.model";
import { Desk } from "../desk/desk.model";
import { objectId } from "../common/common.validator";

type ImportRow = {
  commune_name: string;
  center_name: string;
  address: string;
  male_desks: number;
  female_desks: number;
};

const rowSchema = Joi.object({
  commune_name: Joi.string().trim().min(2).max(200).required(),
  center_name: Joi.string().trim().min(2).max(200).required(),
  address: Joi.string().trim().min(2).max(500).required(),
  male_desks: Joi.number().integer().min(0).max(500).required(),
  female_desks: Joi.number().integer().min(0).max(500).required(),
});

const importSchema = Joi.object({
  wilaya_id: objectId.required(),
  rows: Joi.array().items(rowSchema).min(1).max(50_000).required(),
}).required();

function normalizeName(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[ـ]/g, "")
    .toLowerCase();
}

async function findCommuneIdByName(wilayaId: string, communeName: string): Promise<string | null> {
  const raw = communeName.trim();
  if (!raw) return null;

  // First: exact match (common)
  const exact = await Commune.findOne({
    wilaya: wilayaId,
    $or: [{ name_ar: raw }, { name_fr: raw }],
  })
    .select("_id name_ar name_fr")
    .lean();
  if (exact?._id) return String(exact._id);

  const target = normalizeName(raw);
  const candidates = await Commune.find({ wilaya: wilayaId })
    .select("_id name_ar name_fr")
    .lean();

  const found = candidates.find((c: any) => {
    const ar = normalizeName(String(c.name_ar || ""));
    const fr = normalizeName(String(c.name_fr || ""));
    return ar === target || fr === target;
  });
  return found?._id ? String((found as any)._id) : null;
}

export const importCentersAndDesks: RequestHandler = async (req, res) => {
  try {
    const { error, value } = importSchema.validate(req.body, {
      abortEarly: false,
      convert: true,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        ok: false,
        message: "Invalid import payload",
        details: error.details.map((d) => d.message),
      });
    }

    const wilayaId = String(value.wilaya_id);
    const rows = value.rows as ImportRow[];

    const wilaya = await Wilaya.findById(wilayaId).select("_id").lean();
    if (!wilaya) {
      return res.status(404).json({ ok: false, message: "Wilaya not found" });
    }

    const errors: { index: number; error: string }[] = [];
    let createdCenters = 0;
    let createdDesks = 0;
    let skippedCenters = 0;

    // Basic in-request de-dup (avoid re-creating same center multiple times in one file)
    const centerCache = new Map<string, string>(); // key -> centerId

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const communeId = await findCommuneIdByName(wilayaId, r.commune_name);
      if (!communeId) {
        errors.push({ index: i, error: `Commune not found in wilaya: ${r.commune_name}` });
        continue;
      }

      const totalDesks = (Number(r.male_desks) || 0) + (Number(r.female_desks) || 0);
      const centerKey = `${communeId}::${normalizeName(r.center_name)}::${normalizeName(r.address)}`;

      let centerId = centerCache.get(centerKey) || "";
      if (!centerId) {
        // If center already exists (unique name+commune), reuse it.
        const existing = await Center.findOne({ commune: communeId, name: r.center_name.trim() })
          .select("_id")
          .lean();
        if (existing?._id) {
          centerId = String(existing._id);
          skippedCenters += 1;
        } else {
          const created = await Center.create({
            name: r.center_name.trim(),
            wilaya: wilayaId,
            commune: communeId,
            location: r.address.trim(),
            number_of_desks: totalDesks,
            male_count: 0,
            female_count: 0,
            total_voters: 0,
          });
          centerId = String(created._id);
          createdCenters += 1;
        }
        centerCache.set(centerKey, centerId);
      }

      // Create desks 1..N with type male then female.
      // desk_number is unique per center.
      let nextDeskNumber = 1;
      const existingMax = await Desk.find({ center: centerId })
        .sort({ desk_number: -1 })
        .limit(1)
        .select("desk_number")
        .lean();
      if (existingMax.length > 0) nextDeskNumber = Number((existingMax[0] as any).desk_number || 0) + 1;

      const desksToCreate: any[] = [];
      for (let n = 0; n < Number(r.male_desks) || 0; n++) {
        desksToCreate.push({
          desk_number: nextDeskNumber++,
          center: centerId,
          wilaya: wilayaId,
          commune: communeId,
          type: "male",
          male_count: 0,
          female_count: 0,
          total_voters: 0,
        });
      }
      for (let n = 0; n < Number(r.female_desks) || 0; n++) {
        desksToCreate.push({
          desk_number: nextDeskNumber++,
          center: centerId,
          wilaya: wilayaId,
          commune: communeId,
          type: "female",
          male_count: 0,
          female_count: 0,
          total_voters: 0,
        });
      }

      if (desksToCreate.length > 0) {
        try {
          const created = await Desk.insertMany(desksToCreate, { ordered: false });
          createdDesks += created.length;
        } catch (e) {
          // Partial insert is OK; collect error but continue
          errors.push({ index: i, error: "Some desks could not be created (duplicates?)" });
        }
      }
    }

    res.json({
      ok: true,
      summary: {
        rows: rows.length,
        created_centers: createdCenters,
        skipped_centers: skippedCenters,
        created_desks: createdDesks,
        errors: errors.length,
      },
      errors: errors.slice(0, 200),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Import failed";
    res.status(500).json({ ok: false, message: msg });
  }
};

