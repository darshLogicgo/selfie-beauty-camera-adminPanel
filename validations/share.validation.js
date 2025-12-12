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
};

export default shareValidation;

