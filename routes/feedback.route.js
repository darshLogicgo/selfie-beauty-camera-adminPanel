import express from "express";
import feedbackController from "../controllers/feedback.controller.js";
import upload from "../config/multer.config.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";

const route = express.Router();

route.get(
  "/",
  upload.none(),
  verifyToken,
  feedbackController.getFeedback
);

route.patch(
  "/:id/status",
  upload.none(),
  verifyToken,
  feedbackController.updateFeedbackStatus
);

export default route;
