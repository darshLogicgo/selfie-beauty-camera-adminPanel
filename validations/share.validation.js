import Joi from "joi";

const shareValidation = {
  generateShareLinkValidator: Joi.object({
    categoryId: Joi.string()
      .trim()
      .required()
      .messages({
        "any.required": "Category ID is required",
        "string.empty": "Category ID cannot be empty",
      }),
    imageId: Joi.string().optional().allow(null, ""),
  }),
  resolveInstallRefValidator: Joi.object({
    installRef: Joi.string()
      .trim()
      .required()
      .uuid()
      .messages({
        "any.required": "Install reference is required",
        "string.empty": "Install reference cannot be empty",
        "string.guid": "Install reference must be a valid UUID",
      }),
  }),
};

export default shareValidation;

