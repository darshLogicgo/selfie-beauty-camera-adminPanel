import Joi from "joi";

/**
 * Toggle More Status Validation Schema
 */
const toggleMoreValidation = {
  body: Joi.object().keys({
    isMore: Joi.boolean().optional(),
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
 * Reorder More Categories Validation Schema
 */
const reorderMoreCategoriesValidation = {
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
            moreOrder: Joi.number().integer().min(1).required().messages({
              "number.base": "More order must be a number",
              "number.integer": "More order must be an integer",
              "number.min": "More order must be 1 or greater",
              "any.required": "More order is required",
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
  toggleMoreValidation,
  reorderMoreCategoriesValidation,
};
