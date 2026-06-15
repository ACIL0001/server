import type { RequestHandler } from "express";
import type Joi from "joi";

export function validate(schema: Joi.ObjectSchema): RequestHandler {
  return (req, res, next) => {
    const { error, value } = schema.validate(
      { body: req.body, query: req.query, params: req.params, headers: req.headers },
      { abortEarly: false, allowUnknown: true, stripUnknown: true, convert: true }
    );

    if (error) {
      return res.status(400).json({
        ok: false,
        message: "Validation error",
        details: error.details.map((d) => d.message),
      });
    }

    req.body = value.body;
    req.query = value.query;
    req.params = value.params;
    return next();
  };
}

