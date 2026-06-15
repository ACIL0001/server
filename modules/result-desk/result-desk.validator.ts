import Joi from "joi";
import { objectId, paginationQuery } from "../common/common.validator";
const statusEnum = Joi.string().valid("pending", "ocr_processing", "ocr_done", "verified", "mismatch", "ocr_human_done", "rejected");
export const submitDeskSchema = Joi.object({ body: Joi.object({ party: objectId.required(), desk: objectId.required(), candidat: objectId.required(), total: Joi.number().integer().min(0).required() }).required() }).unknown(true);
export const updateStatusSchema = Joi.object({ params: Joi.object({ id: objectId.required() }).required(), body: Joi.object({ status: statusEnum.required(), ocr_result: Joi.string().optional() }).required() }).unknown(true);
export const listDeskSchema = Joi.object({
  query: Joi.object({
    desk: objectId.optional(),
    party: objectId.optional(),
    status: statusEnum.optional(),
    owner: objectId.optional(),
    wilayaId: objectId.optional(),
    communeId: objectId.optional(),
    centerId: objectId.optional(),
    ...paginationQuery,
  }).required(),
}).unknown(true);
export const submitCenterSchema = Joi.object({ body: Joi.object({ center: objectId.required(), party: objectId.required(), result: Joi.number().integer().min(0).required() }).required() }).unknown(true);
export const listCenterSchema = Joi.object({ query: Joi.object({ center: objectId.optional(), party: objectId.optional(), status: Joi.string().valid("pending", "validated", "rejected").optional(), ...paginationQuery }).required() }).unknown(true);
export const getByIdSchema = Joi.object({ params: Joi.object({ id: objectId.required() }).required() }).unknown(true);
export const aggregateSchema = Joi.object({ params: Joi.object({ centerId: objectId.optional(), wilayaId: objectId.optional() }) }).unknown(true);
export const verifyDeskSchema = Joi.object({ params: Joi.object({ deskId: objectId.required() }).required() }).unknown(true);
