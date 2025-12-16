import mongoose from "mongoose";
import Category from "../models/category.model.js";
import categoryService from "../services/category.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";

/**
 * Get all categories for More selection (Admin)
 * Returns only active categories (status: true) sorted by moreOrder (regardless of isMore status)
 * Categories with status: false are excluded from the response
 * @route GET /api/v1/categories/more/
 * @access Private (Admin)
 */
const getAllCategoriesForMore = async (req, res) => {
  try {
    // Fetch only active categories (status: true) for More without pagination
    // Categories with status: false are excluded
    const categories = await categoryService
      .find({ isDeleted: false, status: true })
      .select({
        name: 1,
        img_sqr: 1,
        img_rec: 1,
        video_sqr: 1,
        video_rec: 1,
        status: 1,
        order: 1,
        isMore: 1,
        moreOrder: 1,
        imageCount: 1,
        isPremium: 1,
        prompt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ moreOrder: 1, createdAt: 1 }) // Primary: moreOrder (ascending), Secondary: createdAt for consistency
      .lean();

    // Add imageCount field to each category (using imageCount value)
    const categoriesWithImageCount = categories.map((category) => ({
      ...category,
      imageCount: category.imageCount || 1,
    }));

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully for More selection",
      data: categoriesWithImageCount,
      pagination: null,
    });
  } catch (error) {
    console.error("Get All Categories For More Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch categories for More",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get More categories (Client side)
 * Returns only active categories that are marked as More, sorted by moreOrder
 * @route GET /api/v1/categories/more/list
 * @access Private
 */
const getMoreCategories = async (req, res) => {
  try {
    // Find only active categories that are marked as More, sorted by moreOrder
    const moreCategories = await categoryService
      .find({
        isDeleted: false,
        status: true,
        isMore: true,
      })
      .select({
        name: 1,
        img_sqr: 1,
        img_rec: 1,
        video_sqr: 1,
        video_rec: 1,
        status: 1,
        order: 1,
        imageCount: 1,
        isPremium: 1,
        prompt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ moreOrder: 1, createdAt: 1 })
      .lean()
      .hint({ isDeleted: 1, status: 1, isMore: 1, moreOrder: 1 });

    // Transform categories to add imageCount field
    const transformedCategories = moreCategories.map((category) => ({
      ...category,
      imageCount: category.imageCount || 1,
    }));

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "More categories fetched successfully",
      data: transformedCategories,
    });
  } catch (error) {
    console.error("Get More Categories Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch More categories",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Toggle category More status (Admin) - Optimized for speed
 * Activate/deactivate category in More section
 * IMPORTANT: Order (moreOrder) is preserved when toggling status
 * This ensures categories maintain their position even when activated/deactivated
 * @route PATCH /api/v1/categories/more/toggle-more/:id
 * @access Private (Admin)
 */
const toggleCategoryMore = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMore } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format",
        data: null,
      });
    }

    const categoryId = new mongoose.Types.ObjectId(id);

    // Optimized: Get current status first
    const category = await Category.findOne(
      { _id: categoryId, isDeleted: false },
      { isMore: 1 }
    )
      .lean()
      .hint({ _id: 1, isDeleted: 1 });

    if (!category) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Category not found",
        data: null,
      });
    }

    // Toggle logic: if isMore is provided, use it; otherwise toggle current status
    const newMoreStatus = isMore !== undefined ? isMore : !category.isMore;

    // Prepare update data - only change isMore status, keep moreOrder unchanged
    // This ensures order is maintained when toggling active/inactive status
    const updateData = {
      isMore: newMoreStatus,
      updatedAt: new Date(),
    };

    // Update category in single query
    const updated = await categoryService.findByIdAndUpdate(
      categoryId,
      updateData
    );

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: newMoreStatus
        ? "More activated successfully"
        : "More deactivated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Toggle More Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to toggle category More status",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Reorder More categories (Admin)
 * Handles position conflicts by automatically shifting other categories
 * Ensures sequential ordering starting from 1 with no duplicates
 * IMPORTANT: Works for ALL categories regardless of isMore status
 * This allows reordering even if isMore is false
 * @route PATCH /api/v1/categories/more/reorder
 * @access Private (Admin)
 */
