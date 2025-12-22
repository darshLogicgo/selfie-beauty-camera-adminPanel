import mongoose from "mongoose";
import Category from "../models/category.model.js";
import helper from "../helper/common.helper.js";

/**
 * Find categories with filters, projection, and options
 * @param {Object} filter - MongoDB filter
 * @param {Object} projection - Field projection
 * @param {Object} options - Query options
 * @returns {Object} - Query object for chaining
 */
const find = (filter = {}, projection = null, options = {}) => {
  return Category.find(filter, projection, options);
};

/**
 * Find single category
 * @param {Object} filter - MongoDB filter
 * @param {Boolean} lean - Return lean document
 * @returns {Promise<Object>} - Category document
 */
const findOne = async (filter = {}, lean = false) => {
  const q = Category.findOne(filter);
  return lean ? q.lean() : q;
};

/**
 * Find category by ID (optimized with lean)
 * @param {string} id - Category ID
 * @param {Boolean} lean - Return lean document (faster)
 * @returns {Promise<Object>} - Category document
 */
const findById = async (id, lean = true) => {
  const q = Category.findById(id);
  return lean ? q.lean() : q;
};

/**
 * Create new category
 * @param {Object} data - Category data
 * @returns {Promise<Object>} - Created category
 */
const create = async (data) => {
  return Category.create(data);
};

/**
 * Update category by ID (optimized with lean)
 * @param {string} id - Category ID
 * @param {Object} data - Update data
 * @param {Object} options - Mongoose options
 * @returns {Promise<Object>} - Updated category
 */
const findByIdAndUpdate = async (
  id,
  data,
  options = { new: true, lean: true }
) => {
  return Category.findByIdAndUpdate(id, { $set: data }, options);
};

/**
 * Delete category by ID
 * @param {string} id - Category ID
 * @returns {Promise<Object>} - Deleted category
 */
const findByIdAndDelete = async (id) => {
  return Category.findByIdAndDelete(id);
};

/**
 * Perform bulk write operations (optimized)
 * @param {Array} ops - Bulk operations
 * @param {Object} options - Bulk write options (ordered: false for parallel execution)
 * @returns {Promise<Object>} - Bulk write result
 */
const bulkWrite = async (ops, options = { ordered: false }) => {
  return Category.bulkWrite(ops, options);
};

/**
 * Count documents matching filter
 * @param {Object} filter - MongoDB filter
 * @returns {Promise<number>} - Document count
 */
const countDocuments = async (filter = {}) => {
  return Category.countDocuments(filter);
};

/**
 * Find categories by status (optimized with lean)
 * @param {Boolean} status - Active/Inactive status
 * @param {Object} projection - Field projection
 * @returns {Promise<Array>} - Categories array
 */
const findByStatus = async (status = true, projection = null) => {
  return Category.find({ status, isDeleted: false }, projection)
    .sort({ order: 1, updatedAt: -1 })
    .lean();
};

/**
 * Get paginated categories
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - Paginated result
 */
const getPaginated = async (page = 1, limit = 10) => {
  const { skip, limit: limitFromHelper } = helper.paginationFun({
    page,
    limit,
  });
  const [data, total] = await Promise.all([
    Category.find({ isDeleted: false })
      .sort({ order: 1, updatedAt: -1 })
      .skip(skip)
      .limit(limitFromHelper)
      .lean(),
    Category.countDocuments({ isDeleted: false }),
  ]);

  return {
    data,
    pagination: helper.paginationDetails({
      page,
      totalItems: total,
      limit: limitFromHelper,
    }),
  };
};

/**
 * Get active categories only (optimized with lean and select)
 * @returns {Promise<Array>} - Active categories
 */
const getActive = async () => {
  return Category.find({ status: true, isDeleted: false })
    .select({
      name: 1,
      img_sqr: 1,
      img_rec: 1,
      video_sqr: 1,
      video_rec: 1,
      status: 1,
      order: 1,
    })
    .sort({ order: 1, updatedAt: -1 })
    .lean();
};

