import express from "express";
import shareController from "../controllers/share.controller.js";
import upload from "../config/multer.config.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import validate from "../middleware/validate.middleware.js";
import shareValidation from "../validations/share.validation.js";

const route = express.Router();

// Generate share link with JWT token (requires authentication)
route.post(
  "/generate-link",
  upload.none(),
  verifyToken,
//   validate(shareValidation.generateShareLinkValidator),
  shareController.generateShareLink
);

// Handle deep link route (serves HTML page and decodes JWT)
route.get(
  "/:categoryId",
  upload.none(),
  shareController.handleShareDeepLink
);

export default route;

