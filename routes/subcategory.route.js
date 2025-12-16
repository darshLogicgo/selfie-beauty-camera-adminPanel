import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import verifyRole from "../middleware/verify-role.middleware.js";
import validate from "../middleware/validate.middleware.js";
import uploadMiddleware from "../middleware/upload.middleware.js"; // adjust path if different
import subcategoryController from "../controllers/subcategory.controller.js";
import subcategoryValidation from "../validations/subcategory.validation.js";
import enums from "../config/enum.config.js";

const router = express.Router();
// Middleware to parse form-data without files
const parseFormData = multer().none();

// Create
router.post(
  "/",
  verifyToken,
  uploadMiddleware,
  validate(subcategoryValidation.createSubcategorySchema),
  subcategoryController.createSubcategory
);

// Read all (Admin only)
router.get(
  "/",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  subcategoryController.getAllSubcategories
);

// Get all subcategory titles only (Client side - Authenticated)
router.get(
  "/titles",
  verifyToken,
  subcategoryController.getAllSubcategoryTitles
);

// Get other subcategories (exclude the one user clicked) - Client side - Authenticated
router.get("/others", verifyToken, subcategoryController.getOtherSubcategories);

// Get subcategory assets by ID (Client side - Authenticated)
// Must be before /:id route to avoid conflict
router.get(
  "/:id/assets",
  verifyToken,
  subcategoryController.getSubcategoryAssets
);

// Batch order update (must be before /:id routes)
router.patch(
  "/update-order",
  verifyToken,
  validate(subcategoryValidation.updateOrderSchema),
  subcategoryController.updateOrderBatch
);

// Toggle status (must be before /:id route)
router.patch(
  "/:id/status",
  verifyToken,
  parseFormData, // Parse form-data without requiring files
  validate(subcategoryValidation.toggleStatusSchema),
  subcategoryController.toggleStatus
);

// Toggle premium status (must be before /:id route)
router.patch(
  "/:id/premium",
  verifyToken,
  verifyRole([enums.userRoleEnum.ADMIN]),
  validate(subcategoryValidation.togglePremiumSchema),
  subcategoryController.toggleSubcategoryPremium
);

// Update individual asset properties (isPremium, imageCount) - must be before /:id/assets route
router.patch(
  "/:id/assets/premium",
  verifyToken,
  parseFormData, // Parse form-data
  validate(subcategoryValidation.updateAssetImageSchema),
  subcategoryController.updateAssetImage
);

// Manage asset images - PATCH (add files/URLs or remove URLs) - must be before /:id route
router.patch(
  "/:id/assets",
  verifyToken,
  uploadMiddleware, // Support file uploads
  validate(subcategoryValidation.manageAssetSchema),
  subcategoryController.manageSubcategoryAssets
);

// Upload asset images - POST (with file uploads) - must be before /:id route
router.post(
  "/:id/assets",
  verifyToken,
  uploadMiddleware,
  subcategoryController.uploadAssetImages
);

// Delete single asset image - DELETE /:id/assets/delete
// This route must be before /:id route to prevent accidental subcategory deletion
router.delete(
  "/:id/assets/delete",
  verifyToken,
  subcategoryController.deleteAssetImage
);

// Read single (must be after all specific routes)
router.get("/:id", verifyToken, subcategoryController.getSubcategoryById);

// Update
router.patch(
  "/update/:id",
  verifyToken,
  uploadMiddleware,
  validate(subcategoryValidation.updateSubcategorySchema),
  subcategoryController.updateSubcategory
);

// Delete
router.delete("/:id", verifyToken, subcategoryController.deleteSubcategory);

export default router;
