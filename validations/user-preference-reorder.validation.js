import Joi from "joi";

/**
 * Reorder User Preferences Validation Schema
 * Allows bulk reordering of user preferences
 */
const reorderUserPreferencesValidation = {
  body: Joi.object()
    .keys({
      preferences: Joi.array()
        .items(
          Joi.object({
            _id: Joi.string()
              .regex(/^[0-9a-fA-F]{24}$/)
              .required()
              .messages({
                "string.pattern.base": "Invalid preference ID format",
                "any.required": "Preference ID is required",
              }),
            order: Joi.number().integer().min(0).required().messages({
              "number.base": "Order must be a number",
              "number.integer": "Order must be an integer",
              "number.min": "Order must be 0 or greater (typically starts from 1)",
              "any.required": "Order is required",
            }),
          })
        )
        .min(1)
        .required()
        .messages({
          "array.base": "Preferences must be an array",
          "array.min": "At least one preference must be provided for reordering",
          "any.required": "Preferences array is required",
        }),
    })
    .required()
    .messages({
      "object.base": "Request body must be a valid object",
    }),
};

export default {
  reorderUserPreferencesValidation,
};

