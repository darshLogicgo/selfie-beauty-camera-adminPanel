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

// Resolve install reference (called by Android app after install)
// IMPORTANT: This must come BEFORE the dynamic /:categoryId route
route.get(
  "/resolve-install-ref",
  upload.none(),
  validate(shareValidation.resolveInstallRefValidator),
  shareController.resolveInstallRef
);

// Resolve deferred link by IP address (called by Android app)
// IMPORTANT: This must come BEFORE the dynamic /:categoryId route
route.get(
  "/resolve-by-ip",
  upload.none(),
  // validate(shareValidation.resolveByIpValidator),
  shareController.resolveByIp
);

// Create deferred link (called by JavaScript when app doesn't open)
// IMPORTANT: This must come BEFORE the dynamic /:categoryId route
route.get(
  "/create-deferred/:categoryId",
  upload.none(),
  shareController.createDeferredLink
);

// Handle deep link route (serves HTML page and decodes JWT)
// IMPORTANT: This dynamic route must be LAST to avoid matching specific routes
route.get(
  "/:categoryId",
  upload.none(),
  shareController.handleShareDeepLink
);

export default route;

