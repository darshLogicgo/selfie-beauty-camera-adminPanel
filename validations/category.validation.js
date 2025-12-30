import Joi from "joi";

/**
 * Create Category Validation Schema
 * Required: name
 * Optional: media files, status, order (order will be auto-assigned to last if not provided)
 * Allows unknown fields (like file field names in form-data) since files are handled separately via multer
 */
const createCategoryValidation = {
  body: Joi.object()
    .keys({
      name: Joi.string().trim().required().max(100).messages({
        "string.empty": "Category name is required",
        "string.max": "Category name cannot exceed 100 characters",
      }),

      status: Joi.boolean().optional().default(true),

      order: Joi.number().integer().min(0).optional(),

      // Trending and AI World fields
      isTrending: Joi.boolean().optional().default(false),
      isAiWorld: Joi.boolean().optional().default(false),

      // Premium field
      isPremium: Joi.boolean().optional().default(false),

      // Select Image count field - accept both camelCase and lowercase for form-data compatibility
      imageCount: Joi.alternatives()
        .try(
          Joi.number().integer().min(1),
          Joi.string()
            .pattern(/^\d+$/)
            .custom((value, helpers) => {
              const num = Number(value);
              if (num >= 1 && Number.isInteger(num)) return num;
              return helpers.error("number.min");
            })
        )
        .optional()
        .messages({
          "number.base": "imageCount must be a number",
          "number.integer": "imageCount must be an integer",
          "number.min": "imageCount must be at least 1",
          "string.pattern.base": "imageCount must be a valid number",
          "any.custom": "imageCount must be at least 1",
        }),
      // Also accept lowercase variant for form-data compatibility
      imagecount: Joi.alternatives()
        .try(
          Joi.number().integer().min(1),
          Joi.string()
            .pattern(/^\d+$/)
            .custom((value, helpers) => {
              const num = Number(value);
              if (num >= 1 && Number.isInteger(num)) return num;
              return helpers.error("number.min");
            })
        )
        .optional()
        .messages({
          "number.base": "imagecount must be a number",
          "number.integer": "imagecount must be an integer",
          "number.min": "imagecount must be at least 1",
          "string.pattern.base": "imagecount must be a valid number",
          "any.custom": "imagecount must be at least 1",
        }),

      // Prompt field
      prompt: Joi.string().trim().optional().default("").messages({
        "string.base": "Prompt must be a string",
      }),

      // Country and App Version fields
      country: Joi.string().allow(null, "").optional().trim(),
      android_appVersion: Joi.string().allow(null, "").optional().trim(),
      ios_appVersion: Joi.string().allow(null, "").optional().trim(),

      // Allow file field names in body (they're handled separately via multer in req.files)
      // These are optional and ignored if present as text fields
      img_sqr: Joi.any().optional(),
      img_rec: Joi.any().optional(),
      video_sqr: Joi.any().optional(),
      video_rec: Joi.any().optional(),
    })
    .unknown(true), // Allow other unknown fields (form-data may include file field names)
};

/**
 * Update Category Validation Schema
 * All fields optional for partial updates
 * Allows unknown fields (like file field names in form-data) since files are handled separately via multer
 */
const updateCategoryValidation = {
  body: Joi.object()
    .keys({
      name: Joi.string().trim().optional().max(100).messages({
        "string.max": "Category name cannot exceed 100 characters",
      }),

      status: Joi.boolean().optional(),

      order: Joi.number().integer().min(0).optional(),

      // Premium field
      isPremium: Joi.boolean().optional(),

      // Select Image count field
      imageCount: Joi.number().integer().min(1).optional().messages({
        "number.base": "Select image count must be a number",
        "number.integer": "Select image count must be an integer",
        "number.min": "Select image count must be at least 1",
      }),

      // Prompt field
      prompt: Joi.string().trim().optional().messages({
        "string.base": "Prompt must be a string",
      }),

      // User Preference fields
      isUserPreference: Joi.boolean().optional(),
      userPreferenceOrder: Joi.number().integer().min(0).optional().messages({
        "number.base": "User preference order must be a number",
        "number.integer": "User preference order must be an integer",
        "number.min": "User preference order must be 0 or greater",
      }),

      // Country and App Version fields
      country: Joi.string().allow(null, "null", "").optional().trim(),
      android_appVersion: Joi.string().allow(null, "null", "").optional().trim(),
      ios_appVersion: Joi.string().allow(null, "null", "").optional().trim(),

      // Allow file field names in body (they're handled separately via multer in req.files)
      // These are optional and can be set to null to remove/clear media
      img_sqr: Joi.any().optional().allow(null, "null", ""),
      img_rec: Joi.any().optional().allow(null, "null", ""),
      video_sqr: Joi.any().optional().allow(null, "null", ""),
      video_rec: Joi.any().optional().allow(null, "null", ""),
    })
    .unknown(true), // Allow other unknown fields (form-data may include file field names)

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
 * Reorder Categories Validation Schema
 */
const reorderCategoriesValidation = {
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
            order: Joi.number().integer().min(0).required().messages({
              "number.base": "Order must be a number",
              "number.integer": "Order must be an integer",
              "number.min":
                "Order must be 0 or greater (typically starts from 1)",
              "any.required": "Order is required",
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
 * Delete Category Validation Schema
 */
const deleteCategoryValidation = {
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
 * Set User Preference Validation Schema
 * Allows bulk setting of isUserPreference and userPreferenceOrder for multiple categories
 */
const setUserPreferenceValidation = {
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
            isUserPreference: Joi.boolean().optional().messages({
              "boolean.base": "isUserPreference must be a boolean",
            }),
            userPreferenceOrder: Joi.number()
              .integer()
              .min(0)
              .optional()
              .messages({
                "number.base": "User preference order must be a number",
                "number.integer": "User preference order must be an integer",
                "number.min": "User preference order must be 0 or greater",
              }),
          })
            .or("isUserPreference", "userPreferenceOrder")
            .messages({
              "object.missing":
                "At least one of isUserPreference or userPreferenceOrder must be provided",
            })
        )
        .min(1)
        .required()
        .messages({
          "array.base": "Categories must be an array",
          "array.min": "At least one category must be provided",
          "any.required": "Categories array is required",
        }),
    })
    .required()
    .messages({
      "object.base": "Request body must be a valid object",
    }),
};

