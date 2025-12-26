import Joi from "joi";

const sendNotification = {
  body: Joi.object().keys({
    userID: Joi.string().required().messages({
      "any.required": "userID is required",
      "string.base": "userID must be a string",
    }),
    title: Joi.string().required().messages({
      "any.required": "title is required",
      "string.base": "title must be a string",
    }),
    description: Joi.string().required().messages({
      "any.required": "description is required",
      "string.base": "description must be a string",
    }),
    image: Joi.string().uri().allow(null, "").optional().messages({
      "string.uri": "image must be a valid URL",
    }),
    screenName: Joi.string().allow(null, "").optional().messages({
      "string.base": "screenName must be a string",
    }),
    imageUrl: Joi.string().uri().allow(null, "").optional().messages({
      "string.uri": "imageUrl must be a valid URL",
    }),
    generatedImageTitle: Joi.string().allow(null, "").optional().messages({
      "string.base": "generatedImageTitle must be a string",
    }),
  }),
};

export default {
  sendNotification,
};

