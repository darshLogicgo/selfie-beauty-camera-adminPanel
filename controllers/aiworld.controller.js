import mongoose from "mongoose";
import Category from "../models/category.model.js";
import categoryService from "../services/category.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";
import helper from "../helper/common.helper.js";

/**
 * Get all categories for AI World selection (Admin)
 * Returns all categories sorted by aiWorldOrder (regardless of isAiWorld status)
 * @route GET /api/v1/categories/ai-world/all
 * @access Private (Admin)
 */
const getAllCategoriesForAiWorld = async (req, res) => {
  try {
    // Fetch every active category for AI World without pagination
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
        isAiWorld: 1,
        aiWorldOrder: 1,
        imageCount: 1,
        isPremium: 1,
        prompt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ aiWorldOrder: 1, createdAt: 1 }) // Primary: aiWorldOrder (ascending), Secondary: createdAt for consistency
      .lean();

    // Add imageCount field to each category
    const categoriesWithImageCount = categories.map((category) => ({
      ...category,
      imageCount: category.imageCount || 1,
    }));

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully for AI World selection",
      data: categoriesWithImageCount,
      pagination: null,
    });
  } catch (error) {
    console.error("Get All Categories For AI World Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch categories for AI World",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get AI World categories (Client side)
 * Returns only active categories that are marked as AI World, sorted by aiWorldOrder
 * @route GET /api/v1/categories/ai-world/list
 * @access Public
 */
const getAiWorldCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;
    const { skip, limit: limitFromHelper } = helper.paginationFun({
      page,
      limit: limitNum,
    });

    // Parallel queries for faster response (optimized with index hints)
    const [aiWorldCategories, total] = await Promise.all([
      categoryService
        .find({
          isDeleted: false,
          status: true,
          isAiWorld: true,
        })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isAiWorld: 1,
          aiWorldOrder: 1,
          imageCount: 1,
          isPremium: 1,
          prompt: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ aiWorldOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitFromHelper)
        .lean()
        .hint({ isDeleted: 1, status: 1, isAiWorld: 1, aiWorldOrder: 1 }),
      categoryService.countDocuments({
        isDeleted: false,
        status: true,
        isAiWorld: true,
      }),
    ]);

    // Add imageCount field to each category
    const categoriesWithImageCount = aiWorldCategories.map((category) => ({
      ...category,
      imageCount: category.imageCount || 1,
    }));

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "AI World categories fetched successfully",
      data: categoriesWithImageCount,
      pagination: helper.paginationDetails({
        page,
        totalItems: total,
        limit: limitFromHelper,
      }),
    });
  } catch (error) {
    console.error("Get AI World Categories Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch AI World categories",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Toggle category AI World status (Admin) - Optimized for speed
 * Activate/deactivate category in AI World section
 * @route PATCH /api/v1/categories/:id/ai-world
 * @access Private (Admin)
 */
const toggleCategoryAiWorld = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAiWorld } = req.body || {};

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
      { isAiWorld: 1 }
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

    // Toggle logic: if isAiWorld is provided, use it; otherwise toggle current status
    const newAiWorldStatus =
      isAiWorld !== undefined ? isAiWorld : !category.isAiWorld;

    // Prepare update data - only change isAiWorld status, keep aiWorldOrder unchanged
    const updateData = {
      isAiWorld: newAiWorldStatus,
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
      message: newAiWorldStatus
        ? "AI World activated successfully"
        : "AI World deactivated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Toggle AI World Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to toggle category AI World status",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Reorder AI World categories (Admin)
 * Handles position conflicts by automatically shifting other categories
 * Ensures sequential ordering starting from 1 with no duplicates
 * IMPORTANT: Works for ALL categories regardless of isAiWorld status
 * This allows reordering even if isAiWorld is false
 * @route PATCH /api/v1/categories/ai-world/reorder
 * @access Private (Admin)
 */
const reorderAiWorldCategories = async (req, res) => {
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

    // Get ALL categories from database (NOT filtered by isAiWorld status)
    // This allows reordering ANY category regardless of isAiWorld true/false
    // Only filter: isDeleted: false (we don't reorder deleted categories)
    const allCategories = await categoryService
      .find({ isDeleted: false })
      .select({ _id: 1, aiWorldOrder: 1 })
      .sort({ aiWorldOrder: 1, createdAt: 1 })
      .lean();

    // Create a map of category IDs to their new AI World orders from request
    const newAiWorldOrderMap = new Map();
    items.forEach((item) => {
      newAiWorldOrderMap.set(item._id.toString(), Number(item.aiWorldOrder));
    });

    // Check if all categories are being reordered or just some
    const isFullReorder = allCategories.length === items.length;

    if (isFullReorder) {
      // If all categories are provided, respect their desired order values
      // Sort by the new order and assign sequential positions (1, 2, 3...)
      const sortedItems = [...items].sort(
        (a, b) => Number(a.aiWorldOrder) - Number(b.aiWorldOrder)
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
              aiWorldOrder: order,
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
        message: "AI World categories reordered successfully",
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
      if (newAiWorldOrderMap.has(catId)) {
        reorderedCategories.push({
          _id: cat._id,
          oldAiWorldOrder: cat.aiWorldOrder || 0,
          newAiWorldOrder: newAiWorldOrderMap.get(catId),
        });
      } else {
        unchangedCategories.push({
          _id: cat._id,
          aiWorldOrder: cat.aiWorldOrder || 0,
        });
      }
    });

    // Sort all categories by current order to build initial array
    const allCategoriesSorted = [...allCategories].sort(
      (a, b) => (a.aiWorldOrder || 0) - (b.aiWorldOrder || 0)
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
    reorderedCategories.sort((a, b) => a.newAiWorldOrder - b.newAiWorldOrder);

    // Step 3: Insert moved categories at their desired positions
    reorderedCategories.forEach((cat) => {
      const desiredPos = cat.newAiWorldOrder - 1; // Convert to 0-based index
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
    // IMPORTANT: Updates aiWorldOrder for ALL categories regardless of isAiWorld status
    // Only filter: isDeleted: false (we don't update deleted categories)
    const bulkOps = Array.from(finalOrders.entries()).map(([id, order]) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
        update: {
          $set: {
            aiWorldOrder: order,
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
      message: "AI World categories reordered successfully",
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    });
  } catch (error) {
    console.error("Reorder AI World Categories Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder AI World categories",
      data: null,
      error: error.message,
    });
  }
};

export default {
  getAllCategoriesForAiWorld,
  getAiWorldCategories,
  toggleCategoryAiWorld,
  reorderAiWorldCategories,
};
