import { StatusCodes } from "http-status-codes";
import mongoose from "mongoose";
import Category from "../models/category.model.js";
import UserPreference from "../models/user-preference.model.js";
import categoryService from "../services/category.service.js";
import userPreferenceService from "../services/user-preference.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import helper from "../helper/common.helper.js";

/**
 * Get ALL active categories sorted by userPreferenceOrder (Admin/Client side)
 * Returns ALL categories where status: true, sorted by userPreferenceOrder
 * Does NOT filter by isUserPreference - returns all active categories
 * @route GET /api/v1/user-preference
 * @access Private
 */
const getUserPreferenceCategories = async (req, res) => {
  try {
    // Get ALL categories where status: true, sorted by userPreferenceOrder
    const categories = await categoryService.getUserPreferenceCategories();

    // Count how many times each categoryId appears in UserPreference model
    const categoryCounts = await UserPreference.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$categoryId",
          count: { $sum: 1 },
        },
      },
    ]);

    // Create a map of categoryId to count for quick lookup
    const countMap = new Map();
    categoryCounts.forEach((item) => {
      countMap.set(item._id.toString(), item.count);
    });

    // Ensure imageCount and prompt fields exist with default values
    // Add userPreferenceCount to each category
    const categoriesWithDefaults = categories.map((category) => ({
      ...category,
      imageCount:
        category.imageCount !== undefined && category.imageCount !== null
          ? category.imageCount
          : 1,
      prompt: category.prompt !== undefined ? category.prompt : "",
      userPreferenceCount: countMap.get(category._id.toString()) || 0,
    }));

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully",
      data: categoriesWithDefaults,
    });
  } catch (error) {
    console.error("Fetch User Preference Categories Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch user preference categories",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Toggle category user preference status - Optimized with single query
 * @route PATCH /api/v1/user-preference/:id
 * @access Private (Admin)
 */
const toggleCategoryUserPreference = async (req, res) => {
  try {
    const { id } = req.params;
    const { isUserPreference } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format",
        data: null,
      });
    }

    // Optimized: Use findOneAndUpdate to get current user preference status and update in one query
    const category = await Category.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { updatedAt: new Date() } },
      { new: false, lean: true, select: "isUserPreference" }
    );

    if (!category) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Category not found",
        data: null,
      });
    }

    const newUserPreferenceStatus =
      isUserPreference !== undefined
        ? isUserPreference
        : !category.isUserPreference;

    // Update with new user preference status
    const updated = await categoryService.findByIdAndUpdate(id, {
      isUserPreference: newUserPreferenceStatus,
      updatedAt: new Date(),
    });

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: newUserPreferenceStatus
        ? "User preference activated successfully"
        : "User preference deactivated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Toggle User Preference Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to toggle category user preference status",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Set user preference for categories (Bulk operation)
 * Allows setting isUserPreference and userPreferenceOrder for multiple categories
 * @route POST /api/v1/user-preference
 * @access Private (Admin)
 */
