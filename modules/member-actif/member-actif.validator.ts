import Joi from "joi";
import { objectId, email, password, nin, phone, paginationQuery } from "../common/common.validator";

export const createSchema = Joi.object({
  body: Joi.object({ full_name: Joi.string().trim().max(100).required(), email: email.required(), phone: phone.required(), password: password.required(), date_of_birth: Joi.date().required(), nin: nin.required(), goal: Joi.string().trim().max(500).optional(), wilaya: objectId.required(), commune: objectId.required(), party: objectId.optional() }).unknown(true).required(),
}).unknown(true);

export const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({ full_name: Joi.string().trim().max(100), email, phone, password: password.optional(), date_of_birth: Joi.date(), nin, goal: Joi.string().trim().max(500), wilaya: objectId, commune: objectId, party: objectId }).unknown(true).min(1).required(),
}).unknown(true);

export const listSchema = Joi.object({
  query: Joi.object({ wilaya: objectId.optional(), commune: objectId.optional(), party: objectId.optional(), search: Joi.string().max(100).optional(), ...paginationQuery }).required(),
}).unknown(true);

export const getByIdSchema = Joi.object({ params: Joi.object({ id: objectId.required() }).required() }).unknown(true);
