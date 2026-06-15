import Joi from "joi";
import { email, password, nin, phone } from "../common/common.validator";

export const loginSchema = Joi.object({
  body: Joi.object({
    email: email.required(),
    password: Joi.string().min(1).required(),
  }).required(),
}).unknown(true);

export const registerSuperAdminSchema = Joi.object({
  body: Joi.object({
    full_name: Joi.string().trim().max(100).required(),
    email: email.required(),
    password: password.required(),
    phone: phone.required(),
    nin: nin.required(),
  }).required(),
}).unknown(true);

export const updateProfileSchema = Joi.object({
  body: Joi.object({
    full_name: Joi.string().trim().max(100),
    email: email,
    phone: phone,
    goal: Joi.string().trim().max(500).allow(""),
    date_of_birth: Joi.date().iso(),
  })
    .min(1)
    .required(),
}).unknown(true);

export const changePasswordSchema = Joi.object({
  body: Joi.object({
    current_password: Joi.string().min(1).required(),
    new_password: password.required(),
  }).required(),
}).unknown(true);
