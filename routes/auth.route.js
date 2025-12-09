import validate from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import authController from "../controllers/auth.controller.js";
import authValidation from "../validations/auth.validation.js";
import express from "express";

const route = express.Router();

route.post("/verify/token", verifyToken, authController.verifyToken);

route.post("/register-by-email", validate(authValidation.registerByEmail), authController.registerByEmail);

route.post("/register-by-mobile", validate(authValidation.registerByMobile), authController.registerByMobile);

route.post("/verify-email-otp", validate(authValidation.verifyEmailOtp), authController.verifyEmailOtp);

route.post("/verify-mobile-otp", validate(authValidation.verifyMobileOtp), authController.verifyMobileOtp);

route.post("/resend-email-otp", validate(authValidation.resendEmailOtp), authController.resendEmailOtp);

route.post("/resend-mobile-otp", validate(authValidation.resendMobileOtp), authController.resendMobileOtp);

route.post("/login-by-email", validate(authValidation.loginByEmail), authController.loginByEmail);

route.post("/login-by-mobile", validate(authValidation.loginByMobile), authController.loginByMobile);

route.post("/forgot-password", validate(authValidation.forgotPassword), authController.forgotPassword);

route.post("/google-login", validate(authValidation.loginByGoogle), authController.loginByGoogle);

route.post("/apple-login", validate(authValidation.loginByApple), authController.loginByApple);

route.post("/reset-password", validate(authValidation.resetPassword), authController.resetPassword);

route.post("/guest-login", validate(authValidation.guestLogin), authController.guestLogin);

export default route;