// Asset management validation
// Supports: file uploads (asset_images), addUrl, removeUrl, removeUrls
const manageCategoryAssetValidation = {
  params: Joi.object({
    id: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid category ID format",
        "any.required": "Category ID is required",
      }),
  }),
  body: Joi.object({
    addUrl: Joi.string().uri().optional().messages({
      "string.uri": "addUrl must be a valid URL",
    }),
    removeUrl: Joi.string().optional(), // Can be URL or asset ID
    removeUrls: Joi.array().items(Joi.string()).optional().messages({
      "array.base": "removeUrls must be an array",
    }),
    isPremium: Joi.alternatives()
      .try(
        Joi.boolean(),
        Joi.string().valid(
          "true",
          "false",
          "1",
          "0",
          "True",
          "False",
          "TRUE",
          "FALSE"
        )
      )
      .optional(),
    imageCount: Joi.alternatives()
      .try(
        Joi.number().integer().min(1),
        Joi.string()
          .pattern(/^\d+$/)
          .custom((value) => {
            const num = Number(value);
            if (isNaN(num) || num < 1) {
              throw new Error("imageCount must be a number >= 1");
            }
            return num;
          })
      )
      .optional(),
    imagecount: Joi.alternatives()
      .try(
        Joi.number().integer().min(1),
        Joi.string()
          .pattern(/^\d+$/)
          .custom((value) => {
            const num = Number(value);
            if (isNaN(num) || num < 1) {
              throw new Error("imagecount must be a number >= 1");
            }
            return num;
          })
      )
      .optional(),
    prompt: Joi.string().trim().optional(),
  }).unknown(true),
};

// Update individual asset properties
const updateCategoryAssetValidation = {
  params: Joi.object({
    id: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "Invalid category ID format",
        "any.required": "Category ID is required",
      }),
  }),
  body: Joi.object({
    assetId: Joi.string().optional().messages({
      "string.base": "assetId must be a string",
    }),
    url: Joi.string().optional().messages({
      "string.base": "url must be a string",
    }),
    isPremium: Joi.alternatives()
      .try(
        Joi.boolean(),
        Joi.string().valid(
          "true",
          "false",
          "1",
          "0",
          "True",
          "False",
          "TRUE",
          "FALSE"
        )
      )
      .optional(),
    imageCount: Joi.alternatives()
      .try(
        Joi.number().integer().min(1),
        Joi.string()
          .pattern(/^\d+$/)
          .custom((value) => {
            const num = Number(value);
            if (isNaN(num) || num < 1) {
              throw new Error("imageCount must be a number >= 1");
            }
            return num;
          })
      )
      .optional(),
    imagecount: Joi.alternatives()
      .try(
        Joi.number().integer().min(1),
        Joi.string()
          .pattern(/^\d+$/)
          .custom((value) => {
            const num = Number(value);
            if (isNaN(num) || num < 1) {
              throw new Error("imagecount must be a number >= 1");
            }
            return num;
          })
      )
      .optional(),
    prompt: Joi.string().trim().optional(),
  })
    .custom((value, helpers) => {
      // Require either assetId or url
      if (!value.assetId && !value.url) {
        return helpers.error("object.missing", {
          message: "Either assetId or url is required to identify the asset",
        });
      }
      // Require at least one of isPremium, imageCount, or prompt
      if (
        value.isPremium === undefined &&
        value.imageCount === undefined &&
        value.imagecount === undefined &&
        value.prompt === undefined
      ) {
        return helpers.error("object.missing", {
          message: "At least one of isPremium, imageCount, or prompt must be provided",
        });
      }
      return value;
    })
    .messages({
      "object.missing":
        "Either assetId or url is required, and at least one of isPremium, imageCount, or prompt must be provided",
    }),
};

export default {
  createCategoryValidation,
  updateCategoryValidation,
  reorderCategoriesValidation,
  deleteCategoryValidation,
  setUserPreferenceValidation,
  manageCategoryAssetValidation,
  updateCategoryAssetValidation,
};
