import express from "express";
import validate from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import verifyRole from "../middleware/verify-role.middleware.js";
import aiWorldController from "../controllers/aiworld.controller.js";
import aiWorldValidation from "../validations/aiworld.validation.js";
import enums from "../config/enum.config.js";

const route = express.Router();

/**
 * GET /api/v1/categories/ai-world/all
 * Get all categories for AI World selection (Admin only)
 * Must come before /ai-world route
 */
route.get(
  "/",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  aiWorldController.getAllCategoriesForAiWorld
);

/**
 * GET /api/v1/categories/ai-world
 * Get AI World categories (Client side - sorted by aiWorldOrder)
 */
// route.get("/ai-world", verifyToken, aiWorldController.getAiWorldCategories);
route.get("/list", aiWorldController.getAiWorldCategories);

/**
 * PATCH /api/v1/categories/ai-world/reorder
 * Bulk reorder AI World categories (Admin only)
 * Must come before /:id routes
 */
route.patch(
  "/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(aiWorldValidation.reorderAiWorldCategoriesValidation),
  aiWorldController.reorderAiWorldCategories
);

/**
 * PATCH /api/v1/categories/:id/ai-world
 * Toggle category AI World status (Admin only)
 */
route.patch(
  "/toggle-ai-world/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(aiWorldValidation.toggleAiWorldValidation),
  aiWorldController.toggleCategoryAiWorld
);

export default route;