const setUserPreference = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Categories array is required and must not be empty",
        data: null,
      });
    }

    // Validate all IDs
    const invalidIds = categories.filter(
      (item) =>
        !item._id || !mongoose.Types.ObjectId.isValid(item._id)
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

    // Build bulk operations
    const bulkOps = [];
    const now = new Date();

    categories.forEach((item) => {
      const categoryId = new mongoose.Types.ObjectId(item._id);
      const updateFields = { updatedAt: now };

      // Set isUserPreference if provided
      if (item.isUserPreference !== undefined) {
        updateFields.isUserPreference = Boolean(item.isUserPreference);
      }

      // Set userPreferenceOrder if provided
      if (item.userPreferenceOrder !== undefined) {
        updateFields.userPreferenceOrder = Math.max(0, Number(item.userPreferenceOrder));
      }

      // Only add if there are fields to update
      if (Object.keys(updateFields).length > 1) {
        bulkOps.push({
          updateOne: {
            filter: { _id: categoryId, isDeleted: false },
            update: { $set: updateFields },
          },
        });
      }
    });

    if (bulkOps.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message:
          "No valid updates provided. Please specify isUserPreference and/or userPreferenceOrder",
        data: null,
      });
    }

    // Execute bulk update
    const result = await categoryService.bulkWrite(bulkOps, {
      ordered: false,
    });

    // Fetch updated categories
    const updatedIds = categories.map(
      (item) => new mongoose.Types.ObjectId(item._id)
    );
    const updated = await categoryService
      .find({ _id: { $in: updatedIds }, isDeleted: false })
      .select({
        _id: 1,
        name: 1,
        isUserPreference: 1,
        userPreferenceOrder: 1,
        status: 1,
      })
      .lean();

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "User preferences set successfully",
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
        categories: updated,
      },
    });
  } catch (error) {
    console.error("Set User Preference Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to set user preferences",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Update user preference order for a specific category (Admin only)
 * If the target order is already taken, shifts existing categories to make room
 * @route PATCH /api/v1/user-preference/:id
 * @access Private (Admin)
 */
const updateUserPreferenceOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { userPreferenceOrder } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format",
        data: null,
      });
    }

    if (userPreferenceOrder === undefined || userPreferenceOrder === null) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "userPreferenceOrder is required",
        data: null,
      });
    }

    const orderValue = Math.max(1, Number(userPreferenceOrder)); // Minimum order is 1
    if (isNaN(orderValue)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "userPreferenceOrder must be a valid number",
        data: null,
      });
    }

    // Check if category exists
    const category = await Category.findOne({ _id: id, isDeleted: false }).lean();
    if (!category) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Category not found",
        data: null,
      });
    }

    const currentOrder = category.userPreferenceOrder || 0;
    const targetOrder = orderValue;

    // If the order is the same, no need to do anything
    if (currentOrder === targetOrder) {
      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: "User preference order is already set to this value",
        data: category,
      });
    }

    // Find if there's already a category with the target order (excluding current category)
    const existingCategoryWithOrder = await Category.findOne({
      _id: { $ne: new mongoose.Types.ObjectId(id) },
      isDeleted: false,
      status: true,
      userPreferenceOrder: targetOrder,
    }).lean();

    const bulkOps = [];

    if (existingCategoryWithOrder) {
      // Target order is taken - just shift the existing category by +1
      const newOrder = targetOrder + 1;
      
      bulkOps.push({
        updateOne: {
          filter: {
            _id: existingCategoryWithOrder._id,
            isDeleted: false,
            status: true,
          },
          update: {
            $set: {
              userPreferenceOrder: newOrder,
              updatedAt: new Date(),
            },
          },
        },
      });
    }

    // Finally, update the target category to the new order
    bulkOps.push({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false, status: true },
        update: {
          $set: {
            userPreferenceOrder: targetOrder,
            updatedAt: new Date(),
          },
        },
      },
    });

    // Execute all operations
    if (bulkOps.length > 0) {
      await categoryService.bulkWrite(bulkOps, { ordered: false });
    }

    // Get the updated category
    const updated = await categoryService.findById(id, false);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "User preference order updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update User Preference Order Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to update user preference order",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get categories for users sorted by userPreferenceOrder (User-facing API)
 * Returns ONLY categories where isUserPreference: true and status: true, sorted by userPreferenceOrder
 * Returns: _id, name, img_sqr, img_rec, video_sqr, video_rec, status, isPremium, prompt
 * @route GET /api/v1/user-preference/list
 * @access Private (Authenticated User - token required)
 */
