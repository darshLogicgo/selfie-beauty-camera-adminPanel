import Joi from "joi";
import enumConfig from "../config/enum.config.js";

const updateUserProfile = {
  body: Joi.object().keys({
    username: Joi.string().min(1).max(100),
    profileImage: Joi.string().allow(null, ""),
    deviceId: Joi.string().allow(null, "").optional(),
  }),
};

const updateRole = {
  body: Joi.object().keys({
    role: Joi.string().valid(...Object.values(enumConfig.userRoleEnum)),
  }),
}

const deleteUserAccountValidation = {
  body: Joi.object().keys({
    isPermanentlyDelete: Joi.boolean().required(),
  }),
};

const changePassword = {
  body: Joi.object().keys({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required(),
    conformNewPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
  }),
};

const recoveryEmail = {
  body: Joi.object().keys({
    backupEmail: Joi.string().email().required(),
  }),
}

const recoveryMobileNumber = {
  body: Joi.object().keys({
    backupMobileNumber: Joi.number().strict().required(),
    backupCountryCode: Joi.string().required(),
  }),
}

const verif2faOtp = {
  body: Joi.object().keys({
    otp: Joi.number().strict().required(),
  }),
}

const updateFcmToken = {
  body: Joi.object().keys({
    fcmToken: Joi.string().required().messages({
      "any.required": "FCM token is required",
      "string.base": "FCM token must be a string",
    }),
  }),
};

export default {
  updateUserProfile,
  deleteUserAccountValidation,
  changePassword,
  recoveryEmail,
  recoveryMobileNumber,
  updateRole,
  verif2faOtp,
  updateFcmToken
};
