import express from "express";
import validate from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import verifyRole from "../middleware/verify-role.middleware.js";
import userPreferenceController from "../controllers/user-preference.controller.js";
import categoryValidation from "../validations/category.validation.js";
import userPreferenceValidation from "../validations/user-preference.validation.js";
import userPreferenceUserValidation from "../validations/user-preference-user.validation.js";
import userPreferenceReorderValidation from "../validations/user-preference-reorder.validation.js";
import userPreferenceCategoryReorderValidation from "../validations/user-preference-category-reorder.validation.js";
import enums from "../config/enum.config.js";

const route = express.Router();

/**
 * GET /api/v1/user-preference
 * Get user's preferences (User-facing API)
 * Returns all categories that the user has selected as preferences
 * @access Private (Authenticated User)
 */
route.get(
  "/",
  verifyToken,
  userPreferenceController.getUserPreferences
);

/**
 * GET /api/v1/user-preference/admin
 * Get all categories with status: true (Admin API)
 * Returns ALL categories where status: true, sorted by userPreferenceOrder
 * @access Private (Admin)
 */
route.get(
  "/admin",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  userPreferenceController.getUserPreferenceCategories
);

/**
 * GET /api/v1/user-preference/list
 * Get categories for users sorted by userPreferenceOrder (User-facing API)
 * Returns ONLY categories where isUserPreference: true, sorted by userPreferenceOrder
 * @access Private (Authenticated User - token required)
 */
route.get(
  "/list",
  verifyToken,
  userPreferenceController.getUserCategoriesByPreference
);

/**
 * POST /api/v1/user-preference
 * Add category to user preferences (User-facing API)
 * Stores userId and categoryId in UserPreference model
 * @access Private (Authenticated User)
 */
route.post(
  "/",
  verifyToken,
  validate(userPreferenceUserValidation.addUserPreferenceValidation),
  userPreferenceController.addUserPreference
);

/**
 * DELETE /api/v1/user-preference/:categoryId
 * Remove category from user preferences (User-facing API)
 * @access Private (Authenticated User)
 */
route.delete(
  "/:categoryId",
  verifyToken,
  validate(userPreferenceUserValidation.removeUserPreferenceValidation),
  userPreferenceController.removeUserPreference
);

/**
 * PATCH /api/v1/user-preference/reorder
 * Reorder categories by userPreferenceOrder (Admin only)
 * Updates userPreferenceOrder field in categories
 * @access Private (Admin)
 */
route.patch(
  "/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(userPreferenceCategoryReorderValidation.reorderUserPreferenceCategoriesValidation),
  userPreferenceController.reorderUserPreferenceCategories
);

/**
 * PATCH /api/v1/user-preference/:id
 * Update user preference order for a specific category (Admin only)
 * Automatically shifts existing categories if order conflict occurs
 */
route.patch(
  "/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(userPreferenceValidation.updateUserPreferenceOrderValidation),
  userPreferenceController.updateUserPreferenceOrder
);

/**
 * PATCH /api/v1/user-preference/toggle/:id
 * Toggle category user preference status (Admin only)
 */
route.patch(
  "/toggle/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(categoryValidation.updateCategoryValidation),
  userPreferenceController.toggleCategoryUserPreference
);

/**
 * PATCH /api/v1/user-preference/reorder/:categoryId
 * Reorder a single category with proper shifting logic (Admin only)
 * Uses MongoDB transactions for data safety
 * Only affects categories with isUserPreference = true
 * @access Private (Admin)
 */
route.patch(
  "/reorder/:categoryId",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(userPreferenceValidation.reorderCategoryValidation),
  userPreferenceController.reorderCategory
);

export default route;

