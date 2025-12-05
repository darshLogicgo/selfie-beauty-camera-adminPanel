import Joi from "joi";

/**
 * Toggle AI World Status Validation Schema
 */
const toggleAiWorldValidation = {
  body: Joi.object().keys({
    isAiWorld: Joi.boolean().optional(),
  }),
  params: Joi.object().keys({
    id: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid category ID format",
      }),
  }),
};

/**
 * Reorder AI World Categories Validation Schema
 */
const reorderAiWorldCategoriesValidation = {
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
            aiWorldOrder: Joi.number().integer().min(1).required().messages({
              "number.base": "AI World order must be a number",
              "number.integer": "AI World order must be an integer",
              "number.min": "AI World order must be 1 or greater",
              "any.required": "AI World order is required",
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
  toggleAiWorldValidation,
  reorderAiWorldCategoriesValidation,
};

