import Joi from "joi";
import { objectId, paginationQuery } from "../common/common.validator";
const typeEnum = Joi.string().valid("result_submitted", "result_validated", "assignment", "alert", "system", "reclamation", "message");
export const createSchema = Joi.object({ body: Joi.object({ type: typeEnum.required(), receivers: Joi.array().items(objectId).min(1).required(), title: Joi.string().trim().max(200).required(), body: Joi.string().trim().max(2000).required(), metadata: Joi.object().optional() }).required() }).unknown(true);
export const listSchema = Joi.object({ query: Joi.object({ is_read: Joi.string().valid("true", "false").optional(), type: typeEnum.optional(), ...paginationQuery }).required() }).unknown(true);
export const getByIdSchema = Joi.object({ params: Joi.object({ id: objectId.required() }).required() }).unknown(true);

export const createReclamationSchema = Joi.object({
  body: Joi.object({
    type: Joi.string().valid("reclamation", "message").required(),
    title: Joi.string().trim().max(200).required(),
    content: Joi.string().trim().max(2000).required(),
  }).required()
}).unknown(true);
