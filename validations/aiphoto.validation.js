import Joi from "joi";

// Toggle subcategory AI Photo status
export const toggleAiPhotoValidation = {
  params: Joi.object({
    id: Joi.string().required().messages({
      "any.required": "Subcategory ID is required",
    }),
  }),
  body: Joi.object({
    isAiWorld: Joi.boolean().required().messages({
      "any.required": "isAiWorld is required",
      "boolean.base": "isAiWorld must be a boolean",
    }),
  }),
};

// Bulk reorder AI Photo subcategories
export const reorderAiPhotoSubcategoriesValidation = {
  body: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required().messages({
          "any.required": "ID is required",
        }),
        aiWorldOrder: Joi.number().integer().min(1).required().messages({
          "any.required": "aiWorldOrder is required",
          "number.base": "aiWorldOrder must be a number",
          "number.integer": "aiWorldOrder must be an integer",
          "number.min": "aiWorldOrder must be at least 1",
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.base": "Request body must be an array",
      "array.min": "Array must contain at least one item",
      "any.required": "Request body is required",
    }),
};

export default {
  toggleAiPhotoValidation,
  reorderAiPhotoSubcategoriesValidation,
};

