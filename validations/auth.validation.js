import Joi from "joi";

const verifyToken = {
  body: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

const registerByEmail = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    username: Joi.string(),
    deviceId: Joi.string().allow(null, "").optional(),
  }),
};

const verifyEmailOtp = {
  body: Joi.object().keys({
    otp: Joi.number().strict().required(),
    email: Joi.string().email().required(),
  }),
};

const resendEmailOtp = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    type: Joi.string().required(),
  }),
};

const loginByEmail = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    deviceId: Joi.string().allow(null, "").optional(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resendForgotPasswordOtp = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const verifyForgotPasswordOtp = {
  body: Joi.object().keys({
    otp: Joi.number().strict().required(),
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    newPassword: Joi.string().required(),
    conformNewPassword: Joi.string().valid(Joi.ref("newPassword")).required(),
  }),
};

const loginByApple = {
  body: Joi.object({
    idToken: Joi.string().required(),
    deviceId: Joi.string().allow(null, "").optional(),
  }),
};

const loginByGoogle = {
  body: Joi.object({
    idToken: Joi.string().required(),
    deviceId: Joi.string().allow(null, "").optional(),
  }),
};

const verifyMobileOtp = {
  body: Joi.object().keys({
    otp: Joi.number().strict().required(),
    mobileNumber: Joi.number().strict().required(),
  }),
};

const resendMobileOtp = {
  body: Joi.object().keys({
    mobileNumber: Joi.number().strict().required(),
    type: Joi.string().required(),
  }),
};

const registerByMobile = {
  body: Joi.object().keys({
    mobileNumber: Joi.number().strict().required(),
    password: Joi.string().required(),
    username: Joi.string().optional(),
    deviceId: Joi.string().allow(null, "").optional(),
  }),
};

const loginByMobile = {
  body: Joi.object().keys({
    mobileNumber: Joi.number().strict().required(),
    password: Joi.string().required(),
    deviceId: Joi.string().allow(null, "").optional(),
  }),
};

const guestLogin = {
  body: Joi.object().keys({
    deviceId: Joi.string().required().messages({
      "any.required": "Device ID is required",
      "string.base": "Device ID must be a string",
    }),
    fcmToken: Joi.string().allow(null, "").optional(),
  }),
};

export default {
  verifyToken,
  registerByEmail,
  loginByEmail,
  forgotPassword,
  resendEmailOtp,
  verifyEmailOtp,
  resendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  loginByGoogle,
  loginByApple,
  verifyMobileOtp,
  resendMobileOtp,
  registerByMobile,
  loginByMobile,
  guestLogin,
};
