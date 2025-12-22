import express from "express";
import validate from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import verifyRole from "../middleware/verify-role.middleware.js";
import moreController from "../controllers/more.controller.js";
import moreValidation from "../validations/more.validation.js";
import enums from "../config/enum.config.js";

const route = express.Router();

/**
 * GET /api/v1/categories/more/
 * Get all categories for More selection (Admin only)
 * Must come before /list route
 */
route.get(
  "/",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  moreController.getAllCategoriesForMore
);

/**
 * GET /api/v1/categories/more/list?excludeId=...
 * Get More categories (Client side - sorted by moreOrder)
 * Optional: excludeId query parameter to exclude a specific category
 */
route.get("/list", verifyToken, moreController.getMoreCategories);

/**
 * PATCH /api/v1/categories/more/reorder
 * Bulk reorder More categories (Admin only)
 * Must come before /:id routes
 */
route.patch(
  "/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(moreValidation.reorderMoreCategoriesValidation),
  moreController.reorderMoreCategories
);

/**
 * PATCH /api/v1/categories/more/toggle-more/:id
 * Toggle category More status (Admin only)
 */
route.patch(
  "/toggle-more/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(moreValidation.toggleMoreValidation),
  moreController.toggleCategoryMore
);

export default route;
