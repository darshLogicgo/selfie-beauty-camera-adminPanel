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
      .optional()
      .allow("", null)
      .max(100)
      .messages({
        "string.max": "Install reference must be at most 100 characters",
      }),
  }),
  resolveByIpValidator: Joi.object({
    ipAddress: Joi.string()
      .trim()
      .required()
      .ip({ version: ['ipv4', 'ipv6'], cidr: 'optional' })
      .messages({
        "any.required": "IP address is required",
        "string.empty": "IP address cannot be empty",
        "string.ip": "IP address must be a valid IPv4 or IPv6 address",
      }),
  }),
};

export default shareValidation;

