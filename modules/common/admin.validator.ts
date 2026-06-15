import Joi from "joi";
import { objectId, email, password, nin, phone, statusEnum, paginationQuery } from "../common/common.validator";

const adminRole = Joi.string().valid("super_admin", "admin_wilaya", "admin_commun");

const adminBase = {
  full_name: Joi.string().trim().max(100),
  email,
  phone,
  nin,
  status: statusEnum,
  role: adminRole,
  wilaya: objectId,
  commune: objectId,
};

export const createAdminSchema = Joi.object({
  body: Joi.object({
    ...adminBase,
    full_name: adminBase.full_name.required(),
    email: email.required(),
    password: password.required(),
    phone: phone.required(),
    nin: nin.required(),
    role: adminRole.required(),
    wilaya: objectId.when("role", {
      is: Joi.valid("admin_wilaya", "admin_commun"),
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    commune: objectId.when("role", {
      is: "admin_commun",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
  })
    .unknown(true)
    .required(),
}).unknown(true);

export const updateAdminSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
  body: Joi.object({
    ...adminBase,
    password: password.optional(),
    wilaya: objectId.optional(),
    commune: objectId.optional(),
  })
    .unknown(true)
    .min(1)
    .required(),
}).unknown(true);

export const listAdminSchema = Joi.object({
  query: Joi.object({
    role: adminRole.optional(),
    wilaya: objectId.optional(),
    commune: objectId.optional(),
    status: statusEnum.optional(),
    search: Joi.string().max(100).optional(),
    ...paginationQuery,
  }).required(),
}).unknown(true);

export const getByIdSchema = Joi.object({
  params: Joi.object({ id: objectId.required() }).required(),
}).unknown(true);
