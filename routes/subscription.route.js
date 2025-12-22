import express from "express";
import controller from "../controllers/subscription.controller.js";
import upload from "../config/multer.config.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import validate from "../middleware/validate.middleware.js";
import validation from "../validations/subscription.validation.js";

const route = express.Router();

route.get("/check-subscription", upload.none(), verifyToken, controller.getSubscriptionCheck);

route.post("/add-subscription-appId", upload.none(), verifyToken, validate(validation.updateSubscriptionAppUserId), controller.updateSubscriptionAppUserId);

// RevenueCat Webhook endpoint (no authentication required for webhooks)
route.post("/webhook", upload.none(), controller.handleRevenueCatWebhook);

export default route;

