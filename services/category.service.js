import Category from "../models/category.model.js";

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
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Category.find({ isDeleted: false })
      .sort({ order: 1, updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Category.countDocuments({ isDeleted: false }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
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
};
