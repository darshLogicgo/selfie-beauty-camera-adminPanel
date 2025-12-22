import Joi from "joi";

const updateSubscriptionAppUserId = {
  body: Joi.object({
    appUserId: Joi.string().required().messages({
      "any.required": "appUserId is required",
      "string.empty": "appUserId cannot be empty",
    }),
  }),
};

export default {
  updateSubscriptionAppUserId
};

