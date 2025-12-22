import Joi from "joi";

/**
 * Update User Preference Order Validation Schema
 * Updates userPreferenceOrder for a specific category
 */
const updateUserPreferenceOrderValidation = {
  body: Joi.object()
    .keys({
      userPreferenceOrder: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
          "number.base": "User preference order must be a number",
          "number.integer": "User preference order must be an integer",
          "number.min": "User preference order must be 0 or greater",
          "any.required": "userPreferenceOrder is required",
        }),
    })
    .required()
    .messages({
      "object.base": "Request body must be a valid object",
    }),

  params: Joi.object().keys({
    id: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid category ID format",
        "any.required": "Category ID is required",
      }),
  }),
};

/**
 * Reorder Category by User Preference Order Validation Schema
 * Reorders a single category with proper shifting logic
 */
const reorderCategoryValidation = {
  body: Joi.object()
    .keys({
      newOrder: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
          "number.base": "New order must be a number",
          "number.integer": "New order must be an integer",
          "number.min": "New order must be 1 or greater",
          "any.required": "newOrder is required",
        }),
    })
    .required()
    .messages({
      "object.base": "Request body must be a valid object",
    }),

  params: Joi.object().keys({
    categoryId: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid category ID format",
        "any.required": "Category ID is required",
      }),
  }),
};

export default {
  updateUserPreferenceOrderValidation,
  reorderCategoryValidation,
};

