import mongoose from "mongoose";
import Category from "../models/category.model.js";
import categoryService from "../services/category.service.js";
import fileUploadService from "../services/file.upload.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";
import enums from "../config/enum.config.js";

const { MediaTypes } = enums;

/**
 * Create new category with optional media files
 * Automatically assigns order to last position if not provided
 * @route POST /api/v1/categories
 * @access Private (Admin)
 */
const createCategory = async (req, res) => {
  try {
    const {
      name,
      status,
      order,
      isTrending,
      isAiWorld,
      isPremium,
      selectImage,
      prompt,
    } = req.body;
    const files = req.files || {};

    // Automatically assign order to last position if not provided
    // First category starts at order 1, subsequent categories increment from max order
    // Optimized: Only fetch maxOrder if order not provided
    let categoryOrder = order !== undefined ? Number(order) : null;
    if (categoryOrder === null) {
      // Use optimized query with index hint for faster execution
      const maxOrder = await categoryService.getMaxOrder({ isDeleted: false });
      // If no categories exist (maxOrder = -1), start with 1, otherwise increment
      categoryOrder = maxOrder === -1 ? 1 : maxOrder + 1;
    }

    // Build payload
    const payload = {
      name: name.trim(),
      status: status !== undefined ? status : true,
      order: categoryOrder,
      isPremium: isPremium !== undefined ? isPremium : false,
      selectImage: selectImage !== undefined ? Number(selectImage) : 1,
      prompt: prompt !== undefined ? prompt.trim() : "",
    };

    // Always assign trending order (regardless of isTrending status)
    // Query max trendingOrder from ALL categories (not just trending ones) to ensure unique incrementing order
    const maxTrendingOrder = await categoryService.getMaxTrendingOrder({
      isDeleted: false,
      // Don't filter by isTrending - get max from all categories to ensure unique order
    });
    payload.isTrending = isTrending !== undefined ? isTrending : false;
    // Assign trending order: if no categories exist, start with 1, otherwise increment
    // Order is assigned even if isTrending is false, so it's ready when admin toggles it later
    payload.trendingOrder = maxTrendingOrder === -1 ? 1 : maxTrendingOrder + 1;

    // Always assign AI World order (regardless of isAiWorld status)
    // Query max aiWorldOrder from ALL categories (not just AI World ones) to ensure unique incrementing order
    const maxAiWorldOrder = await categoryService.getMaxAiWorldOrder({
      isDeleted: false,
      // Don't filter by isAiWorld - get max from all categories to ensure unique order
    });
    payload.isAiWorld = isAiWorld !== undefined ? isAiWorld : false;
    // Assign AI World order: if no categories exist, start with 1, otherwise increment
    // Order is assigned even if isAiWorld is false, so it's ready when admin toggles it later
    payload.aiWorldOrder = maxAiWorldOrder === -1 ? 1 : maxAiWorldOrder + 1;

    // Always assign home section orders (regardless of section status)
    // Query max orders from ALL categories to ensure unique incrementing order
    const [
      maxSection1Order,
      maxSection2Order,
      maxSection6Order,
      maxSection7Order,
    ] = await Promise.all([
      Category.findOne({ isDeleted: false })
        .sort({ section1Order: -1 })
        .select({ section1Order: 1 })
        .lean()
        .limit(1)
        .hint({ isDeleted: 1, section1Order: -1 }),
      Category.findOne({ isDeleted: false })
        .sort({ section2Order: -1 })
        .select({ section2Order: 1 })
        .lean()
        .limit(1)
        .hint({ isDeleted: 1, section2Order: -1 }),
      Category.findOne({ isDeleted: false })
        .sort({ section6Order: -1 })
        .select({ section6Order: 1 })
        .lean()
        .limit(1)
        .hint({ isDeleted: 1, section6Order: -1 }),
      Category.findOne({ isDeleted: false })
        .sort({ section7Order: -1 })
        .select({ section7Order: 1 })
        .lean()
        .limit(1)
        .hint({ isDeleted: 1, section7Order: -1 }),
    ]);

    payload.isSection1 = false;
    payload.section1Order =
      maxSection1Order?.section1Order > 0
        ? maxSection1Order.section1Order + 1
        : 1;
    payload.isSection2 = false;
    payload.section2Order =
      maxSection2Order?.section2Order > 0
        ? maxSection2Order.section2Order + 1
        : 1;
    payload.isSection6 = false;
    payload.section6Order =
      maxSection6Order?.section6Order > 0
        ? maxSection6Order.section6Order + 1
        : 1;
    payload.isSection7 = false;
    payload.section7Order =
      maxSection7Order?.section7Order > 0
        ? maxSection7Order.section7Order + 1
        : 1;

    // Upload media files if provided (parallel processing for speed)
    const uploadPromises = [];

    if (files.img_sqr?.[0]) {
      uploadPromises.push(
        fileUploadService
          .uploadFile({
            buffer: files.img_sqr[0].buffer,
            mimetype: files.img_sqr[0].mimetype,
            folder: "categories",
          })
          .then((url) => ({ key: "img_sqr", url }))
      );
    }

    if (files.img_rec?.[0]) {
      uploadPromises.push(
        fileUploadService
          .uploadFile({
            buffer: files.img_rec[0].buffer,
            mimetype: files.img_rec[0].mimetype,
            folder: "categories",
          })
          .then((url) => ({ key: "img_rec", url }))
      );
    }

    if (files.video_sqr?.[0]) {
      uploadPromises.push(
        fileUploadService
          .uploadFile({
            buffer: files.video_sqr[0].buffer,
            mimetype: files.video_sqr[0].mimetype,
            folder: "categories",
          })
          .then((url) => ({ key: "video_sqr", url }))
      );
    }

    if (files.video_rec?.[0]) {
      uploadPromises.push(
        fileUploadService
          .uploadFile({
            buffer: files.video_rec[0].buffer,
            mimetype: files.video_rec[0].mimetype,
            folder: "categories",
          })
          .then((url) => ({ key: "video_rec", url }))
      );
    }

    // Wait for all uploads in parallel
    const uploadedFiles = await Promise.all(uploadPromises);
    uploadedFiles.forEach(({ key, url }) => {
      payload[key] = url;
    });

    // Create category in database
    const created = await categoryService.create(payload);

    return apiResponse({
      res,
      statusCode: StatusCodes.CREATED,
      status: true,
      message: "Category created successfully",
      data: created,
    });
  } catch (error) {
    console.error("Create Category Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to create category",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get all categories sorted by order (ascending: 1, 2, 3, 4...)
 * @route GET /api/v1/categories
 * @access Private
 */
const getCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const limitNum = Number(limit) > 0 ? Number(limit) : 50;

    // Parallel queries for faster response (optimized with index hints)
    const [categories, total] = await Promise.all([
      categoryService
        .find({ isDeleted: false })
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
          isAiWorld: 1,
          aiWorldOrder: 1,
          isPremium: 1,
          selectImage: 1,
          prompt: 1,
          isSection1: 1,
          section1Order: 1,
          isSection2: 1,
          section2Order: 1,
          isSection6: 1,
          section6Order: 1,
          isSection7: 1,
          section7Order: 1,
          updatedAt: 1,
          createdAt: 1,
        })
        .sort({ order: 1, createdAt: 1 }) // Primary: order (ascending), Secondary: createdAt for consistency
        .skip(skip)
        .limit(limitNum)
        .lean()
        .hint({ isDeleted: 1, order: 1, createdAt: 1 }), // Use index hint for faster query
      categoryService.countDocuments({ isDeleted: false }),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    // Ensure selectImage and prompt fields exist with default values for all categories
    const categoriesWithDefaults = categories.map((category) => ({
      ...category,
      selectImage:
        category.selectImage !== undefined && category.selectImage !== null
          ? category.selectImage
          : 1,
      prompt: category.prompt !== undefined ? category.prompt : "",
    }));

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully",
      data: categoriesWithDefaults,
      pagination: {
        page: Number(page),
        limit: limitNum,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Fetch Categories Error:", error);
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
 * Get all category titles only (public)
 * Returns _id and name for all active categories (status: true only)
 * @route GET /api/v1/categories/titles
 * @access Public
 */
const getCategoryTitles = async (req, res) => {
  try {
    // Only fetch active categories (status: true) that are not deleted
    const categories = await categoryService
      .find({ isDeleted: false, status: true })
      .select({ _id: 1, name: 1 })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Category titles fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Fetch Category Titles Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch category titles",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Get single category by ID
 * @route GET /api/v1/categories/:id
 * @access Private
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format",
        data: null,
      });
    }

    const category = await categoryService.findById(id, true);

    if (!category || category.isDeleted) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Category not found",
        data: null,
      });
    }

    // Ensure selectImage and prompt fields exist with default values
    const categoryWithDefaults = {
      ...(category.toObject ? category.toObject() : category),
      selectImage:
        category.selectImage !== undefined && category.selectImage !== null
          ? category.selectImage
          : 1,
      prompt: category.prompt !== undefined ? category.prompt : "",
    };

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Category fetched successfully",
      data: categoryWithDefaults,
    });
  } catch (error) {
    console.error("Fetch Category Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to fetch category",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Update category (partial update supported)
 * Old media files are deleted and replaced if new ones provided
 * @route PUT /api/v1/categories/:id
 * @access Private (Admin)
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, order, isPremium, selectImage, prompt } = req.body;
    const files = req.files || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format",
        data: null,
      });
    }

    // Use lean query for faster read (optimized)
    const existing = await categoryService.findById(id, true);
    if (!existing || existing.isDeleted) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Category not found",
        data: null,
      });
    }

    const updateData = {};

    // Update simple fields if provided
    if (name !== undefined) updateData.name = name.trim();
    if (status !== undefined) updateData.status = status;
    if (order !== undefined) updateData.order = Number(order);
    if (isPremium !== undefined) updateData.isPremium = isPremium;
    if (selectImage !== undefined) updateData.selectImage = Number(selectImage);
    if (prompt !== undefined) updateData.prompt = prompt.trim();

    // Handle media file updates and null assignments
    const updatePromises = [];
    const deletePromises = [];

    // Check for null assignments in req.body (to remove/clear media)
    const mediaFields = ["img_sqr", "img_rec", "video_sqr", "video_rec"];
    mediaFields.forEach((field) => {
      const bodyValue = req.body[field];
      // Check if explicitly set to null, "null", or empty string
      if (
        bodyValue === null ||
        bodyValue === "null" ||
        bodyValue === "" ||
        bodyValue === "undefined"
      ) {
        // Delete existing file if it exists
        if (existing[field]) {
          deletePromises.push(
            fileUploadService
              .deleteFile({ url: existing[field] })
              .catch((err) =>
                console.warn(`Warning: Failed to delete ${field}:`, err.message)
              )
          );
        }
        // Set field to null
        updateData[field] = null;
      }
    });

    // Handle file uploads (only if not already set to null)
    if (files.img_sqr?.[0] && updateData.img_sqr === undefined) {
      updatePromises.push(
        fileUploadService
          .updateFile({
            url: existing.img_sqr || null,
            buffer: files.img_sqr[0].buffer,
            mimetype: files.img_sqr[0].mimetype,
            folder: "categories",
          })
          .then((url) => ({ key: "img_sqr", url }))
      );
    }

    if (files.img_rec?.[0] && updateData.img_rec === undefined) {
      updatePromises.push(
        fileUploadService
          .updateFile({
            url: existing.img_rec || null,
            buffer: files.img_rec[0].buffer,
            mimetype: files.img_rec[0].mimetype,
            folder: "categories",
          })
          .then((url) => ({ key: "img_rec", url }))
      );
    }

    if (files.video_sqr?.[0] && updateData.video_sqr === undefined) {
      updatePromises.push(
        fileUploadService
          .updateFile({
            url: existing.video_sqr || null,
            buffer: files.video_sqr[0].buffer,
            mimetype: files.video_sqr[0].mimetype,
            folder: "categories",
          })
          .then((url) => ({ key: "video_sqr", url }))
      );
    }

    if (files.video_rec?.[0] && updateData.video_rec === undefined) {
      updatePromises.push(
        fileUploadService
          .updateFile({
            url: existing.video_rec || null,
            buffer: files.video_rec[0].buffer,
            mimetype: files.video_rec[0].mimetype,
            folder: "categories",
          })
          .then((url) => ({ key: "video_rec", url }))
      );
    }

    // Process all file operations in parallel (uploads and deletes)
    const [updatedFiles] = await Promise.all([
      Promise.all(updatePromises),
      Promise.all(deletePromises),
    ]);

    // Add uploaded file URLs to updateData
    updatedFiles.forEach(({ key, url }) => {
      updateData[key] = url;
    });

    updateData.updatedAt = new Date();

    // Update in database
    const updated = await categoryService.findByIdAndUpdate(id, updateData);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Category updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update Category Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to update category",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Delete category (permanent delete)
 * Deletes all associated media files from DigitalOcean
 * @route DELETE /api/v1/categories/:id
 * @access Private (Admin)
 */
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format",
        data: null,
      });
    }

    // Use lean query for faster read (optimized)
    const existing = await categoryService.findById(id, true);
    if (!existing || existing.isDeleted) {
      return apiResponse({
        res,
        statusCode: StatusCodes.NOT_FOUND,
        status: false,
        message: "Category not found",
        data: null,
      });
    }

    // Delete all associated files from DigitalOcean (parallel - non-blocking)
    const deletePromises = [];

    if (existing.img_sqr) {
      deletePromises.push(
        fileUploadService
          .deleteFile({ url: existing.img_sqr })
          .catch((err) =>
            console.warn("Warning: Failed to delete img_sqr:", err.message)
          )
      );
    }

    if (existing.img_rec) {
      deletePromises.push(
        fileUploadService
          .deleteFile({ url: existing.img_rec })
          .catch((err) =>
            console.warn("Warning: Failed to delete img_rec:", err.message)
          )
      );
    }

    if (existing.video_sqr) {
      deletePromises.push(
        fileUploadService
          .deleteFile({ url: existing.video_sqr })
          .catch((err) =>
            console.warn("Warning: Failed to delete video_sqr:", err.message)
          )
      );
    }

    if (existing.video_rec) {
      deletePromises.push(
        fileUploadService
          .deleteFile({ url: existing.video_rec })
          .catch((err) =>
            console.warn("Warning: Failed to delete video_rec:", err.message)
          )
      );
    }

    // Wait for file deletion (non-blocking for some failures)
    await Promise.all(deletePromises);

    // Delete from database
    await categoryService.findByIdAndDelete(id);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Category deleted successfully",
      data: null,
    });
  } catch (error) {
    console.error("Delete Category Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to delete category",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Bulk reorder categories (drag & drop)
 * Handles position conflicts by automatically shifting other categories
 * Ensures sequential ordering starting from 1 with no duplicates
 * @route PATCH /api/v1/categories/reorder
 * @access Private (Admin)
 */
const reorderCategories = async (req, res) => {
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

    // Get all existing categories from database (optimized - only needed fields)
    const allCategories = await categoryService
      .find({ isDeleted: false })
      .select({ _id: 1, order: 1 })
      .sort({ order: 1, createdAt: 1 })
      .lean()
      .hint({ isDeleted: 1, order: 1, createdAt: 1 }); // Use index hint

    // Create a map of category IDs to their new orders from request
    const newOrderMap = new Map();
    items.forEach((item) => {
      newOrderMap.set(item._id.toString(), Number(item.order));
    });

    // Check if all categories are being reordered or just some
    const isFullReorder = allCategories.length === items.length;

    if (isFullReorder) {
      // If all categories are provided, use their specified orders (sorted)
      // This handles the case where frontend sends complete new order
      const sortedItems = [...items].sort(
        (a, b) => Number(a.order) - Number(b.order)
      );

      // Build final order assignment - assign sequential orders starting from 1
      const finalOrders = new Map();
      sortedItems.forEach((item, index) => {
        finalOrders.set(item._id.toString(), index + 1);
      });

      // Build bulk operations (optimized with ordered: false for parallel execution)
      const bulkOps = Array.from(finalOrders.entries()).map(([id, order]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
          update: {
            $set: {
              order: order,
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
        message: "Categories reordered successfully",
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
        },
      });
    } else {
      // Partial reorder: only some categories are being moved
      // Need to shift other categories to maintain sequential ordering

      // Separate categories into reordered and unchanged
      const reorderedCategories = [];
      const unchangedCategories = [];

      allCategories.forEach((cat) => {
        const catId = cat._id.toString();
        if (newOrderMap.has(catId)) {
          reorderedCategories.push({
            _id: cat._id,
            oldOrder: cat.order,
            newOrder: newOrderMap.get(catId),
          });
        } else {
          unchangedCategories.push({
            _id: cat._id,
            order: cat.order,
          });
        }
      });

      // Sort reordered categories by their desired new order
      reorderedCategories.sort((a, b) => a.newOrder - b.newOrder);

      // Build final order assignment for all categories
      const finalOrders = new Map();
      let currentOrder = 1;

      // Process reordered categories first (they get priority at their desired positions)
      reorderedCategories.forEach((cat) => {
        finalOrders.set(cat._id.toString(), currentOrder);
        currentOrder++;
      });

      // Process unchanged categories, maintaining their relative order
      unchangedCategories.sort((a, b) => a.order - b.order);
      unchangedCategories.forEach((cat) => {
        finalOrders.set(cat._id.toString(), currentOrder);
        currentOrder++;
      });

      // Build bulk operations to update all categories (optimized with ordered: false)
      const bulkOps = Array.from(finalOrders.entries()).map(([id, order]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
          update: {
            $set: {
              order: order,
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
        message: "Categories reordered successfully",
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount,
        },
      });
    }
  } catch (error) {
    console.error("Reorder Categories Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to reorder categories",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Toggle category status (active/inactive) - Optimized with single query
 * @route PATCH /api/v1/categories/:id/status
 * @access Private (Admin)
 */
const toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format",
        data: null,
      });
    }

    // Optimized: Use findOneAndUpdate to get current status and update in one query
    const category = await Category.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { updatedAt: new Date() } },
      { new: false, lean: true, select: "status" }
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

    const newStatus = status !== undefined ? status : !category.status;

    // Update with new status
    const updated = await categoryService.findByIdAndUpdate(id, {
      status: newStatus,
      updatedAt: new Date(),
    });

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: newStatus
        ? "Category activated successfully"
        : "Category deactivated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Toggle Status Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to toggle category status",
      data: null,
      error: error.message,
    });
  }
};

/**
 * Toggle category premium status - Optimized with single query
 * @route PATCH /api/v1/categories/:id/premium
 * @access Private (Admin)
 */
const toggleCategoryPremium = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPremium } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        statusCode: StatusCodes.BAD_REQUEST,
        status: false,
        message: "Invalid category ID format",
        data: null,
      });
    }

    // Optimized: Use findOneAndUpdate to get current premium status and update in one query
    const category = await Category.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: { updatedAt: new Date() } },
      { new: false, lean: true, select: "isPremium" }
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

    const newPremium =
      isPremium !== undefined ? isPremium : !category.isPremium;

    // Update with new premium status
    const updated = await categoryService.findByIdAndUpdate(id, {
      isPremium: newPremium,
      updatedAt: new Date(),
    });

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: newPremium
        ? "Category marked as premium successfully"
        : "Category removed from premium successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Toggle Premium Error:", error);
    return apiResponse({
      res,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      status: false,
      message: "Failed to toggle category premium status",
      data: null,
      error: error.message,
    });
  }
};

export default {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  reorderCategories,
  toggleCategoryStatus,
  toggleCategoryPremium,
  getCategoryTitles,
};