const getUserCategoriesByPreference = async (req, res) => {
  try {
    
    // Get all active categories sorted by userPreferenceOrder
    const categories = await categoryService.getUserCategoriesByPreference();

    // Return only the specified fields - explicitly include isPremium and prompt
    const mappedCategories = categories.map((category) => {
      const result = {
        _id: category._id,
        name: category.name,
        img_sqr: category.img_sqr,
        img_rec: category.img_rec,
        video_sqr: category.video_sqr,
        video_rec: category.video_rec,
        status: category.status,
        isPremium: category.isPremium !== undefined && category.isPremium !== null ? Boolean(category.isPremium) : false,
        prompt: category.prompt !== undefined && category.prompt !== null ? String(category.prompt) : "",
        android_appVersion: category.android_appVersion || null,
        ios_appVersion: category.ios_appVersion || null,
      };
      return result;
    });

    // Filter categories by user's appVersion
    // Logic: If user doesn't have appVersion → show only categories without platform appVersion
    // If user has appVersion → show only if userVersion >= categoryVersion
    const user = req.user || null;
    const filteredCategories = helper.filterCategoriesByAppVersion(
      user,
      mappedCategories
    );

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully",
      data: filteredCategories,
    });
  } catch (error) {
    console.error("Fetch User Categories By Preference Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch categories",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Add/Update user preference (User-facing API)
 * If user already has a preference, it updates the categoryId
 * If user has no preference, it creates a new one
 * Each user can have only ONE preference at a time
 * @route POST /api/v1/user-preference
 * @access Private (Authenticated User)
 */
const addUserPreference = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { categoryId } = req.body;

    if (!userId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.UNAUTHORIZED,
        status: false,
        message: "User not authenticated",
        data: null,
      });
    }

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Valid category ID is required",
        data: null,
      });
    }

    // Check if category exists
    const category = await categoryService.findById(categoryId, true);
    if (!category || category.isDeleted || !category.status) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Category not found or inactive",
        data: null,
      });
    }

    // Check if user already has a preference (any category)
    const existingPreference = await userPreferenceService.findOne({
      userId,
      isDeleted: false,
    });

    if (existingPreference) {
      // Check if it's the same category
      if (existingPreference.categoryId.toString() === categoryId) {
        return apiResponse({
          res,
          statusCode: StatusCodes.OK,
          status: true,
          message: "Category already set as preference",
          data: existingPreference,
        });
      }

      // Update existing preference with new categoryId
      const updated = await userPreferenceService.findByIdAndUpdate(
        existingPreference._id,
        {
          categoryId: new mongoose.Types.ObjectId(categoryId),
          updatedAt: new Date(),
        }
      );

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: "User preference updated successfully",
        data: updated,
      });
    }

    // Create new preference if user doesn't have one
    const preference = await userPreferenceService.create({
      userId,
      categoryId,
    });

    return apiResponse({
      res,
      statusCode: StatusCodes.CREATED,
      status: true,
      message: "User preference added successfully",
      data: preference,
    });
  } catch (error) {
    console.error("Add User Preference Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to add user preference",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get user preferences (User-facing API)
 * Returns all categories that the user has selected as preferences
 * @route GET /api/v1/user-preference
 * @access Private (Authenticated User)
 */
const getUserPreferences = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.UNAUTHORIZED,
        status: false,
        message: "User not authenticated",
        data: null,
      });
    }

    const preferences = await userPreferenceService.getUserPreferences(userId);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "User preferences fetched successfully",
      data: preferences,
    });
  } catch (error) {
    console.error("Get User Preferences Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch user preferences",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Reorder categories by userPreferenceOrder (Admin API)
 * Updates userPreferenceOrder field in categories
 * Automatically handles conflicts: if order is taken, shifts existing categories
 * Example: If setting category to order 4, and order 4 is already taken, 
 *          the existing category with order 4 will be shifted to 5
 * @route PATCH /api/v1/user-preference/reorder
 * @access Private (Admin)
 */
const reorderUserPreferenceCategories = async (req, res) => {
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
      (it) => !it._id || !mongoose.Types.ObjectId.isValid(it._id)
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

    // Get all existing categories from database
    const allCategories = await categoryService
      .find({ isDeleted: false, status: true })
      .select({ _id: 1, userPreferenceOrder: 1 })
      .sort({ userPreferenceOrder: 1, createdAt: 1 })
      .lean();

    // Create a map of category IDs to their desired new orders
    const desiredOrderMap = new Map();
    const categoryIdsBeingUpdated = new Set();
    const orderUsageCount = new Map(); // Track how many items want each order
    
    items.forEach((item) => {
      const orderValue = Math.max(1, Number(item.userPreferenceOrder) || 1);
      const categoryId = item._id.toString();
      desiredOrderMap.set(categoryId, orderValue);
      categoryIdsBeingUpdated.add(categoryId);
      
      // Track order usage
      orderUsageCount.set(orderValue, (orderUsageCount.get(orderValue) || 0) + 1);
    });

    // Check if multiple items want the same order
    const duplicateOrders = Array.from(orderUsageCount.entries())
      .filter(([order, count]) => count > 1)
      .map(([order]) => order);
    
    if (duplicateOrders.length > 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: `Multiple categories cannot have the same userPreferenceOrder. Duplicate orders found: ${duplicateOrders.join(", ")}`,
        data: null,
      });
    }

    // Get current orders for all categories
    const currentOrders = new Map();
    allCategories.forEach((cat) => {
      currentOrders.set(cat._id.toString(), cat.userPreferenceOrder || 0);
    });

    // Build final orders using the same robust algorithm as trending reorder
    const isFullReorder = allCategories.length === items.length;
    const finalOrders = new Map();
    const now = new Date();

    if (isFullReorder) {
      // If all categories provided, sort by requested order and assign sequential positions
      const sortedItems = [...items].sort(
        (a, b) => Number(a.userPreferenceOrder) - Number(b.userPreferenceOrder)
      );

      sortedItems.forEach((item, index) => {
        finalOrders.set(item._id.toString(), index + 1);
      });

      // Safety: ensure all categories are present
      allCategories.forEach((cat) => {
        if (!finalOrders.has(cat._id.toString())) {
          finalOrders.set(cat._id.toString(), finalOrders.size + 1);
        }
      });
    } else {
      // Partial reorder: remove moved categories then insert them at requested positions
      const reorderedCategories = [];
      const movedCategoryIds = new Set();

      items.forEach((item) => {
        const idStr = item._id.toString();
        const newOrder = Math.max(1, Number(item.userPreferenceOrder) || 1);
        reorderedCategories.push({
          _id: new mongoose.Types.ObjectId(idStr),
          oldUserPreferenceOrder: currentOrders.get(idStr) || 0,
          newUserPreferenceOrder: newOrder,
        });
        movedCategoryIds.add(idStr);
      });

      // Sort all categories by current order to build initial array
      const allCategoriesSorted = [...allCategories].sort(
        (a, b) => (a.userPreferenceOrder || 0) - (b.userPreferenceOrder || 0)
      );

      // Add unchanged categories in their current order
      const finalOrderArray = [];
      allCategoriesSorted.forEach((cat) => {
        const catId = cat._id.toString();
        if (!movedCategoryIds.has(catId)) {
          finalOrderArray.push(catId);
        }
      });

      // Sort moved categories by desired new position and insert
      reorderedCategories.sort((a, b) => a.newUserPreferenceOrder - b.newUserPreferenceOrder);

      reorderedCategories.forEach((cat) => {
        const desiredPos = cat.newUserPreferenceOrder - 1; // 0-based index
        const catId = cat._id.toString();

        if (desiredPos >= 0 && desiredPos <= finalOrderArray.length) {
          finalOrderArray.splice(desiredPos, 0, catId);
        } else {
          // Append if beyond length
          finalOrderArray.push(catId);
        }
      });

      // Assign sequential orders starting from 1
      finalOrderArray.forEach((id, index) => {
        finalOrders.set(id, index + 1);
      });

      // Ensure all categories are included (safety)
      allCategories.forEach((cat) => {
        const idStr = cat._id.toString();
        if (!finalOrders.has(idStr)) {
          finalOrders.set(idStr, finalOrders.size + 1);
        }
      });
    }

    // Build bulk operations only for categories whose order changed
    const bulkOps = [];
    finalOrders.forEach((order, idStr) => {
      const current = currentOrders.get(idStr) || 0;
      if (current !== order) {
        bulkOps.push({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(idStr), isDeleted: false, status: true },
            update: { $set: { userPreferenceOrder: order, updatedAt: now } },
          },
        });
      }
    });

    // Execute all operations
    if (bulkOps.length > 0) {
      const result = await categoryService.bulkWrite(bulkOps, { ordered: false });

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: "Categories reordered by user preference successfully",
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
        },
      });
    } else {
      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: "No changes needed",
        data: {
          modifiedCount: 0,
          matchedCount: 0,
        },
      });
    }
  } catch (error) {
    console.error("Reorder User Preference Categories Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder categories by user preference",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Remove category from user preferences (User-facing API)
 * @route DELETE /api/v1/user-preference/:categoryId
 * @access Private (Authenticated User)
 */
const removeUserPreference = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { categoryId } = req.params;

    if (!userId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.UNAUTHORIZED,
        status: false,
        message: "User not authenticated",
        data: null,
      });
    }

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Valid category ID is required",
        data: null,
      });
    }

    const preference = await userPreferenceService.findOneAndUpdate(
      { userId, categoryId, isDeleted: false },
      { isDeleted: true, updatedAt: new Date() }
    );

    if (!preference) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "User preference not found",
        data: null,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "User preference removed successfully",
      data: null,
    });
  } catch (error) {
    console.error("Remove User Preference Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to remove user preference",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Reorder a single category with proper shifting logic (Admin only)
 * Uses MongoDB transactions to ensure data consistency
 * Only affects categories with isUserPreference = true
 * 
 * @route PATCH /api/v1/user-preference/reorder/:categoryId
 * @access Private (Admin)
 */
const reorderCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { newOrder } = req.body;

    // Validate categoryId
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format",
        data: null,
      });
    }

    // Validate newOrder
    if (newOrder === undefined || newOrder === null) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "newOrder is required",
        data: null,
      });
    }

    const orderValue = Number(newOrder);
    if (!Number.isInteger(orderValue) || orderValue < 1) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "newOrder must be an integer >= 1",
        data: null,
      });
    }

    // Call service to reorder category
    const updatedCategory = await categoryService.reorderCategory(
      categoryId,
      orderValue
    );

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Category reordered successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Reorder Category Error:", error);

    // Handle specific error messages
    if (error.message === "Category not found") {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: error.message,
        data: null,
      });
    }

    if (
      error.message === "Invalid category ID format" ||
      error.message === "New order must be an integer >= 1" ||
      error.message.includes("exceeds maximum order") ||
      error.message === "Category must have isUserPreference = true to be reordered"
    ) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: error.message,
        data: null,
      });
    }

    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder category",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Reorder user preferences (User-facing API)
 * Updates order field in UserPreference model for the logged-in user
 * Ensures sequential ordering (1, 2, 3...) with no duplicates
 * Only updates preferences belonging to the authenticated user
 * @route PUT /api/v1/user-preference/reorder
 * @access Private (Authenticated User)
 */