const reorderMoreCategories = async (req, res) => {
  try {
    // Validate request body exists
    if (!req.body || typeof req.body !== "object") {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Request body is required",
        data: null,
      });
    }

    const { categories } = req.body;
    const items = Array.isArray(categories) ? categories : [];

    if (!items || items.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "At least one category must be provided for reordering",
        data: null,
      });
    }

    // Validate all IDs before processing
    const invalidIds = items.filter(
      (it) => !mongoose.Types.ObjectId.isValid(it._id)
    );
    if (invalidIds.length > 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format provided",
        data: null,
      });
    }

    // Get ALL categories from database (NOT filtered by isMore or status)
    // This allows reordering ANY category regardless of isMore true/false or status true/false
    // Only filter: isDeleted: false (we don't reorder deleted categories)
    // This ensures proper order maintenance across all categories, even inactive ones
    const allCategories = await categoryService
      .find({ isDeleted: false })
      .select({ _id: 1, moreOrder: 1 })
      .sort({ moreOrder: 1, createdAt: 1 })
      .lean();

    // Create a map of category IDs to their new more orders from request
    const newMoreOrderMap = new Map();
    items.forEach((item) => {
      newMoreOrderMap.set(item._id.toString(), Number(item.moreOrder));
    });

    // Check if all categories are being reordered or just some
    const isFullReorder = allCategories.length === items.length;

    if (isFullReorder) {
      // If all categories are provided, respect their desired order values
      // Sort by the new order and assign sequential positions (1, 2, 3...)
      const sortedItems = [...items].sort(
        (a, b) => Number(a.moreOrder) - Number(b.moreOrder)
      );

      const finalOrders = new Map();
      sortedItems.forEach((item, index) => {
        finalOrders.set(item._id.toString(), index + 1);
      });

      // Build bulk operations to update all categories
      const bulkOps = Array.from(finalOrders.entries()).map(([id, order]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
          update: {
            $set: {
              moreOrder: order,
              updatedAt: new Date(),
            },
          },
        },
      }));

      const result = await categoryService.bulkWrite(bulkOps, {
        ordered: false,
      });

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: "More categories reordered successfully",
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
        },
      });
    }

    // Partial reorder - Handle order conflicts by properly shifting categories
    // Algorithm: Remove moved categories, shift others, then place moved ones at new positions

    // Separate categories into reordered and unchanged
    const reorderedCategories = [];
    const unchangedCategories = [];

    allCategories.forEach((cat) => {
      const catId = cat._id.toString();
      if (newMoreOrderMap.has(catId)) {
        reorderedCategories.push({
          _id: cat._id,
          oldMoreOrder: cat.moreOrder || 0,
          newMoreOrder: newMoreOrderMap.get(catId),
        });
      } else {
        unchangedCategories.push({
          _id: cat._id,
          moreOrder: cat.moreOrder || 0,
        });
      }
    });

    // Sort all categories by current order to build initial array
    const allCategoriesSorted = [...allCategories].sort(
      (a, b) => (a.moreOrder || 0) - (b.moreOrder || 0)
    );

    // Create a map of category IDs to their current positions (1-based)
    const currentOrderMap = new Map();
    allCategoriesSorted.forEach((cat, index) => {
      currentOrderMap.set(cat._id.toString(), index + 1);
    });

    // Build final order array by removing moved categories first, then inserting at new positions
    const finalOrderArray = [];
    const movedCategoryIds = new Set(
      reorderedCategories.map((cat) => cat._id.toString())
    );

    // Step 1: Add all unchanged categories (excluding moved ones) in their current order
    allCategoriesSorted.forEach((cat) => {
      const catId = cat._id.toString();
      if (!movedCategoryIds.has(catId)) {
        finalOrderArray.push(catId);
      }
    });

    // Step 2: Sort reordered categories by their desired new position
    reorderedCategories.sort((a, b) => a.newMoreOrder - b.newMoreOrder);

    // Step 3: Insert moved categories at their desired positions
    reorderedCategories.forEach((cat) => {
      const desiredPos = cat.newMoreOrder - 1; // Convert to 0-based index
      const catId = cat._id.toString();

      // Insert at desired position, shifting others if needed
      if (desiredPos >= 0 && desiredPos <= finalOrderArray.length) {
        finalOrderArray.splice(desiredPos, 0, catId);
      } else {
        // If position is beyond array length, append to end
        finalOrderArray.push(catId);
      }
    });

    // Step 4: Build final order map with sequential positions (1, 2, 3...)
    const finalOrders = new Map();
    finalOrderArray.forEach((id, index) => {
      finalOrders.set(id, index + 1);
    });

    // Step 5: Ensure all categories have an order (safety check)
    allCategories.forEach((cat) => {
      const catId = cat._id.toString();
      if (!finalOrders.has(catId)) {
        finalOrders.set(catId, finalOrders.size + 1);
      }
    });

    // Build bulk operations to update all categories (optimized with ordered: false)
    // IMPORTANT: Updates moreOrder for ALL categories regardless of isMore status or status (active/inactive)
    // This ensures sequential ordering (1, 2, 3...) is maintained properly across all categories
    // Only filter: isDeleted: false (we don't update deleted categories)
    const bulkOps = Array.from(finalOrders.entries()).map(([id, order]) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
        update: {
          $set: {
            moreOrder: order,
            updatedAt: new Date(),
          },
        },
      },
    }));

    // Use ordered: false for faster parallel execution
    const result = await categoryService.bulkWrite(bulkOps, {
      ordered: false,
    });

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "More categories reordered successfully",
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    });
  } catch (error) {
    console.error("Reorder More Categories Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder More categories",
      data: null,
      error: error.message,
    });
  }
};

export default {
  getAllCategoriesForMore,
  getMoreCategories,
  toggleCategoryMore,
  reorderMoreCategories,
};
