import Joi from "joi";
import { objectId, paginationQuery, sortQuery } from "../common/common.validator";

export const createSchema = Joi.object({
  body: Joi.object({
    name_fr: Joi.string().trim().min(2).required(),
    name_ar: Joi.string().trim().min(2).required(),
    wilaya_code: Joi.number().integer().min(1).max(69).required(),
    seats_count: Joi.number().integer().min(0).default(0),
  }).unknown(true).required(),
}).unknown(true);

export const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    name_fr: Joi.string().trim(),
    name_ar: Joi.string().trim(),
    wilaya_code: Joi.number().integer().min(1),
    seats_count: Joi.number().integer().min(0),
  }).unknown(true).min(1).required(),
}).unknown(true);

export const listSchema = Joi.object({
  query: Joi.object({ search: Joi.string().max(100).optional(), ...paginationQuery, ...sortQuery }).required(),
}).unknown(true);

export const getByIdSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
}).unknown(true);
