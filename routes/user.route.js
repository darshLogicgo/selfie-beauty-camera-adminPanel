import express from "express";
import userController from "../controllers/user.controller.js";
import validate from "../middleware/validate.middleware.js";
import userValidation from "../validations/user.validation.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import multer from "multer";
import { checkPermission } from "../middleware/verify-role.middleware.js";
import enumConfig from "../config/enum.config.js";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const route = express.Router();

// ---------------------------------------------- Profile Management ----------------------------------------------

route.get("/profile", verifyToken, userController.getUserProfile);
route.put(
  "/profile",
  verifyToken,
  upload.single("profileImage"),
  validate(userValidation.updateUserProfile),
  userController.updateUserProfile
);
route.put(
  "/change-password",
  verifyToken,
  validate(userValidation.changePassword),
  userController.changePassword
);
route.delete(
  "/delete-account",
  verifyToken,
  validate(userValidation.deleteUserAccountValidation),
  userController.deleteAccount
);
route.patch(
  "/:id/role",
  verifyToken,
  checkPermission([
    enumConfig.userRoleEnum.ADMIN,
    enumConfig.userRoleEnum.MANAGER,
  ]),
  validate(userValidation.updateRole),
  userController.updateRole
);

// ---------------------------------------------- 2Fa Authentication ----------------------------------------------

route.get("/enable-2fa", verifyToken, userController.enable2fa);
route.get("/disable-2fa", verifyToken, userController.disable2fa);
route.patch(
  "/regenerate-recovery-code",
  verifyToken,
  userController.regenerateRecoveryCode
);
route.post(
  "/verify-2fa-otp",
  verifyToken,
  validate(userValidation.verif2faOtp),
  userController.verif2faOtp
);

// ---------------------------------------------- Recover Account ----------------------------------------------

route.patch(
  "/recovery-mail",
  verifyToken,
  validate(userValidation.recoveryEmail),
  userController.recoveryEmail
);
route.patch(
  "/recovery-mobile",
  verifyToken,
  validate(userValidation.recoveryMobileNumber),
  userController.recoveryMobileNumber
);

// ---------------------------------------------- FCM Token Management ----------------------------------------------

route.patch(
  "/update-fcm-token",
  verifyToken,
  validate(userValidation.updateFcmToken),
  userController.updateFcmToken
);

export default route;
