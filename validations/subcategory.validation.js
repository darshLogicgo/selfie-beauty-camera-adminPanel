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
    status: Joi.boolean().required(),
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
    removeUrl: Joi.string().uri().optional().messages({
      "string.uri": "removeUrl must be a valid URL",
    }),
    removeUrls: Joi.array().items(Joi.string().uri()).optional().messages({
      "array.base": "removeUrls must be an array",
      "string.uri": "Each URL in removeUrls must be a valid URL",
    }),
  })
    .or("addUrl", "removeUrl", "removeUrls")
    .messages({
      "object.missing": "Please provide either addUrl, removeUrl, or removeUrls",
    }),
};

export default {
  createSubcategorySchema,
  updateSubcategorySchema,
  toggleStatusSchema,
  updateOrderSchema,
  requireAtLeastOneMedia,
  manageAssetSchema,
};
