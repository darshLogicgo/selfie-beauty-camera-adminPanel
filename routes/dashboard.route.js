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

export default route;

