import Joi from "joi";
import { objectId, nin, phone, paginationQuery } from "../common/common.validator";

export const createSchema = Joi.object({
  body: Joi.object({ full_name: Joi.string().trim().max(100).required(), nin: nin.required(), phone: phone.required(), date_of_birth: Joi.date().required(), party: objectId.required(), wilaya: objectId.required(), commune: objectId.optional(), is_favorite: Joi.boolean().optional() }).unknown(true).required(),
}).unknown(true);

export const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({ full_name: Joi.string().trim().max(100), nin, phone, date_of_birth: Joi.date(), party: objectId, wilaya: objectId, commune: objectId, is_favorite: Joi.boolean(), result: Joi.number().min(0) }).unknown(true).min(1).required(),
}).unknown(true);

export const listSchema = Joi.object({
  query: Joi.object({ wilaya: objectId.optional(), commune: objectId.optional(), party: objectId.optional(), search: Joi.string().max(100).optional(), ...paginationQuery }).required(),
}).unknown(true);

export const getByIdSchema = Joi.object({ params: Joi.object({ id: objectId.required() }).required() }).unknown(true);
