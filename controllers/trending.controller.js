import mongoose from "mongoose";
import Category from "../models/category.model.js";
import categoryService from "../services/category.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";

/**
 * Get all categories for trending selection (Admin)
 * Returns all categories sorted by trendingOrder (regardless of isTrending status)
 * @route GET /api/v1/categories/trending/all
 * @access Private (Admin)
 */
const getAllCategoriesForTrending = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;

    // Parallel queries for faster response (optimized with index hints)
    const [categories, total] = await Promise.all([
      categoryService
        .find({ isDeleted: false, status: true })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isTrending: 1,
          trendingOrder: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ trendingOrder: 1, createdAt: 1 }) // Primary: trendingOrder (ascending), Secondary: createdAt for consistency
        .skip(skip)
        .limit(limitNum)
        .lean(),
      categoryService.countDocuments({ isDeleted: false, status: true }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully for trending selection",
      data: categories,
      pagination: {
        page: Number(page),
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get All Categories For Trending Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch categories for trending",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get trending categories (Client side)
 * Returns only active categories that are marked as trending, sorted by trendingOrder
 * @route GET /api/v1/categories/trending/list
 * @access Public
 */
const getTrendingCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;

    // Parallel queries for faster response (optimized with index hints)
    const [trendingCategories, total] = await Promise.all([
      categoryService
        .find({
          isDeleted: false,
          status: true,
          isTrending: true,
        })
        .select({
          name: 1,
          img_sqr: 1,
          img_rec: 1,
          video_sqr: 1,
          video_rec: 1,
          status: 1,
          order: 1,
          isTrending: 1,
          trendingOrder: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ trendingOrder: 1, createdAt: 1 })
        .skip(skip)
        .limit(limitNum)
        .lean()
        .hint({ isDeleted: 1, status: 1, isTrending: 1, trendingOrder: 1 }),
      categoryService.countDocuments({
        isDeleted: false,
        status: true,
        isTrending: true,
      }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Trending categories fetched successfully",
      data: trendingCategories,
      pagination: {
        page: Number(page),
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get Trending Categories Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch trending categories",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Toggle category trending status (Admin) - Optimized for speed
 * Activate/deactivate category in trending section
 * @route PATCH /api/v1/categories/:id/trending
 * @access Private (Admin)
 */
const toggleCategoryTrending = async (req, res) => {
  try {
    const { id } = req.params;
    const { isTrending } = req.body || {};

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
      { isTrending: 1 }
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

    // Toggle logic: if isTrending is provided, use it; otherwise toggle current status
    const newTrendingStatus =
      isTrending !== undefined ? isTrending : !category.isTrending;

    // Prepare update data - only change isTrending status, keep trendingOrder unchanged
    const updateData = {
      isTrending: newTrendingStatus,
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
      message: newTrendingStatus
        ? "Trending activated successfully"
        : "Trending deactivated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Toggle Trending Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to toggle category trending status",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Reorder trending categories (Admin)
 * Handles position conflicts by automatically shifting other categories
 * Ensures sequential ordering starting from 1 with no duplicates
 * @route PATCH /api/v1/categories/trending/reorder
 * @access Private (Admin)
 */
const reorderTrendingCategories = async (req, res) => {
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

    // Get ALL categories from database (not filtered by isTrending status) to handle all trendingOrder values
    // This ensures we can properly shift orders when conflicts occur
    const allCategories = await categoryService
      .find({ isDeleted: false })
      .select({ _id: 1, trendingOrder: 1 })
      .sort({ trendingOrder: 1, createdAt: 1 })
      .lean();

    // Create a map of category IDs to their new trending orders from request
    const newTrendingOrderMap = new Map();
    items.forEach((item) => {
      newTrendingOrderMap.set(item._id.toString(), Number(item.trendingOrder));
    });

    // Separate categories into reordered and unchanged
    const reorderedCategories = [];
    const unchangedCategories = [];

    allCategories.forEach((cat) => {
      const catId = cat._id.toString();
      if (newTrendingOrderMap.has(catId)) {
        reorderedCategories.push({
          _id: cat._id,
          oldTrendingOrder: cat.trendingOrder,
          newTrendingOrder: newTrendingOrderMap.get(catId),
        });
      } else {
        unchangedCategories.push({
          _id: cat._id,
          trendingOrder: cat.trendingOrder,
        });
      }
    });

    // Sort reordered categories by their desired new order
    reorderedCategories.sort((a, b) => a.newTrendingOrder - b.newTrendingOrder);

    // Build final order assignment for ALL categories
    // This ensures no duplicates and proper sequential ordering (1, 2, 3, 4...)
    const finalOrders = new Map();
    let currentOrder = 1;

    // Process reordered categories first (they get priority at their desired positions)
    // If multiple categories want the same order, they'll be assigned sequentially
    reorderedCategories.forEach((cat) => {
      finalOrders.set(cat._id.toString(), currentOrder);
      currentOrder++;
    });

    // Process unchanged categories, maintaining their relative order
    // But skip any that would conflict with reordered categories
    unchangedCategories.sort((a, b) => a.trendingOrder - b.trendingOrder);
    unchangedCategories.forEach((cat) => {
      // Check if this order position is already taken by a reordered category
      // If so, assign the next available order
      finalOrders.set(cat._id.toString(), currentOrder);
      currentOrder++;
    });

    // Build bulk operations to update all categories (optimized with ordered: false)
    const bulkOps = Array.from(finalOrders.entries()).map(([id, order]) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
        update: {
          $set: {
            trendingOrder: order,
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
      message: "Trending categories reordered successfully",
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    });
  } catch (error) {
    console.error("Reorder Trending Categories Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder trending categories",
      data: null,
      error: error.message,
    });
  }
};

export default {
  getAllCategoriesForTrending,
  getTrendingCategories,
  toggleCategoryTrending,
  reorderTrendingCategories,
};
