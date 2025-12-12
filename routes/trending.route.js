import express from "express";
import validate from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import verifyRole from "../middleware/verify-role.middleware.js";
import trendingController from "../controllers/trending.controller.js";
import trendingValidation from "../validations/trending.validation.js";
import enums from "../config/enum.config.js";

const route = express.Router();

/**
 * GET /api/v1/categories/trending/all
 * Get all categories for trending selection (Admin only)
 * Must come before /trending route
 */
route.get(
  "/",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  trendingController.getAllCategoriesForTrending
);

/**
 * GET /api/v1/categories/trending
 * Get trending categories (Client side - sorted by trendingOrder)
 */
// route.get("/trending", verifyToken, trendingController.getTrendingCategories);
route.get("/list", verifyToken, trendingController.getTrendingCategories);

/**
 * PATCH /api/v1/categories/trending/reorder
 * Bulk reorder trending categories (Admin only)
 * Must come before /:id routes
 */
route.patch(
  "/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(trendingValidation.reorderTrendingCategoriesValidation),
  trendingController.reorderTrendingCategories
);

/**
 * PATCH /api/v1/categories/:id/trending
 * Toggle category trending status (Admin only)
 */
route.patch(
  "/toggle-trending/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(trendingValidation.toggleTrendingValidation),
  trendingController.toggleCategoryTrending
);

export default route;