/**
 * Get maximum order number from existing categories (optimized)
 * @param {Object} filter - Optional filter (default: isDeleted: false)
 * @returns {Promise<number>} - Maximum order number (default: -1 if no categories)
 */
const getMaxOrder = async (filter = { isDeleted: false }) => {
  const result = await Category.findOne(filter)
    .sort({ order: -1 })
    .select({ order: 1 })
    .lean()
    .limit(1)
    .hint({ isDeleted: 1, order: -1 }); // Use index hint for faster query
  return result?.order ?? -1;
};

/**
 * Get maximum trending order number from existing categories (optimized)
 * @param {Object} filter - Optional filter (default: isDeleted: false, isTrending: true)
 * @returns {Promise<number>} - Maximum trending order number (default: -1 if no categories)
 */
const getMaxTrendingOrder = async (
  filter = { isDeleted: false, isTrending: true }
) => {
  // Query to get max trendingOrder - MongoDB will automatically use the best index
  // Use appropriate index hint based on filter
  const query = Category.findOne(filter)
    .sort({ trendingOrder: -1 })
    .select({ trendingOrder: 1 })
    .lean()
    .limit(1);

  // Use index hint based on whether isTrending is in filter
  if (filter.isTrending !== undefined) {
    query.hint({ isDeleted: 1, isTrending: 1, trendingOrder: -1 });
  } else {
    query.hint({ isDeleted: 1, trendingOrder: -1 });
  }

  const result = await query;
  return result?.trendingOrder ?? -1;
};

/**
 * Get trending categories (for client side) - only active and trending
 * @returns {Promise<Array>} - Trending categories sorted by trendingOrder
 */
