import Joi from "joi";
import { objectId, paginationQuery } from "../common/common.validator";

export const createSchema = Joi.object({
  body: Joi.object({
    name: Joi.string().trim().max(200).required(),
    acronym: Joi.string().trim().max(20).required(),
    leader: Joi.string().trim().max(100).required(),
    founded: Joi.string().trim().optional(),
    wilaya: objectId.required(),
    number: Joi.number().integer().min(1).optional()
  }).required().unknown(true),
}).unknown(true);

export const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    name: Joi.string().trim().max(200).optional(),
    acronym: Joi.string().trim().max(20).optional(),
    leader: Joi.string().trim().max(100).optional(),
    founded: Joi.string().trim().optional(),
    wilaya: objectId.optional(),
    number: Joi.number().integer().min(1).optional()
  }).min(1).required().unknown(true),
}).unknown(true);

export const listSchema = Joi.object({
  query: Joi.object({ wilaya: objectId.optional(), search: Joi.string().max(100).optional(), ...paginationQuery }).required(),
}).unknown(true);

export const getByIdSchema = Joi.object({ params: Joi.object({ id: objectId.required() }).required() }).unknown(true);
