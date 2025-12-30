import express from "express";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import verifyRole from "../middleware/verify-role.middleware.js";
import dashboardController from "../controllers/dashboard.controller.js";
import enums from "../config/enum.config.js";

const route = express.Router();

/**
 * GET /api/v1/dashboard/stats
 * Get dashboard statistics (Admin only)
 */
route.get(
  "/stats",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  dashboardController.getDashboardStats
);

/**
 * GET /api/v1/dashboard/feature-performance
 * Get feature performance data (Admin only)
 */
route.get(
  "/feature-performance",
  // verifyToken,
  // verifyRole([enums.userRoleEnum.ADMIN]),
  dashboardController.getFeaturePerformance
);

/**
 * GET /api/v1/dashboard/device-distribution
 * Get device distribution data (Admin only)
 */
route.get(
  "/device-distribution",
  // verifyToken,
  // verifyRole([enums.userRoleEnum.ADMIN]),
  dashboardController.getDeviceDistribution
);

/**
 * POST /api/v1/dashboard/test-ai-edit-reminder-cron
 * Test endpoint to manually trigger AI Edit Reminder cron job (Admin only)
 */
route.post(
  "/test-ai-edit-reminder-cron",
  // verifyToken,
  // verifyRole([enums.userRoleEnum.ADMIN]),
  dashboardController.testAiEditReminderCron
);

export default route;

