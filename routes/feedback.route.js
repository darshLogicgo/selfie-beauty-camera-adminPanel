import express from "express";
import feedbackController from "../controllers/feedback.controller.js";
import validate from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import verifyRole from "../middleware/verify-role.middleware.js";
import feedbackValidation from "../validations/feedback.validation.js";
import upload from "../config/multer.config.js";
import enums from "../config/enum.config.js";

const route = express.Router();

/**
 * POST /api/v1/feedback
 * Create feedback (Client Side - Authenticated Users)
 */
route.post(
  "/",
  verifyToken,
  upload.fields([{ name: "attachments", maxCount: 10 }]),
  validate(feedbackValidation.createFeedbackValidation),
  feedbackController.createFeedback
);

/**
 * GET /api/v1/feedback
 * Get feedback list or single feedback by ID (Admin Side)
 */
route.get(
  "/",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(feedbackValidation.getFeedbackValidation),
  feedbackController.getFeedback
);

/**
 * DELETE /api/v1/feedback/:id
 * Delete feedback by ID (Admin Side)
 */
route.delete(
  "/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(feedbackValidation.deleteFeedbackValidation),
  feedbackController.deleteFeedback
);

/**
 * PATCH /api/v1/feedback/:id/status
 * Update feedback status (Admin Side)
 */
route.patch(
  "/:id/status",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(feedbackValidation.updateFeedbackStatusValidation),
  feedbackController.updateFeedbackStatus
);

export default route;

