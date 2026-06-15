import Joi from "joi";

// ────────────────────────────────────────────────────────────────
// Re-usable Joi fragments shared across every validator file.
// ────────────────────────────────────────────────────────────────

export const objectId = Joi.string()
  .regex(/^[0-9a-fA-F]{24}$/)
  .message("{{#label}} must be a valid ObjectId");

export const nin = Joi.string()
  .regex(/^\d{18}$/)
  .message("NIN must be exactly 18 digits");

export const phone = Joi.string()
  // Accept Algerian mobile numbers: 05/06/07 + 8 digits (10 digits total).
  // Also accept +213 or 213 prefix (will be normalized server-side).
  .regex(/^(0[5-7]\d{8}|\+213[5-7]\d{8}|213[5-7]\d{8})$/)
  .message("Phone must be Algerian mobile starting with 05/06/07 (10 digits)");

export const email = Joi.string().email().lowercase().trim().max(254);

export const password = Joi.string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, "uppercase")
  .regex(/[0-9]/, "digit")
  .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, "special character")
  .messages({
    "string.min": "Password must be at least 8 characters",
    "string.max": "Password must not exceed 128 characters",
    "string.pattern.name": "Password must contain at least one {#name}",
  });

export const paginationQuery = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(5000).default(20),
  cursor: objectId.optional(),
};

export const statusEnum = Joi.string()
  .valid("active", "inactive", "suspended")
  .default("active");

export const sortQuery = {
  sortBy: Joi.string().max(40).default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
};
