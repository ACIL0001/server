import { ResultDesk } from "./result-desk.model";
import { ResultCenter } from "../result-center/result-center.model";
import * as crud from "../common/crud.helpers";
import mongoose from "mongoose";
import { extractVotesFromImage } from "../../lib/ocr/ocr.service";
import { compareResults } from "../../lib/ocr/comparison.service";
import type { VerificationReport } from "../../lib/ocr/ocr.interface";

export async function submitDeskResult(data: any) {
  const existing = await ResultDesk.findOne({
    desk: data.desk,
    party: data.party,
    candidat: data.candidat,
  });
  if (existing) {
    if (data.total !== undefined) existing.total = data.total;
    if (data.image) {
      existing.image = data.image;
      existing.image_mimetype = data.image_mimetype;
    }
    if (data.owner) existing.owner = data.owner;
    existing.status = "pending";
    return await existing.save();
  }
  return crud.createDoc(ResultDesk, data);
}

export async function findAllDeskResults(query: any) {
  const f: any = {};
  if (query.desk) f.desk = query.desk;
  if (query.party) f.party = query.party;
  if (query.status) f.status = query.status;
  if (query.owner) f.owner = query.owner;
  return crud.paginate(ResultDesk, f, query, undefined, ["owner", "party", "desk", "candidat"]);
}

