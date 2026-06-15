import Joi from "joi";
import { objectId, email, paginationQuery } from "../common/common.validator";
import { normalizeAlgerianPhone, normalizeNin } from "./citizen.utils";

const citizenPhone = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const normalized = normalizeAlgerianPhone(String(value ?? ""));
    if (!normalized) {
      return helpers.message({
        custom: "Phone must be a valid Algerian number (e.g. 0555123456 or +213555123456)",
      });
    }
    return normalized;
  })
  .required();

const citizenPhoneOptional = Joi.string()
  .trim()
  .custom((value, helpers) => {
    if (value === undefined || value === null || value === "") return value;
    const normalized = normalizeAlgerianPhone(String(value));
    if (!normalized) {
      return helpers.message({
        custom: "Phone must be a valid Algerian number (e.g. 0555123456 or +213555123456)",
      });
    }
    return normalized;
  });

const citizenNin = Joi.string()
  .trim()
  .custom((value, helpers) => {
    const normalized = normalizeNin(String(value ?? ""));
    if (!normalized) {
      return helpers.message({ custom: "NIN must be exactly 18 digits" });
    }
    return normalized;
  })
  .required();

const citizenNinOptional = Joi.string()
  .trim()
  .custom((value, helpers) => {
    if (value === undefined || value === null || value === "") return value;
    const normalized = normalizeNin(String(value));
    if (!normalized) {
      return helpers.message({ custom: "NIN must be exactly 18 digits" });
    }
    return normalized;
  });

/** Citizens created by members: min 8 chars (hashed server-side). */
const citizenPassword = Joi.string().min(8).max(128).required();
const citizenPasswordOptional = Joi.string().min(8).max(128);

export const createSchema = Joi.object({
  body: Joi.object({
    full_name: Joi.string().trim().max(100).required(),
    email: email.optional().allow(""),
    phone: citizenPhone,
    password: citizenPassword,
    date_of_birth: Joi.date().iso().required(),
    nin: citizenNin,
    member_actif: objectId.optional(),
    party: objectId.optional(),
    wilaya: objectId.optional(),
    commune: objectId.optional(),
  }).required(),
}).unknown(true);

export const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    full_name: Joi.string().trim().max(100),
    email: email.optional().allow(""),
    phone: citizenPhoneOptional,
    password: citizenPasswordOptional,
    date_of_birth: Joi.date().iso(),
    nin: citizenNinOptional,
    member_actif: objectId,
    party: objectId,
    wilaya: objectId,
    commune: objectId,
  })
    .min(1)
    .required(),
}).unknown(true);

export const listSchema = Joi.object({
  query: Joi.object({
    wilaya: objectId.optional(),
    commune: objectId.optional(),
    member_actif: objectId.optional(),
    party: objectId.optional(),
    search: Joi.string().max(100).optional(),
    ...paginationQuery,
  }).required(),
}).unknown(true);

export const getByIdSchema = Joi.object({ params: Joi.object({ id: objectId.required() }).required() }).unknown(true);
