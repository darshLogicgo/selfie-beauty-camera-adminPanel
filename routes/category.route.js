import express from "express";
import validate from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import verifyRole from "../middleware/verify-role.middleware.js";
import categoryController from "../controllers/category.controller.js";
import upload from "../config/multer.config.js";
import categoryValidation from "../validations/category.validation.js";
import trendingRoute from "./trending.route.js";
import aiWorldRoute from "./aiworld.route.js";
import enums from "../config/enum.config.js";

const route = express.Router();

// Media upload field configuration
const mediaUpload = upload.fields([
  { name: "img_sqr", maxCount: 1 },
  { name: "img_rec", maxCount: 1 },
  { name: "video_sqr", maxCount: 1 },
  { name: "video_rec", maxCount: 1 },
]);

/**
 * POST /api/v1/categories
 * Create new category (Admin only)
 */
route.post(
  "/",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  mediaUpload,
  validate(categoryValidation.createCategoryValidation),
  categoryController.createCategory
);

/**
 * GET /api/v1/categories
 * Get all categories with pagination
 */
route.get("/", verifyToken, categoryController.getCategories);

/**
 * GET /api/v1/categories/titles
 * Get all category titles (Client side - Authenticated)
 */
route.get("/titles", verifyToken, categoryController.getCategoryTitles);

/**
 * PATCH /api/v1/categories/reorder
 * Bulk reorder categories (Admin only)
 * Must come before /:id routes
 */
route.patch(
  "/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(categoryValidation.reorderCategoriesValidation),
  categoryController.reorderCategories
);

/**
 * Trending routes - handled in separate trending.route.js file
 * Must come before /:id routes to avoid route conflicts
 */
route.use("/", trendingRoute);

/**
 * AI World routes - handled in separate aiworld.route.js file
 * Must come before /:id routes to avoid route conflicts
 */
route.use("/", aiWorldRoute);

/**
 * GET /api/v1/categories/:id
 * Get single category by ID
 */
route.get(
  "/:id",
  verifyToken,
  validate(categoryValidation.updateCategoryValidation),
  categoryController.getCategoryById
);

/**
 * PUT /api/v1/categories/:id
 * Update category (Admin only)
 */
route.patch(
  "/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  mediaUpload,
  validate(categoryValidation.updateCategoryValidation),
  categoryController.updateCategory
);

/**
 * DELETE /api/v1/categories/:id
 * Delete category (Admin only)
 */
route.delete(
  "/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(categoryValidation.deleteCategoryValidation),
  categoryController.deleteCategory
);

/**
 * PATCH /api/v1/categories/:id/status
 * Toggle category status (Admin only)
 */
route.patch(
  "/:id/status",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(categoryValidation.updateCategoryValidation),
  categoryController.toggleCategoryStatus
);

/**
 * PATCH /api/v1/categories/:id/premium
 * Toggle category premium status (Admin only)
 */
route.patch(
  "/:id/premium",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(categoryValidation.updateCategoryValidation),
  categoryController.toggleCategoryPremium
);

export default route;