export async function findAllDeskResultsScoped(
  query: any,
  scope: { wilayaId?: string; communeId?: string; centerId?: string }
) {
  const { wilayaId, communeId, centerId } = scope;
  const needsJoin = wilayaId || communeId || centerId;

  if (!needsJoin) {
    // No scope filter → fall back to simple query
    return findAllDeskResults(query);
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  // Build match for desk attributes
  const deskMatch: any = {};
  if (wilayaId) deskMatch["_desk.wilaya"] = new mongoose.Types.ObjectId(wilayaId);
  if (communeId) deskMatch["_desk.commune"] = new mongoose.Types.ObjectId(communeId);
  if (centerId) deskMatch["_desk.center"] = new mongoose.Types.ObjectId(centerId);

  // Additional filters on ResultDesk itself
  const resultMatch: any = {};
  if (query.desk) resultMatch.desk = new mongoose.Types.ObjectId(query.desk);
  if (query.party) resultMatch.party = new mongoose.Types.ObjectId(query.party);
  if (query.status) resultMatch.status = query.status;
  if (query.candidat) resultMatch.candidat = new mongoose.Types.ObjectId(query.candidat);

  const pipeline: any[] = [
    ...(Object.keys(resultMatch).length > 0 ? [{ $match: resultMatch }] : []),
    {
      $lookup: {
        from: "desks",
        localField: "desk",
        foreignField: "_id",
        as: "_desk",
      },
    },
    { $unwind: "$_desk" },
    { $match: deskMatch },
    // Populate owner
    { $lookup: { from: "roleelectiondays", localField: "owner", foreignField: "_id", as: "_owner" } },
    { $unwind: { path: "$_owner", preserveNullAndEmptyArrays: true } },
    // Populate party
    { $lookup: { from: "parties", localField: "party", foreignField: "_id", as: "_party" } },
    { $unwind: { path: "$_party", preserveNullAndEmptyArrays: true } },
    // Populate candidat
    { $lookup: { from: "candidats", localField: "candidat", foreignField: "_id", as: "_candidat" } },
    { $unwind: { path: "$_candidat", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        total: 1,
        status: 1,
        ocr_result: 1,
        ocr_extracted_total: 1,
        ocr_confidence: 1,
        none_ocr: 1,
        createdAt: 1,
        updatedAt: 1,
        desk: { _id: "$_desk._id", desk_number: "$_desk.desk_number", type: "$_desk.type" },
        party: { _id: "$_party._id", name: "$_party.name" },
        candidat: { _id: "$_candidat._id", full_name: "$_candidat.full_name" },
        owner: { _id: "$_owner._id", full_name: "$_owner.full_name" },
        hasImage: { $ne: [{ $type: "$image" }, "missing"] },
      },
    },
    { $sort: { createdAt: -1 } },
  ];

  const countPipeline = [...pipeline, { $count: "total" }];
  const dataPipeline = [...pipeline, { $skip: skip }, { $limit: limit }];

  const [countRes, data] = await Promise.all([
    ResultDesk.aggregate(countPipeline),
    ResultDesk.aggregate(dataPipeline),
  ]);

  const total = countRes[0]?.total ?? 0;

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function findDeskResultById(id: string) { return crud.findById(ResultDesk, id, ["owner", "party", "desk", "candidat"]); }

export async function updateDeskResultStatus(id: string, status: string, ocr_result?: string) {
  const update: any = { status };
  if (ocr_result !== undefined) update.ocr_result = ocr_result;
  return crud.updateDoc(ResultDesk, id, update);
}

// ── OCR Processing ───────────────────────────────────────────
export async function processOcr(resultId: string): Promise<any> {
  // Fetch the result with its image
  const result = await ResultDesk.findById(resultId).select("+image +image_mimetype");
  if (!result) throw Object.assign(new Error("Result not found"), { status: 404 });
  if (!result.image) throw Object.assign(new Error("No image attached to this result"), { status: 400 });

  // Mark as processing
  result.status = "ocr_processing";
  await result.save();

  try {
    // Run OCR
    const ocrResult = await extractVotesFromImage(result.image, result.image_mimetype);

    // Store OCR results
    result.ocr_result = ocrResult.rawText;
    result.ocr_confidence = ocrResult.confidence;
    result.none_ocr = false;

    // Try to find the best matching number for this candidat's total
    const extractedNumbers = ocrResult.extractedNumbers;
    if (extractedNumbers.length > 0) {
      // Look for an exact match first, then take the closest one
      const exactMatch = extractedNumbers.find((e) => e.value === result.total);
      if (exactMatch) {
        result.ocr_extracted_total = exactMatch.value;
        result.status = "verified";
      } else {
        // Take the first extracted number as the OCR reading
        result.ocr_extracted_total = extractedNumbers[0].value;
        result.status = "mismatch";
      }
    } else {
      result.status = "ocr_done";
    }

    await result.save();
    return result;
  } catch (err) {
    result.status = "pending";
    result.none_ocr = true;
    await result.save();
    throw err;
  }
}

// ── Desk-level Verification ──────────────────────────────────
export async function verifyDeskWithImage(
  deskId: string,
  imageBuffer?: Buffer,
  imageMimetype?: string
): Promise<VerificationReport> {
  // 1. Get all results for this desk
  const results = await ResultDesk.find({ desk: deskId })
    .populate("candidat", "full_name")
    .populate("party", "name")
    .select("+image +image_mimetype")
    .lean();

  if (results.length === 0) {
    throw Object.assign(new Error("No results found for this desk"), { status: 404 });
  }

  // Find existing image if none provided
  const existingImageDoc = results.find(r => r.image);
  const finalBuffer = imageBuffer || existingImageDoc?.image;
  const finalMimetype = imageMimetype || existingImageDoc?.image_mimetype;

  if (!finalBuffer || !finalMimetype) {
     throw Object.assign(new Error("No image available for verification"), { status: 400 });
  }

  // 2. Run OCR on the image
  const ocrResult = await extractVotesFromImage(finalBuffer as Buffer, finalMimetype as string);

  // 3. Build manual entries array
  const manualEntries = results.map((r: any) => ({
    candidatId: String(r.candidat?._id || r.candidat),
    candidatName: r.candidat?.full_name || "Unknown",
    partyName: r.party?.name || "Unknown",
    manualTotal: r.total,
  }));

  // 4. Compare
  const report = compareResults(ocrResult, manualEntries);
  report.deskId = deskId;

  // 5. Update individual result statuses based on comparison
  let imageSaved = false;
  for (const candidatResult of report.candidats) {
    const resultDoc = results.find(
      (r: any) => String(r.candidat?._id || r.candidat) === candidatResult.candidatId
    );
    if (resultDoc) {
      const updateData: any = {
        ocr_extracted_total: candidatResult.ocrTotal,
        ocr_confidence: candidatResult.confidence,
        ocr_result: ocrResult.rawText.substring(0, 2000), // Cap raw text
        status: candidatResult.match ? "verified" : (candidatResult.ocrTotal !== null ? "mismatch" : "ocr_done"),
      };

      // Save the image ONLY on the first candidate's result to avoid 50MB duplication
      // Only if it's a new image
      if (!imageSaved && imageBuffer && imageMimetype) {
        updateData.image = imageBuffer;
        updateData.image_mimetype = imageMimetype;
        imageSaved = true;
      }

      await ResultDesk.findByIdAndUpdate(resultDoc._id, updateData);
    }
  }

  return report;
}

// ── Get Verification Report for a Desk ───────────────────────
export async function getDeskVerificationReport(deskId: string) {
  const results = await ResultDesk.find({ desk: deskId })
    .populate("candidat", "full_name")
    .populate("party", "name")
    .lean();

  return results.map((r: any) => ({
    id: r._id,
    candidatId: String(r.candidat?._id || r.candidat),
    candidatName: r.candidat?.full_name || "Unknown",
    partyName: r.party?.name || "Unknown",
    manualTotal: r.total,
    ocrExtractedTotal: r.ocr_extracted_total ?? null,
    ocrConfidence: r.ocr_confidence ?? null,
    status: r.status,
    match: r.status === "verified",
    difference: r.ocr_extracted_total != null ? (r.ocr_extracted_total - r.total) : null,
    ocrResult: r.ocr_result || null,
  }));
}

export async function requestHumanReview(resultId: string) {
  return crud.updateDoc(ResultDesk, resultId, { status: "rejected" });
}

export async function uploadDeskImage(deskId: string, imageBuffer: Buffer, imageMimetype: string) {
  const results = await ResultDesk.find({ desk: deskId }).lean();
  if (results.length === 0) throw Object.assign(new Error("No results found for this desk"), { status: 404 });
  
  // Update only the first candidate's result doc with the image to avoid duplication
  const resultDoc = results[0];
  await ResultDesk.findByIdAndUpdate(resultDoc._id, {
    image: imageBuffer,
    image_mimetype: imageMimetype
  });
}

// ── Desk-level Verification ─────────────────────────────────────────────
export async function aggregateByCenter(centerId: string) {
  return ResultDesk.aggregate([
    { $lookup: { from: "desks", localField: "desk", foreignField: "_id", as: "deskInfo" } },
    { $unwind: "$deskInfo" },
    { $match: { "deskInfo.center": new mongoose.Types.ObjectId(centerId) } },
    { $group: { _id: { party: "$party", candidat: "$candidat" }, totalVotes: { $sum: "$total" }, count: { $sum: 1 } } },
    { $sort: { totalVotes: -1 } },
  ]);
}

export async function aggregateByWilaya(wilayaId: string) {
  return ResultCenter.aggregate([
    { $lookup: { from: "centers", localField: "center", foreignField: "_id", as: "centerInfo" } },
    { $unwind: "$centerInfo" },
    { $match: { "centerInfo.wilaya": new mongoose.Types.ObjectId(wilayaId), status: "validated" } },
    { $group: { _id: "$party", totalVotes: { $sum: "$result" }, centersCount: { $sum: 1 } } },
    { $sort: { totalVotes: -1 } },
    { $lookup: { from: "parties", localField: "_id", foreignField: "_id", as: "partyInfo" } },
    { $unwind: "$partyInfo" },
  ]);
}

export async function aggregateNational() {
  return ResultCenter.aggregate([
    { $match: { status: "validated" } },
    { $group: { _id: "$party", totalVotes: { $sum: "$result" }, centersCount: { $sum: 1 } } },
    { $sort: { totalVotes: -1 } },
    { $lookup: { from: "parties", localField: "_id", foreignField: "_id", as: "partyInfo" } },
    { $unwind: "$partyInfo" },
  ]);
}