const reorderUserPreferences = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    // Validate user authentication
    if (!userId) {
      return apiResponse({
        res,
        statusCode: StatusCodes.UNAUTHORIZED,
        status: false,
        message: "User not authenticated",
        data: null,
      });
    }

    // Validate request body
    if (!req.body || typeof req.body !== "object") {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Request body is required",
        data: null,
      });
    }

    const { preferences } = req.body;
    const items = Array.isArray(preferences) ? preferences : [];

    if (!items || items.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "At least one preference must be provided for reordering",
        data: null,
      });
    }

    // Validate all IDs before processing
    const invalidIds = items.filter(
      (item) => !item._id || !mongoose.Types.ObjectId.isValid(item._id)
    );
    if (invalidIds.length > 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid preference ID format provided",
        data: null,
      });
    }

    // Validate all order values
    const invalidOrders = items.filter(
      (item) =>
        item.order === undefined ||
        item.order === null ||
        !Number.isInteger(Number(item.order)) ||
        Number(item.order) < 0
    );
    if (invalidOrders.length > 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "All preferences must have a valid order value (integer >= 0)",
        data: null,
      });
    }

    // Get all existing user preferences from database
    const userPreferences = await userPreferenceService.find(
      {
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: false,
      },
      { _id: 1, order: 1 },
      { lean: true }
    );

    // Create a map of existing preference IDs for quick lookup
    const existingPreferenceMap = new Map();
    userPreferences.forEach((pref) => {
      existingPreferenceMap.set(pref._id.toString(), pref);
    });

    // Extract preference IDs from request
    const requestedPreferenceIds = new Set(
      items.map((item) => item._id.toString())
    );

    // Filter out preferences that don't belong to the user or don't exist
    const validItems = items.filter((item) => {
      const prefId = item._id.toString();
      return existingPreferenceMap.has(prefId);
    });

    // Log skipped items for debugging
    const skippedIds = items
      .map((item) => item._id.toString())
      .filter((id) => !existingPreferenceMap.has(id));
    if (skippedIds.length > 0) {
      console.log(
        `[Reorder] Skipped ${skippedIds.length} preference IDs not belonging to user ${userId}:`,
        skippedIds
      );
    }

    if (validItems.length === 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "No valid preferences found for reordering",
        data: null,
      });
    }

    // Check for duplicate order values in the request
    const orderMap = new Map();
    const duplicateOrders = [];
    validItems.forEach((item) => {
      const order = Number(item.order);
      if (orderMap.has(order)) {
        duplicateOrders.push(order);
      } else {
        orderMap.set(order, item._id);
      }
    });

    if (duplicateOrders.length > 0) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: `Duplicate order values found: ${duplicateOrders.join(", ")}. Each preference must have a unique order.`,
        data: null,
      });
    }

    // Normalize orders to be sequential starting from 1
    // Sort items by their requested order
    const sortedItems = [...validItems].sort(
      (a, b) => Number(a.order) - Number(b.order)
    );

    // Assign sequential orders (1, 2, 3...)
    const bulkOps = [];
    const now = new Date();

    sortedItems.forEach((item, index) => {
      const preferenceId = new mongoose.Types.ObjectId(item._id);
      const newOrder = index + 1; // Sequential: 1, 2, 3...

      // Only update if order has changed
      const existingPreference = existingPreferenceMap.get(item._id.toString());
      if (existingPreference && existingPreference.order !== newOrder) {
        bulkOps.push({
          updateOne: {
            filter: {
              _id: preferenceId,
              userId: new mongoose.Types.ObjectId(userId),
              isDeleted: false,
            },
            update: {
              $set: {
                order: newOrder,
                updatedAt: now,
              },
            },
          },
        });
      }
    });

    // Execute bulk update
    if (bulkOps.length > 0) {
      console.log(
        `[Reorder] Updating ${bulkOps.length} preferences for user ${userId}`
      );

      const result = await userPreferenceService.bulkWrite(bulkOps, {
        ordered: false,
      });

      // Verify no duplicates exist after update
      const updatedPreferences = await userPreferenceService.find(
        {
          userId: new mongoose.Types.ObjectId(userId),
          isDeleted: false,
        },
        { _id: 1, order: 1 },
        { lean: true, sort: { order: 1 } }
      );

      // Check for duplicates
      const orderSet = new Set();
      const duplicates = [];
      updatedPreferences.forEach((pref) => {
        if (orderSet.has(pref.order)) {
          duplicates.push(pref.order);
        } else {
          orderSet.add(pref.order);
        }
      });

      if (duplicates.length > 0) {
        console.error(
          `[Reorder] WARNING: Duplicate orders detected after update:`,
          duplicates
        );
        // This shouldn't happen, but log it for debugging
      }

      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: "User preferences reordered successfully",
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
          totalPreferences: updatedPreferences.length,
        },
      });
    } else {
      // No changes needed - orders are already correct
      return apiResponse({
        res,
        statusCode: StatusCodes.OK,
        status: true,
        message: "No changes needed - preferences are already in correct order",
        data: {
          modifiedCount: 0,
          matchedCount: 0,
          totalPreferences: userPreferences.length,
        },
      });
    }
  } catch (error) {
    console.error("Reorder User Preferences Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder user preferences",
      data: null,
      error: error.message,
    });
  }
};

export default {
  getUserPreferenceCategories,
  toggleCategoryUserPreference,
  setUserPreference,
  updateUserPreferenceOrder,
  getUserCategoriesByPreference,
  addUserPreference,
  getUserPreferences,
  removeUserPreference,
  reorderUserPreferenceCategories,
  reorderCategory,
  reorderUserPreferences,
};

