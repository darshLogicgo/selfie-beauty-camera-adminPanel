import Joi from "joi";

// Toggle subcategory AI Photo status
export const toggleAiPhotoValidation = {
  params: Joi.object({
    id: Joi.string().required().messages({
      "any.required": "Subcategory ID is required",
    }),
  }),
  body: Joi.object({
    isAiPhoto: Joi.boolean().optional().messages({
      "boolean.base": "isAiPhoto must be a boolean",
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
        aiPhotoOrder: Joi.number().integer().min(1).required().messages({
          "any.required": "aiPhotoOrder is required",
          "number.base": "aiPhotoOrder must be a number",
          "number.integer": "aiPhotoOrder must be an integer",
          "number.min": "aiPhotoOrder must be at least 1",
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
