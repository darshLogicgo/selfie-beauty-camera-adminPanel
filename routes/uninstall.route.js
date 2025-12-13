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

// IMPORTANT: Specific routes must come before generic routes
route.get(
  "/app-versions",
  upload.none(),
  verifyToken,
  uninstallController.getAppVersions
);

route.get(
  "/",
  upload.none(),
  verifyToken,
  validate(uninstallValidation.getUninstall),
  uninstallController.getUninstall
);

route.delete(
  "/:id",
  upload.none(),
  verifyToken,
  uninstallController.deleteUninstall
);

export default route;

