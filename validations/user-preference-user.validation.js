import Joi from "joi";

/**
 * Add User Preference Validation Schema
 */
const addUserPreferenceValidation = {
  body: Joi.object()
    .keys({
      categoryId: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
          "string.pattern.base": "Invalid category ID format",
          "any.required": "Category ID is required",
        }),
    })
    .required(),
};

/**
 * Set Default Preference Validation Schema
 */
const setDefaultPreferenceValidation = {
  body: Joi.object()
    .keys({
      categoryId: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
          "string.pattern.base": "Invalid category ID format",
          "any.required": "Category ID is required",
        }),
    })
    .required(),
};

/**
 * Bulk Add User Preferences Validation Schema
 */
const bulkAddUserPreferencesValidation = {
  body: Joi.object()
    .keys({
      categories: Joi.array()
        .items(
          Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
              "string.pattern.base": "Invalid category ID format",
              "any.required": "Category ID is required",
            })
        )
        .min(1)
        .required()
        .messages({
          "array.base": "Categories must be an array",
          "array.min": "At least one category must be provided",
          "any.required": "Categories array is required",
        }),
      setDefault: Joi.boolean().optional().messages({
        "boolean.base": "setDefault must be a boolean",
      }),
    })
    .required(),
};

/**
 * Remove User Preference Validation Schema
 */
const removeUserPreferenceValidation = {
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
  addUserPreferenceValidation,
  setDefaultPreferenceValidation,
  bulkAddUserPreferencesValidation,
  removeUserPreferenceValidation,
};

