import express from "express";
import validate from "../middleware/validate.middleware.js";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import aiPhotoController from "../controllers/aiphoto.controller.js";
import aiPhotoValidation from "../validations/aiphoto.validation.js";

const router = express.Router();

/**
 * GET /api/aiphoto/
 * Get all subcategories for AI Photo selection
 */
router.get("/", verifyToken, aiPhotoController.getAllSubcategoriesForAiPhoto);

/**
 * GET /api/aiphoto/list
 * Get AI Photo subcategories (Client side - sorted by aiWorldOrder)
 */
router.get("/list", aiPhotoController.getAiPhotoSubcategories);

/**
 * PATCH /api/aiphoto/reorder
 * Bulk reorder AI Photo subcategories
 * Must come before /:id routes
 */
router.patch(
  "/reorder",
  verifyToken,
  validate(aiPhotoValidation.reorderAiPhotoSubcategoriesValidation),
  aiPhotoController.reorderAiPhotoSubcategories
);

/**
 * PATCH /api/aiphoto/:id/aiphoto
 * Toggle subcategory AI Photo status
 */
router.patch(
  "/:id/toggle",
  verifyToken,
  validate(aiPhotoValidation.toggleAiPhotoValidation),
  aiPhotoController.toggleSubcategoryAiPhoto
);

export default router;
