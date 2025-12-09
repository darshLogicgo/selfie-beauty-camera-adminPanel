import express from "express";
import uninstallController from "../controllers/uninstall.controller.js";
import upload from "../config/multer.config.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import validate from "../middleware/validate.middleware.js";
import uninstallValidation from "../validations/uninstall.validation.js";

const route = express.Router();

route.post(
  "/",
  verifyToken,
  validate(uninstallValidation.uninstallValidator),
  uninstallController.createUninstall
);

route.get(
  "/",
  upload.none(),
  verifyToken,
  uninstallController.getUninstall
);

route.delete(
  "/:id",
  upload.none(),
  verifyToken,
  uninstallController.deleteUninstall
);

export default route;

