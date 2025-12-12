import Joi from "joi";
import enumConfig from "../config/enum.config.js";

/**
 * Create Feedback Validation (Client Side)
 */
export const createFeedbackValidation = {
  body: Joi.object({
    title: Joi.string().required().trim().messages({
      "any.required": "Title is required",
      "string.empty": "Title cannot be empty",
    }),
    description: Joi.string().required().trim().messages({
      "any.required": "Description is required",
      "string.empty": "Description cannot be empty",
    }),
    appVersion: Joi.string().optional().trim().allow("").messages({
      "string.base": "App version must be a string",
    }),
    platform: Joi.string()
      .optional()
      .valid("ANDROID", "IOS", "")
      .uppercase()
      .trim()
      .allow("")
      .messages({
        "any.only": "Platform must be either ANDROID or IOS",
      }),
  }),
};

/**
 * Get Feedback Validation (Admin Side)
 */
export const getFeedbackValidation = {
  query: Joi.object({
    id: Joi.string().optional().messages({
      "string.base": "ID must be a string",
    }),
    userId: Joi.string().optional().messages({
      "string.base": "User ID must be a string",
    }),
    platform: Joi.string()
      .optional()
      .valid("ANDROID", "IOS")
      .uppercase()
      .messages({
        "any.only": "Platform must be either ANDROID or IOS",
      }),
    startDate: Joi.date().optional().messages({
      "date.base": "Start date must be a valid date",
    }),
    endDate: Joi.date().optional().messages({
      "date.base": "End date must be a valid date",
    }),
    page: Joi.number().integer().min(1).optional().messages({
      "number.base": "Page must be a number",
      "number.integer": "Page must be an integer",
      "number.min": "Page must be at least 1",
    }),
    limit: Joi.number().integer().min(1).max(100).optional().messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit must be at most 100",
    }),
    status: Joi.string()
      .optional()
      .valid(...Object.values(enumConfig.feedbackStatusEnum))
      .lowercase()
      .messages({
        "any.only": `Status must be one of: ${Object.values(
          enumConfig.feedbackStatusEnum
        ).join(", ")}`,
      }),
    search: Joi.string().optional().trim().messages({
      "string.base": "Search query must be a string",
    }),
  }),
};

/**
 * Delete Feedback Validation (Admin Side)
 */
export const deleteFeedbackValidation = {
  params: Joi.object({
    id: Joi.string().required().messages({
      "any.required": "Feedback ID is required",
      "string.base": "Feedback ID must be a string",
    }),
  }),
};

/**
 * Update Feedback Status Validation (Admin Side)
 */
export const updateFeedbackStatusValidation = {
  params: Joi.object({
    id: Joi.string().required().messages({
      "any.required": "Feedback ID is required",
      "string.base": "Feedback ID must be a string",
    }),
  }),
  body: Joi.object({
    status: Joi.string()
      .required()
      .valid(...Object.values(enumConfig.feedbackStatusEnum))
      .lowercase()
      .messages({
        "any.required": "Status is required",
        "any.only": `Status must be one of: ${Object.values(
          enumConfig.feedbackStatusEnum
        ).join(", ")}`,
      }),
  }),
};

export default {
  createFeedbackValidation,
  getFeedbackValidation,
  deleteFeedbackValidation,
  updateFeedbackStatusValidation,
};
