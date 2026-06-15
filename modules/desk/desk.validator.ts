import Joi from "joi";
import { objectId, paginationQuery } from "../common/common.validator";
const deskType = Joi.string().valid("male", "female");
export const createSchema = Joi.object({
  body: Joi.object({
    desk_number: Joi.number().integer().min(1).required(),
    center: objectId.required(),
    wilaya: objectId.required(),
    commune: objectId.required(),
    type: deskType.required(),
    male_count: Joi.number().min(0).default(0),
    female_count: Joi.number().min(0).default(0),
    total_voters: Joi.number().min(0).default(0),
  }).required(),
}).unknown(true);
export const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    desk_number: Joi.number().integer().min(1),
    center: objectId,
    wilaya: objectId,
    commune: objectId,
    type: deskType,
    male_count: Joi.number().min(0),
    female_count: Joi.number().min(0),
    total_voters: Joi.number().min(0),
  })
    .min(1)
    .required(),
}).unknown(true);
export const listSchema = Joi.object({ query: Joi.object({ center: objectId.optional(), ...paginationQuery }).required() }).unknown(true);
export const getByIdSchema = Joi.object({ params: Joi.object({ id: objectId.required() }).required() }).unknown(true);
