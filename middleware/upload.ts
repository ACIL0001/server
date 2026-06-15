import multer from "multer";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

// ────────────────────────────────────────────────────────────────
// Multer configuration for file uploads.
// Files are stored temporarily on disk, then read as Buffer
// and saved into MongoDB (GridFS-style or Binary field).
// ────────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOC_MIMES = [...ALLOWED_IMAGE_MIMES, "application/pdf"];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB
const MAX_DOC_SIZE = 10 * 1024 * 1024;     // 10 MB

const storage = multer.memoryStorage(); // store in memory → then save to DB

function fileFilter(
  allowedMimes: string[]
): (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => void {
  return (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Accepted: ${allowedMimes.join(", ")}`));
    }
  };
}

/** Single image upload (profile photos, PV images) — max 5 MB */
export const uploadImage = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: fileFilter(ALLOWED_IMAGE_MIMES),
});

/** Multiple images upload (messages) — max 5 images, 5 MB each */
export const uploadImages = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE, files: 5 },
  fileFilter: fileFilter(ALLOWED_IMAGE_MIMES),
});

/** Document upload (images + PDF) — max 10 MB */
export const uploadDocument = multer({
  storage,
  limits: { fileSize: MAX_DOC_SIZE },
  fileFilter: fileFilter(ALLOWED_DOC_MIMES),
});

/** Mixed upload for messages (images + video + pdf) */
export const uploadMessageFiles = multer({
  storage,
  limits: { fileSize: MAX_DOC_SIZE, files: 6 },
  fileFilter: fileFilter([...ALLOWED_DOC_MIMES, "video/mp4", "video/webm"]),
});
