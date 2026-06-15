import Joi from "joi";
import { objectId, email, password, nin, phone, paginationQuery } from "../common/common.validator";

const roleEnum = Joi.string().valid(
  "chef_centre",
  "observateur_bureau",
  "observateur_centre",
  "scrutateur"
);

const createBody = Joi.object({
  full_name: Joi.string().trim().max(100).required(),
  email: email.required(),
  password: password.required(),
  date_of_birth: Joi.date().required(),
  phone: phone.required(),
  nin: nin.required(),
  role: roleEnum.required(),
  wilaya: objectId.required(),
  commune: objectId.required(),
  center: objectId.optional(),
  desk: objectId.optional(),
  location: Joi.string().trim().max(500).optional(),
  assigned_time: Joi.string().trim().optional(),
  assigned_date: Joi.date().optional(),
})
  .custom((value, helpers) => {
    if (value.center) return value;
    if (value.location && String(value.location).trim().length > 0) return value;
    return helpers.error("any.custom", {
      message: "Either center or location is required",
    });
  })
  .messages({
    "any.custom": "Either center or location is required",
  });

export const createSchema = Joi.object({ body: createBody.required() }).unknown(true);

export const updateSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    full_name: Joi.string().trim().max(100),
    email,
    password: password.optional(),
    date_of_birth: Joi.date().optional(),
    phone,
    nin,
    role: roleEnum,
    wilaya: objectId,
    commune: objectId,
    center: objectId,
    desk: objectId,
    location: Joi.string().trim().max(500),
    assigned_time: Joi.string().trim(),
    assigned_date: Joi.date(),
  })
    .min(1)
    .required(),
}).unknown(true);

export const listSchema = Joi.object({
  query: Joi.object({
    wilaya: objectId.optional(),
    center: objectId.optional(),
    role: roleEnum.optional(),
    search: Joi.string().max(100).optional(),
    ...paginationQuery,
  }).required(),
}).unknown(true);

export const getByIdSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
}).unknown(true);
