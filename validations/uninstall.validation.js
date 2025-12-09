import Joi from "joi";
import enums from "../config/enum.config.js";

const { uninstallReasons: UNINSTALL_REASONS } = enums;

const uninstallValidator = {
  body: Joi.object({
    package_name: Joi.string().optional().allow(null, ""),
    android_version: Joi.string().optional().allow(null, ""),
    app_version: Joi.string().optional().allow(null, ""),
    platform: Joi.string()
      .valid("android", "ios", "web")
      .optional()
      .allow(null, "")
      .messages({
        "any.only": "Please select a valid platform (Android, iOS, or Web).",
      }),
    device_model: Joi.string().optional().allow(null, ""),
    uninstall_reason: Joi.string()
      .valid(...Object.values(UNINSTALL_REASONS))
      .required()
      .messages({
        "any.required": "Please enter your reason for uninstalling our app.",
        "any.only": "Please select a valid reason for uninstalling our app.",
      }),
    other_reason_text: Joi.string().when("uninstall_reason", {
      is: UNINSTALL_REASONS.OTHER,
      then: Joi.string()
        .required()
        .messages({
          "any.required": "Please type your reason in the text box.",
        }),
      otherwise: Joi.string().optional().allow(null, ""),
    }),
  }),
};

const getUninstall = {
  query: Joi.object().keys({
    id: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    uninstall_reason: Joi.string().optional(),
    platform: Joi.string().optional(),
    userId: Joi.string().optional(),
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).optional(),
  }),
};

const deleteUninstall = {
  params: Joi.object().keys({
    id: Joi.string().required(),
  }),
};

export default {
  uninstallValidator,
  getUninstall,
  deleteUninstall,
};

