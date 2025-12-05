import express from "express";
import { verifyToken } from "../middleware/verify-token.middleware.js";
import validate from "../middleware/validate.middleware.js";
import uploadMiddleware from "../middleware/upload.middleware.js"; // adjust path if different
import subcategoryController from "../controllers/subcategory.controller.js";
import subcategoryValidation from "../validations/subcategory.validation.js";

const router = express.Router();

// Create
router.post(
  "/",
  verifyToken,
  uploadMiddleware, 
  validate(subcategoryValidation.createSubcategorySchema),
  subcategoryController.createSubcategory
);

// Read all
router.get("/", subcategoryController.getAllSubcategories);

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
  validate(subcategoryValidation.toggleStatusSchema),
  subcategoryController.toggleStatus
);

// Manage asset images - PATCH (add or remove URLs) - must be before /:id route
router.patch(
  "/:id/assets",
  verifyToken,
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
router.get("/:id", subcategoryController.getSubcategoryById);

// Update
router.put(
  "/:id",
  verifyToken,
  uploadMiddleware,
  validate(subcategoryValidation.updateSubcategorySchema),
  subcategoryController.updateSubcategory
);

// Delete
router.delete("/:id", verifyToken, subcategoryController.deleteSubcategory);

export default router;
