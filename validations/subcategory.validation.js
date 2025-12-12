import Joi from "joi";
import { StatusCodes } from "http-status-codes";
import { apiResponse } from "../helper/api-response.helper.js";

const baseSchema = {
  categoryId: Joi.string().trim().required().messages({
    "any.required": "categoryId is required",
    "string.empty": "categoryId cannot be empty",
  }),
  subcategoryTitle: Joi.string().trim().required().messages({
    "any.required": "subcategoryTitle is required",
    "string.empty": "subcategoryTitle cannot be empty",
  }),
  img_sqr: Joi.string().allow("", null),
  img_rec: Joi.string().allow("", null),
  video_sqr: Joi.string().allow("", null),
  video_rec: Joi.string().allow("", null),
  status: Joi.boolean(),
  order: Joi.number().integer().min(1),
  imageCount: Joi.number().integer().min(1).optional().default(1).messages({
    "number.base": "imageCount must be a number",
    "number.integer": "imageCount must be an integer",
    "number.min": "imageCount must be at least 1",
  }),
};

// Create
// Define files schema to validate uploaded file types per field
const filesSchema = Joi.object({
  img_sqr: Joi.array()
    .items(
      Joi.object({
        fieldname: Joi.string().valid("img_sqr"),
        mimetype: Joi.string()
          .pattern(/^image\//)
          .required()
          .messages({
            "string.pattern.base":
              "img_sqr must be an image file (jpg, png, gif, etc.).",
          }),
      }).unknown(true)
    )
    .max(1),
  img_rec: Joi.array()
    .items(
      Joi.object({
        fieldname: Joi.string().valid("img_rec"),
        mimetype: Joi.string()
          .pattern(/^image\//)
          .required()
          .messages({
            "string.pattern.base":
              "img_rec must be an image file (jpg, png, gif, etc.).",
          }),
      }).unknown(true)
    )
    .max(1),
  video_sqr: Joi.array()
    .items(
      Joi.object({
        fieldname: Joi.string().valid("video_sqr"),
        mimetype: Joi.string()
          .pattern(/^video\//)
          .required()
          .messages({
            "string.pattern.base":
              "video_sqr must be a video file (mp4, mov, webm, etc.).",
          }),
      }).unknown(true)
    )
    .max(1),
  video_rec: Joi.array()
    .items(
      Joi.object({
        fieldname: Joi.string().valid("video_rec"),
        mimetype: Joi.string()
          .pattern(/^video\//)
          .required()
          .messages({
            "string.pattern.base":
              "video_rec must be a video file (mp4, mov, webm, etc.).",
          }),
      }).unknown(true)
    )
    .max(1),
}).unknown(true);

export const createSubcategorySchema = {
  body: Joi.object(baseSchema),
  files: filesSchema,
};

// Update
export const updateSubcategorySchema = {
  body: Joi.object(baseSchema),
  files: filesSchema,
};

export const toggleStatusSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
  body: Joi.object({
    status: Joi.alternatives()
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
      .required()
      .messages({
        "any.required": "status is required",
        "alternatives.match":
          "status must be a boolean or string ('true'/'false'/'1'/'0')",
      }),
  }),
};

export const togglePremiumSchema = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
  body: Joi.object({
    isPremium: Joi.boolean().optional(),
  }),
};

// Batch order update
export const updateOrderSchema = {
  body: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().required(),
        order: Joi.number().integer().min(1).required(),
      })
    )
    .min(1)
    .required(),
};

// Media validation
export const requireAtLeastOneMedia = (req, res, next) => {
  const { img_sqr, img_rec, video_sqr, video_rec } = req.body || {};

  const hasMedia =
    (typeof img_sqr === "string" && img_sqr.trim() !== "") ||
    (typeof img_rec === "string" && img_rec.trim() !== "") ||
    (typeof video_sqr === "string" && video_sqr.trim() !== "") ||
    (typeof video_rec === "string" && video_rec.trim() !== "");

  if (!hasMedia) {
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message:
        "Validation Error: At least one media type (square/rectangle image or video) is required.",
      data: null,
    });
  }
  return next();
};

// Asset management validation
// Supports: file uploads (asset_images), addUrl, removeUrl, removeUrls
export const manageAssetSchema = {
  params: Joi.object({
    id: Joi.string().required().messages({
      "any.required": "Subcategory ID is required",
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
  }).custom((value, helpers) => {
    // Allow empty body if files are present (files will be validated separately)
    // This validation will pass if files exist, controller will handle the logic
    return value;
  }),
  files: Joi.object({
    asset_images: Joi.array()
      .items(
        Joi.object({
          fieldname: Joi.string().valid("asset_images"),
          mimetype: Joi.string()
            .pattern(/^image\//)
            .required()
            .messages({
              "string.pattern.base":
                "asset_images must be image files (jpg, png, gif, etc.).",
            }),
        }).unknown(true)
      )
      .optional(),
  }).unknown(true),
};

// Update individual asset properties
export const updateAssetImageSchema = {
  params: Joi.object({
    id: Joi.string().required().messages({
      "any.required": "Subcategory ID is required",
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
  })
    .custom((value, helpers) => {
      // Require either assetId or url
      if (!value.assetId && !value.url) {
        return helpers.error("object.missing", {
          message: "Either assetId or url is required to identify the asset",
        });
      }
      // Require at least one of isPremium, imageCount, or imagecount
      if (
        value.isPremium === undefined &&
        value.imageCount === undefined &&
        value.imagecount === undefined
      ) {
        return helpers.error("object.missing", {
          message: "At least one of isPremium or imageCount must be provided",
        });
      }
      return value;
    })
    .messages({
      "object.missing":
        "Either assetId or url is required, and at least one of isPremium or imageCount must be provided",
    }),
};

export default {
  createSubcategorySchema,
  updateSubcategorySchema,
  toggleStatusSchema,
  togglePremiumSchema,
  updateOrderSchema,
  requireAtLeastOneMedia,
  manageAssetSchema,
  updateAssetImageSchema,
};
