import Joi from "joi";

/**
 * Toggle Trending Status Validation Schema
 */
const toggleTrendingValidation = {
  body: Joi.object().keys({
    isTrending: Joi.boolean().optional(),
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
 * Reorder Trending Categories Validation Schema
 */
const reorderTrendingCategoriesValidation = {
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
            trendingOrder: Joi.number().integer().min(1).required().messages({
              "number.base": "Trending order must be a number",
              "number.integer": "Trending order must be an integer",
              "number.min": "Trending order must be 1 or greater",
              "any.required": "Trending order is required",
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

/**
 * Reorder Trending Subcategories Validation Schema
 */
const reorderTrendingSubcategoriesValidation = {
  body: Joi.object()
    .keys({
      subcategories: Joi.array()
        .items(
          Joi.object({
            _id: Joi.string()
              .regex(/^[0-9a-fA-F]{24}$/)
              .required()
              .messages({
                "string.pattern.base": "Invalid subcategory ID format",
                "any.required": "Subcategory ID is required",
              }),
            trendingOrder: Joi.number().integer().min(1).required().messages({
              "number.base": "Trending order must be a number",
              "number.integer": "Trending order must be an integer",
              "number.min": "Trending order must be 1 or greater",
              "any.required": "Trending order is required",
            }),
          })
        )
        .min(1)
        .required()
        .messages({
          "array.base": "Subcategories must be an array",
          "array.min": "At least one subcategory must be provided for reordering",
          "any.required": "Subcategories array is required",
        }),
    })
    .required()
    .messages({
      "object.base": "Request body must be a valid object",
    }),
};

export default {
  toggleTrendingValidation,
  reorderTrendingCategoriesValidation,
  reorderTrendingSubcategoriesValidation,
};