const getTrendingCategories = async () => {
  return Category.find({
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
    .lean()
    .hint({ isDeleted: 1, status: 1, isTrending: 1, trendingOrder: 1 });
};

/**
 * Get maximum AI World order number from existing categories (optimized)
 * @param {Object} filter - Optional filter (default: isDeleted: false, isAiWorld: true)
 * @returns {Promise<number>} - Maximum AI World order number (default: -1 if no categories)
 */
const getMaxAiWorldOrder = async (
  filter = { isDeleted: false, isAiWorld: true }
) => {
  // Query to get max aiWorldOrder - MongoDB will automatically use the best index
  // Use appropriate index hint based on filter
  const query = Category.findOne(filter)
    .sort({ aiWorldOrder: -1 })
    .select({ aiWorldOrder: 1 })
    .lean()
    .limit(1);

  // Use index hint based on whether isAiWorld is in filter
  if (filter.isAiWorld !== undefined) {
    query.hint({ isDeleted: 1, isAiWorld: 1, aiWorldOrder: -1 });
  } else {
    query.hint({ isDeleted: 1, aiWorldOrder: -1 });
  }

  const result = await query;
  return result?.aiWorldOrder ?? -1;
};

/**
 * Get active AI World categories (optimized with lean and select)
 * @returns {Promise<Array>} - Active AI World categories
 */
const getAiWorldCategories = async () => {
  return Category.find({
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
      createdAt: 1,
      updatedAt: 1,
    })
    .sort({ aiWorldOrder: 1, createdAt: 1 }) // Primary: aiWorldOrder (ascending), Secondary: createdAt for consistency
    .lean()
    .hint({ isDeleted: 1, status: 1, isAiWorld: 1, aiWorldOrder: 1 }); // Use index hint
};

/**
 * Get maximum User Preference order number from existing categories (optimized)
 * @param {Object} filter - Optional filter (default: isDeleted: false, isUserPreference: true)
 * @returns {Promise<number>} - Maximum User Preference order number (default: -1 if no categories)
 */
const getMaxUserPreferenceOrder = async (
  filter = { isDeleted: false, isUserPreference: true }
) => {
  // Query to get max userPreferenceOrder - MongoDB will automatically use the best index
  // Use appropriate index hint based on filter
  const query = Category.findOne(filter)
    .sort({ userPreferenceOrder: -1 })
    .select({ userPreferenceOrder: 1 })
    .lean()
    .limit(1);

  // Use index hint based on whether isUserPreference is in filter
  if (filter.isUserPreference !== undefined) {
    query.hint({ isDeleted: 1, isUserPreference: 1, userPreferenceOrder: -1 });
  } else {
    query.hint({ isDeleted: 1, userPreferenceOrder: -1 });
  }

  const result = await query;
  return result?.userPreferenceOrder ?? -1;
};

/**
 * Get ALL active categories sorted by userPreferenceOrder
 * Returns ALL categories where status: true (regardless of isUserPreference)
 * Sorted by userPreferenceOrder (1, 2, 3...), then by createdAt
 * @returns {Promise<Array>} - All active categories sorted by userPreferenceOrder
 */
const getUserPreferenceCategories = async () => {
  // Use aggregation to handle missing/null values and properly sort
  return Category.aggregate([
    {
      $match: {
        isDeleted: false,
        status: true, // Return ALL categories where status: true (regardless of isUserPreference)
      },
    },
    {
      $addFields: {
        // Normalize userPreferenceOrder: treat missing/null as 0
        userPreferenceOrder: {
          $ifNull: ["$userPreferenceOrder", 0],
        },
        // Normalize isUserPreference: treat missing/null as false
        isUserPreference: {
          $ifNull: ["$isUserPreference", false],
        },
        // Create sort order: 
        // - Categories with valid order (>=1) use actual order (1, 2, 3...)
        // - Categories with order 0/null use 999999 (appear at end)
        sortOrder: {
          $cond: [
            {
              $and: [
                { $ne: ["$userPreferenceOrder", null] },
                { $ne: ["$userPreferenceOrder", 0] },
                { $gte: ["$userPreferenceOrder", 1] },
              ],
            },
            "$userPreferenceOrder", // Valid order: use actual value (1, 2, 3...)
            999999, // Invalid order (0/null): push to end
          ],
        },
      },
    },
    {
      $sort: { sortOrder: 1, createdAt: 1 }, // Sort: valid orders first (1,2,3...), then invalid at end
    },
    {
      $project: {
        _id: 1,
        name: 1,
        img_sqr: 1,
        img_rec: 1,
        video_sqr: 1,
        video_rec: 1,
        status: 1,
        order: 1,
        isUserPreference: 1,
        userPreferenceOrder: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);
};

/**
 * Get categories for users sorted by userPreferenceOrder (User-facing API)
 * Returns ONLY categories where isUserPreference: true and status: true, sorted by userPreferenceOrder
 * @returns {Promise<Array>} - User preference categories sorted by userPreferenceOrder
 */
const getUserCategoriesByPreference = async () => {
  // Use aggregation to get only user preference categories sorted by userPreferenceOrder
  return Category.aggregate([
    {
      $match: {
        isDeleted: false,
        status: true, // Only active categories
        isUserPreference: true, // ONLY user preference categories
      },
    },
    {
      $addFields: {
        // Normalize userPreferenceOrder: treat missing/null as 0
        userPreferenceOrder: {
          $ifNull: ["$userPreferenceOrder", 0],
        },
        // Create sort order:
        // - Categories with valid order (>=1) use actual order (1, 2, 3...)
        // - Categories with order 0/null use 999999 (appear at end)
        sortOrder: {
          $cond: [
            {
              $and: [
                { $ne: ["$userPreferenceOrder", null] },
                { $ne: ["$userPreferenceOrder", 0] },
                { $gte: ["$userPreferenceOrder", 1] },
              ],
            },
            "$userPreferenceOrder", // Valid order: use actual value (1, 2, 3...)
            999999, // Invalid order (0/null): push to end
          ],
        },
      },
    },
    {
      $sort: { sortOrder: 1, createdAt: 1 }, // Sort: valid orders first (1,2,3...), then invalid at end
    },
    {
      $project: {
        _id: 1,
        name: 1,
        img_sqr: 1,
        img_rec: 1,
        video_sqr: 1,
        video_rec: 1,
        status: 1,
      },
    },
  ]);
};

/**
 * Reorder a category with proper shifting logic using MongoDB transactions
 * Only affects categories with isUserPreference = true
 * 
 * @param {string} categoryId - Category ID to reorder
 * @param {number} newOrder - New order position (must be >= 1)
 * @returns {Promise<Object>} - Updated category
 */
const reorderCategory = async (categoryId, newOrder) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new Error("Invalid category ID format");
    }

    if (!Number.isInteger(newOrder) || newOrder < 1) {
      throw new Error("New order must be an integer >= 1");
    }

    // Get the category to reorder
    const category = await Category.findOne({
      _id: categoryId,
      isDeleted: false,
    })
      .select("_id isUserPreference userPreferenceOrder")
      .lean()
      .session(session);

    if (!category) {
      throw new Error("Category not found");
    }

    // Check if category has isUserPreference = true
    if (!category.isUserPreference) {
      throw new Error("Category must have isUserPreference = true to be reordered");
    }

    const oldOrder = category.userPreferenceOrder || 0;

    // If same order, no changes needed
    if (oldOrder === newOrder) {
      await session.commitTransaction();
      session.endSession();
      return await Category.findById(categoryId).lean();
    }

    // Get max order to validate newOrder
    const maxOrder = await Category.findOne(
      {
        isDeleted: false,
        isUserPreference: true,
      },
      { userPreferenceOrder: 1 }
    )
      .sort({ userPreferenceOrder: -1 })
      .lean()
      .session(session);

    const maxOrderValue = maxOrder?.userPreferenceOrder || 0;

    // Validate newOrder is within valid range
    if (newOrder > maxOrderValue + 1) {
      throw new Error(
        `New order ${newOrder} exceeds maximum order ${maxOrderValue}. Maximum allowed: ${maxOrderValue + 1}`
      );
    }

    const bulkOps = [];

    if (newOrder > oldOrder) {
      // Moving down: Decrement userPreferenceOrder by 1 for all records where
      // userPreferenceOrder > oldOrder AND userPreferenceOrder <= newOrder
      bulkOps.push({
        updateMany: {
          filter: {
            _id: { $ne: new mongoose.Types.ObjectId(categoryId) },
            isDeleted: false,
            isUserPreference: true,
            userPreferenceOrder: { $gt: oldOrder, $lte: newOrder },
          },
          update: {
            $inc: { userPreferenceOrder: -1 },
            $set: { updatedAt: new Date() },
          },
        },
      });
    } else {
      // Moving up: Increment userPreferenceOrder by 1 for all records where
      // userPreferenceOrder >= newOrder AND userPreferenceOrder < oldOrder
      bulkOps.push({
        updateMany: {
          filter: {
            _id: { $ne: new mongoose.Types.ObjectId(categoryId) },
            isDeleted: false,
            isUserPreference: true,
            userPreferenceOrder: { $gte: newOrder, $lt: oldOrder },
          },
          update: {
            $inc: { userPreferenceOrder: 1 },
            $set: { updatedAt: new Date() },
          },
        },
      });
    }

    // Update the selected category's userPreferenceOrder to newOrder
    bulkOps.push({
      updateOne: {
        filter: {
          _id: new mongoose.Types.ObjectId(categoryId),
          isDeleted: false,
          isUserPreference: true,
        },
        update: {
          $set: {
            userPreferenceOrder: newOrder,
            updatedAt: new Date(),
          },
        },
      },
    });

    // Execute all operations in transaction
    if (bulkOps.length > 0) {
      await Category.bulkWrite(bulkOps, { session, ordered: false });
    }

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    // Return updated category
    return await Category.findById(categoryId).lean();
  } catch (error) {
    // Abort transaction on error
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export default {
  find,
  findOne,
  findById,
  create,
  findByIdAndUpdate,
  findByIdAndDelete,
  bulkWrite,
  countDocuments,
  findByStatus,
  getPaginated,
  getActive,
  getMaxOrder,
  getMaxTrendingOrder,
  getTrendingCategories,
  getMaxAiWorldOrder,
  getAiWorldCategories,
  getMaxUserPreferenceOrder,
  getUserPreferenceCategories,
  getUserCategoriesByPreference,
  reorderCategory,
};
