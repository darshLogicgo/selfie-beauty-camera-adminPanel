import express from "express";
import validate from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import verifyRole from "../middleware/verify-role.middleware.js";
import homeController from "../controllers/home.controller.js";
import enums from "../config/enum.config.js";

const route = express.Router();

/**
 * GET /api/v1/home
 * Get home page data with 8 sections (Client side - Authenticated)
 * Section 8 returns empty array if no subcategories have isSection8: true
 */
route.get("/", verifyToken, homeController.getHomeData);

/**
 * GET /api/v1/home/sections/all
 * Get all sections data in one response (Admin only)
 * Returns all categories and subcategories for all 8 sections
 */
route.get(
  "/sections/all",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.getAllSectionsData
);

/**
 * GET /api/v1/home/settings
 * Get home settings (Admin only)
 * Returns current section titles for Section 6 and Section 7
 */
route.get(
  "/settings",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.getHomeSettings
);

/**
 * PATCH /api/v1/home/settings
 * Update home settings (Admin only)
 * Updates section titles for Section 6 and Section 7
 */
route.patch(
  "/settings",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.updateHomeSettings
);

/**
 * GET /api/v1/home/section1/all
 * Get all categories for Section 1 selection (Admin only)
 * @deprecated Use /sections/all instead for better performance
 */
route.get(
  "/section1/all",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.getAllCategoriesForSection1
);

/**
 * GET /api/v1/home/section2/all
 * Get all categories for Section 2 selection (Admin only)
 */
route.get(
  "/section2/all",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.getAllCategoriesForSection2
);

/**
 * GET /api/v1/home/section3/all
 * Get all subcategories for Section 3 selection (Admin only)
 */
route.get(
  "/section3/all",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.getAllSubcategoriesForSection3
);

/**
 * GET /api/v1/home/section4/all
 * Get all subcategories for Section 4 selection (Admin only)
 */
route.get(
  "/section4/all",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.getAllSubcategoriesForSection4
);

/**
 * GET /api/v1/home/section5/all
 * Get all subcategories for Section 5 selection (Admin only)
 */
route.get(
  "/section5/all",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.getAllSubcategoriesForSection5
);

/**
 * GET /api/v1/home/section6/all
 * Get all categories for Section 6 selection (Admin only)
 */
route.get(
  "/section6/all",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.getAllCategoriesForSection6
);

/**
 * GET /api/v1/home/section7/all
 * Get all categories for Section 7 selection (Admin only)
 */
route.get(
  "/section7/all",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.getAllCategoriesForSection7
);

/**
 * PATCH /api/v1/home/section1/reorder
 * Bulk reorder Section 1 categories (Admin only)
 * Must come before /:section/:id routes
 */
route.patch(
  "/section1/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.reorderCategorySection
);

/**
 * PATCH /api/v1/home/section2/reorder
 * Bulk reorder Section 2 categories (Admin only)
 */
route.patch(
  "/section2/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.reorderCategorySection
);

/**
 * PATCH /api/v1/home/section3/reorder
 * Bulk reorder Section 3 subcategories (Admin only)
 */
route.patch(
  "/section3/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.reorderSubcategorySection
);

/**
 * PATCH /api/v1/home/section4/reorder
 * Bulk reorder Section 4 subcategories (Admin only)
 */
route.patch(
  "/section4/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.reorderSubcategorySection
);

/**
 * PATCH /api/v1/home/section5/reorder
 * Bulk reorder Section 5 subcategories (Admin only)
 */
route.patch(
  "/section5/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.reorderSubcategorySection
);

/**
 * PATCH /api/v1/home/section8/reorder
 * Bulk reorder Section 8 subcategories (Admin only)
 */
route.patch(
  "/section8/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.reorderSubcategorySection
);

/**
 * PATCH /api/v1/home/categories/toggle
 * Bulk toggle categories in multiple sections (1, 2, 6, 7) in one call (Admin only)
 */
route.patch(
  "/categories/toggle",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.bulkToggleCategorySections
);

/**
 * PATCH /api/v1/home/subcategories/toggle
 * Bulk toggle subcategories in multiple sections (3, 4, 5) in one call (Admin only)
 */
route.patch(
  "/subcategories/toggle",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.bulkToggleSubcategorySections
);

/**
 * PATCH /api/v1/home/categories/reorder
 * Bulk reorder categories in multiple sections (1, 2, 6, 7) in one call (Admin only)
 */
route.patch(
  "/categories/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.bulkReorderCategorySections
);

/**
 * PATCH /api/v1/home/subcategories/reorder
 * Bulk reorder subcategories in multiple sections (3, 4, 5) in one call (Admin only)
 */
route.patch(
  "/subcategories/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.bulkReorderSubcategorySections
);

/**
 * PATCH /api/v1/home/section6/reorder
 * Bulk reorder Section 6 categories (Admin only)
 */
route.patch(
  "/section6/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.reorderCategorySection
);

/**
 * PATCH /api/v1/home/section7/reorder
 * Bulk reorder Section 7 categories (Admin only)
 */
route.patch(
  "/section7/reorder",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.reorderCategorySection
);

/**
 * PATCH /api/v1/home/section1/:id
 * Toggle category Section 1 status (Admin only)
 */
route.patch(
  "/section1/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.toggleCategorySection
);

/**
 * PATCH /api/v1/home/section2/:id
 * Toggle category Section 2 status (Admin only)
 */
route.patch(
  "/section2/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.toggleCategorySection
);

/**
 * PATCH /api/v1/home/section3/:id
 * Toggle subcategory Section 3 status (Admin only)
 */
route.patch(
  "/section3/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.toggleSubcategorySection
);

/**
 * PATCH /api/v1/home/section4/:id
 * Toggle subcategory Section 4 status (Admin only)
 */
route.patch(
  "/section4/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.toggleSubcategorySection
);

/**
 * PATCH /api/v1/home/section5/:id
 * Toggle subcategory Section 5 status (Admin only)
 */
route.patch(
  "/section5/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.toggleSubcategorySection
);

/**
 * PATCH /api/v1/home/section8/:id
 * Toggle subcategory Section 8 status (Admin only)
 */
route.patch(
  "/section8/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.toggleSubcategorySection
);

/**
 * PATCH /api/v1/home/section6/:id
 * Toggle category Section 6 status (Admin only)
 */
route.patch(
  "/section6/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.toggleCategorySection
);

/**
 * PATCH /api/v1/home/section7/:id
 * Toggle category Section 7 status (Admin only)
 */
route.patch(
  "/section7/:id",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  homeController.toggleCategorySection
);

export default route;
