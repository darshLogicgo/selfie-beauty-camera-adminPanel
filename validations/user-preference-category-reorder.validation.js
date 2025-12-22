import Joi from "joi";

/**
 * Reorder Categories by User Preference Order Validation Schema
 * Allows bulk reordering of categories by updating userPreferenceOrder field
 */
const reorderUserPreferenceCategoriesValidation = {
  body: Joi.object()
    .keys({
      categories: Joi.array()
        .items(
          Joi.object({
            _id: Joi.string()
              .regex(/^[0-9a-fA-F]{24}$/)
              .required()
              .messages({
                "string.pattern.base": "Invalid category ID format",
                "any.required": "Category ID is required",
              }),
            userPreferenceOrder: Joi.number()
              .integer()
              .min(0)
              .required()
              .messages({
                "number.base": "User preference order must be a number",
                "number.integer": "User preference order must be an integer",
                "number.min":
                  "User preference order must be 0 or greater (typically starts from 1)",
                "any.required": "User preference order is required",
              }),
          })
        )
        .min(1)
        .required()
        .messages({
          "array.base": "Categories must be an array",
          "array.min": "At least one category must be provided for reordering",
          "any.required": "Categories array is required",
        }),
    })
    .required()
    .messages({
      "object.base": "Request body must be a valid object",
    }),
};

export default {
  reorderUserPreferenceCategoriesValidation,
};

