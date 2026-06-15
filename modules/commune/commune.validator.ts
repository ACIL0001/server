import Joi from "joi";
import { objectId, paginationQuery } from "../common/common.validator";

export const createSchema = Joi.object({
  body: Joi.object({
    name_fr: Joi.string().trim().required(),
    name_ar: Joi.string().trim().required(),
    commune_id: Joi.number().integer().min(1).required(),
    wilaya: objectId.required(),
  }).unknown(true).required(),
}).unknown(true);

export const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    name_fr: Joi.string().trim(),
    name_ar: Joi.string().trim(),
    commune_id: Joi.number().integer().min(1),
    wilaya: objectId,
  }).unknown(true).min(1).required(),
}).unknown(true);

export const listSchema = Joi.object({
  query: Joi.object({ wilaya: objectId.optional(), search: Joi.string().max(100).optional(), ...paginationQuery }).required(),
}).unknown(true);

export const getByIdSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
}).unknown(true);
