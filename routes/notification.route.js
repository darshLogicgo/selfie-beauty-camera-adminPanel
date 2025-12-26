import express from "express";
import notificationController from "../controllers/notification.controller.js";
import validate from "../middleware/validate.middleware.js";
import notificationValidation from "../validations/notification.validation.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import { checkPermission } from "../middleware/verify-role.middleware.js";
import enumConfig from "../config/enum.config.js";

const route = express.Router();

// ---------------------------------------------- Notification Management ----------------------------------------------

route.post(
  "/send",
  verifyToken,
//   checkPermission([
//     enumConfig.userRoleEnum.ADMIN,
//     enumConfig.userRoleEnum.MANAGER,
//   ]),
  validate(notificationValidation.sendNotification),
  notificationController.sendNotification
);

export default route;

