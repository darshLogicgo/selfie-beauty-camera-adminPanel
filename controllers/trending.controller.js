import mongoose from "mongoose";
import Category from "../models/category.model.js";
import Subcategory from "../models/subcategory.js";
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
    // Fetch every active category for Trending without pagination
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
        isTrending: 1,
        trendingOrder: 1,
        imageCount: 1,
        isPremium: 1,
        prompt: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .sort({ trendingOrder: 1, createdAt: 1 }) // Primary: trendingOrder (ascending), Secondary: createdAt for consistency
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
      message: "Categories fetched successfully for trending selection",
      data: categoriesWithImageCount,
      pagination: null,
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
    // Find "AI Face Swap" category
    const aiFaceSwapCategory = await Category.findOne({
      name: { $regex: /AI Face Swap/i },
      isDeleted: false,
    })
      .select({ _id: 1 })
      .lean();

    const aiFaceSwapCategoryId = aiFaceSwapCategory?._id;

    // Parallel queries for all sections
    const [
      first6TrendingCategories,
      aiFaceSwapSubcategories,
      next7TrendingCategories,
    ] = await Promise.all([
      // Section 1: First 6 trending categories
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
          imageCount: 1,
          isPremium: 1,
          prompt: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ trendingOrder: 1, createdAt: 1 })
        .limit(6)
        .lean()
        .hint({ isDeleted: 1, status: 1, isTrending: 1, trendingOrder: 1 }),

      // Section 2: First 5 subcategories from "AI Face Swap" category
      aiFaceSwapCategoryId
        ? Subcategory.find({
            categoryId: aiFaceSwapCategoryId,
            status: true,
          })
            .select({
              categoryId: 1,
              subcategoryTitle: 1,
              img_sqr: 1,
              img_rec: 1,
              video_sqr: 1,
              video_rec: 1,
              status: 1,
              order: 1,
              asset_images: 1,
              imageCount: 1,
              isPremium: 1,
              createdAt: 1,
              updatedAt: 1,
            })
            .sort({ order: 1, createdAt: 1 })
            .limit(5)
            .lean()
        : Promise.resolve([]),

      // Section 3: Next 7 trending categories (skip first 6)
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
          imageCount: 1,
          isPremium: 1,
          prompt: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ trendingOrder: 1, createdAt: 1 })
        .skip(6)
        .limit(7)
        .lean()
        .hint({ isDeleted: 1, status: 1, isTrending: 1, trendingOrder: 1 }),
    ]);

    // Transform categories to add imageCount field
    const transformedFirst6Categories = first6TrendingCategories.map(
      (category) => ({
        ...category,
        imageCount: category.imageCount || 1,
      })
    );

    const transformedNext7Categories = next7TrendingCategories.map(
      (category) => ({
        ...category,
        imageCount: category.imageCount || 1,
      })
    );

    // Transform subcategories to normalize asset_images to new structure and add imageCount
    const transformedSubcategories = aiFaceSwapSubcategories.map(
      (subcategory) => {
        const assetImages = subcategory.asset_images || [];
        // Normalize to new structure (handle legacy string format)
        const normalizedAssets = assetImages
          .map((asset) => {
            if (typeof asset === "string") {
              // Legacy format: convert string URL to object
              return {
                _id: new mongoose.Types.ObjectId(),
                url: asset,
                isPremium: false,
                imageCount: 1,
              };
            }
            // Already an object, ensure all fields are present
            return {
              _id: asset._id || new mongoose.Types.ObjectId(),
              url: asset.url || "",
              isPremium:
                asset.isPremium !== undefined ? asset.isPremium : false,
              imageCount: asset.imageCount !== undefined ? asset.imageCount : 1,
            };
          })
          .filter((asset) => asset.url && asset.url.trim() !== "");

        return {
          ...subcategory,
          asset_images: normalizedAssets, // New structure with objects
          imageCount:
            subcategory.imageCount !== undefined &&
            subcategory.imageCount !== null
              ? subcategory.imageCount
              : 1,
          isPremium:
            subcategory.isPremium !== undefined ? subcategory.isPremium : false,
        };
      }
    );

    // Build response with 3 sections
    const responseData = {
      section1: {
        title: "slider",
        categories: transformedFirst6Categories,
      },
      section2: {
        title: "AI Face Swap",
        subcategories: transformedSubcategories,
      },
      section3: {
        title: "Enhancer Tools",
        categories: transformedNext7Categories,
      },
    };

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Trending data fetched successfully",
      data: responseData,
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
 * IMPORTANT: Works for ALL categories regardless of isTrending status
 * This allows reordering even if isTrending is false
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

    // Get ALL categories from database (NOT filtered by isTrending status)
    // This allows reordering ANY category regardless of isTrending true/false
    // Only filter: isDeleted: false (we don't reorder deleted categories)
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

    // Check if all categories are being reordered or just some
    const isFullReorder = allCategories.length === items.length;

    if (isFullReorder) {
      // If all categories are provided, respect their desired order values
      // Sort by the new order and assign sequential positions (1, 2, 3...)
      const sortedItems = [...items].sort(
        (a, b) => Number(a.trendingOrder) - Number(b.trendingOrder)
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
              trendingOrder: order,
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
        message: "Trending categories reordered successfully",
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
      if (newTrendingOrderMap.has(catId)) {
        reorderedCategories.push({
          _id: cat._id,
          oldTrendingOrder: cat.trendingOrder || 0,
          newTrendingOrder: newTrendingOrderMap.get(catId),
        });
      } else {
        unchangedCategories.push({
          _id: cat._id,
          trendingOrder: cat.trendingOrder || 0,
        });
      }
    });

    // Sort all categories by current order to build initial array
    const allCategoriesSorted = [...allCategories].sort(
      (a, b) => (a.trendingOrder || 0) - (b.trendingOrder || 0)
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
    reorderedCategories.sort((a, b) => a.newTrendingOrder - b.newTrendingOrder);

    // Step 3: Insert moved categories at their desired positions
    reorderedCategories.forEach((cat) => {
      const desiredPos = cat.newTrendingOrder - 1; // Convert to 0-based index
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
    // IMPORTANT: Updates trendingOrder for ALL categories regardless of isTrending status
    // Only filter: isDeleted: false (we don't update deleted categories)
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
