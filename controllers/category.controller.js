import mongoose from "mongoose";
import Category from "../models/category.model.js";
import categoryService from "../services/category.service.js";
import fileUploadService from "../services/file.upload.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import { StatusCodes } from "http-status-codes";
import enums from "../config/enum.config.js";
import helper from "../helper/common.helper.js";

const { MediaTypes } = enums;

// Helper function to preserve existing _id from database or create new one
const preserveAssetId = (asset) => {
  if (!asset || !asset._id) {
    return new mongoose.Types.ObjectId();
  }
  if (asset._id instanceof mongoose.Types.ObjectId) {
    return asset._id;
  }
  if (typeof asset._id === "string") {
    return mongoose.Types.ObjectId.isValid(asset._id)
      ? new mongoose.Types.ObjectId(asset._id)
      : new mongoose.Types.ObjectId();
  }
  if (asset._id.toString && typeof asset._id.toString === "function") {
    const idString = asset._id.toString();
    return mongoose.Types.ObjectId.isValid(idString)
      ? new mongoose.Types.ObjectId(idString)
      : new mongoose.Types.ObjectId();
  }
  try {
    const idString = String(asset._id);
    return mongoose.Types.ObjectId.isValid(idString)
      ? new mongoose.Types.ObjectId(idString)
      : new mongoose.Types.ObjectId();
  } catch {
    return new mongoose.Types.ObjectId();
  }
};

// Normalize asset_images array - preserve IDs from database
const normalizeAssets = (assets) => {
  if (!Array.isArray(assets)) return [];
  return assets
    .map((asset) => {
      if (typeof asset === "string") {
        return {
          _id: new mongoose.Types.ObjectId(),
          url: asset,
          isPremium: false,
          imageCount: 1,
          prompt: "",
        };
      }
      return {
        _id: preserveAssetId(asset),
        url: asset.url || "",
        isPremium: asset.isPremium !== undefined ? asset.isPremium : false,
        imageCount: asset.imageCount !== undefined ? asset.imageCount : 1,
        prompt: asset.prompt !== undefined ? String(asset.prompt).trim() : "",
      };
    })
    .filter((asset) => asset.url && asset.url.trim() !== "");
};

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
      imageCount,
      imagecount, // Handle lowercase variant from form-data
      prompt,
      country,
      android_appVersion,
      ios_appVersion,
    } = req.body;
    const files = req.files || {};

    // Automatically assign order to last position if not provided
    // If order is provided, check for conflicts and shift existing categories
    let categoryOrder = order !== undefined ? Number(order) : null;

    if (categoryOrder === null) {
      // Use optimized query with index hint for faster execution
      const maxOrder = await categoryService.getMaxOrder({ isDeleted: false });
      // If no categories exist (maxOrder = -1), start with 1, otherwise increment
      categoryOrder = maxOrder === -1 ? 1 : maxOrder + 1;
    } else {
      // Order is provided - check if it conflicts with existing categories
      // If conflict exists, shift all categories with order >= providedOrder by +1
      const conflictingCategory = await categoryService.findOne(
        { order: categoryOrder, isDeleted: false },
        true // lean
      );

      if (conflictingCategory) {
        // Shift all categories with order >= providedOrder by +1
        await categoryService.bulkWrite(
          [
            {
              updateMany: {
                filter: {
                  order: { $gte: categoryOrder },
                  isDeleted: false,
                },
                update: {
                  $inc: { order: 1 },
                },
              },
            },
          ],
          { ordered: false }
        );
      }
    }

    // Build payload
    // Handle imageCount: accept both camelCase and lowercase, convert to number, validate, and use default only if truly undefined/null/empty
    let finalImageCount = 1; // Default value
    // Check both imageCount (camelCase) and imagecount (lowercase) for form-data compatibility
    const imageCountValue = imageCount !== undefined ? imageCount : imagecount;
    if (
      imageCountValue !== undefined &&
      imageCountValue !== null &&
      imageCountValue !== ""
    ) {
      const parsedCount = Number(imageCountValue);
      if (!isNaN(parsedCount) && parsedCount >= 1) {
        finalImageCount = parsedCount;
      }
    }

    const payload = {
      name: name.trim(),
      status: status !== undefined ? status : true,
      order: categoryOrder,
      isPremium: isPremium !== undefined ? isPremium : false,
      imageCount: finalImageCount,
      prompt: prompt !== undefined ? prompt.trim() : "",
    };

    // Add country and appVersion if provided
    if (country !== undefined && country !== null && country !== "") {
      payload.country = country.trim();
    }
    if (android_appVersion !== undefined && android_appVersion !== null && android_appVersion !== "") {
      payload.android_appVersion = android_appVersion.trim();
    }
    if (ios_appVersion !== undefined && ios_appVersion !== null && ios_appVersion !== "") {
      payload.ios_appVersion = ios_appVersion.trim();
    }

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

    // Always assign User Preference order (regardless of isUserPreference status)
    // Query max userPreferenceOrder from ALL categories (not just User Preference ones) to ensure unique incrementing order
    const maxUserPreferenceOrder = await categoryService.getMaxUserPreferenceOrder({
      isDeleted: false,
      // Don't filter by isUserPreference - get max from all categories to ensure unique order
    });
    payload.isUserPreference = false; // Default to false, admin can toggle later
    // Assign User Preference order: if no categories exist, start with 1, otherwise increment
    // Order is assigned even if isUserPreference is false, so it's ready when admin toggles it later
    payload.userPreferenceOrder = maxUserPreferenceOrder === -1 ? 1 : maxUserPreferenceOrder + 1;

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

    // Process asset_images files if provided
    if (req.files?.asset_images && Array.isArray(req.files.asset_images)) {
      const { isPremium = false, prompt = "" } = req.body || {};
      const finalIsPremium = Boolean(isPremium);
      const finalPrompt = String(prompt || "").trim();

      const assetObjects = [];
      for (const file of req.files.asset_images) {
        try {
          const fileUrl = await fileUploadService.uploadFile({
            buffer: file.buffer,
            mimetype: file.mimetype,
            folder: "categories/assets",
          });
          assetObjects.push({
            _id: new mongoose.Types.ObjectId(),
            url: fileUrl,
            isPremium: finalIsPremium,
            imageCount: 1, // Default to 1, can be updated via asset-specific APIs
            prompt: finalPrompt,
          });
        } catch (err) {
          console.error("Error uploading asset:", err);
        }
      }
      if (assetObjects.length > 0) {
        payload.asset_images = assetObjects;
      }
    }

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
    // Fetch all categories without pagination
    const categories = await categoryService
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
        imageCount: 1,
        prompt: 1,
        isSection1: 1,
        section1Order: 1,
        isSection2: 1,
        section2Order: 1,
        isSection6: 1,
        section6Order: 1,
        isSection7: 1,
        section7Order: 1,
        isMore: 1,
        moreOrder: 1,
        isUserPreference: 1,
        userPreferenceOrder: 1,
        country: 1,
        android_appVersion: 1,
        ios_appVersion: 1,
        asset_images: 1,
        updatedAt: 1,
        createdAt: 1,
      })
      .sort({ order: 1, createdAt: 1 }) // Primary: order (ascending), Secondary: createdAt for consistency
      .lean()
      .hint({ isDeleted: 1, order: 1, createdAt: 1 }); // Use index hint for faster query

    // Ensure imageCount and prompt fields exist with default values for all categories
    const categoriesWithDefaults = categories.map((category) => ({
      ...category,
      imageCount:
        category.imageCount !== undefined && category.imageCount !== null
          ? category.imageCount
          : 1,
      prompt: category.prompt !== undefined ? category.prompt : "",
    }));

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Categories fetched successfully",
      data: categoriesWithDefaults,
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
 * Filtered by user app version if logged in
 * @route GET /api/v1/categories/titles
 * @access Public
 */
const getCategoryTitles = async (req, res) => {
  try {
    // Only fetch active categories (status: true) that are not deleted
    const categories = await categoryService
      .find({ isDeleted: false, status: true })
      .select({ _id: 1, name: 1, android_appVersion: 1, ios_appVersion: 1 })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Filter by app version if user is logged in
    const userAppVersion = req.user?.appVersion;
    const userProvider = req.user?.provider;
    const filteredCategories = helper.filterCategoriesByAppVersion(req.user, categories);

    return apiResponse({
      res,
      statusCode: StatusCodes.OK,
      status: true,
      message: "Category titles fetched successfully",
      data: filteredCategories,
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

    // Ensure imageCount and prompt fields exist with default values
    const categoryWithDefaults = {
      ...(category.toObject ? category.toObject() : category),
      imageCount:
        category.imageCount !== undefined && category.imageCount !== null
          ? category.imageCount
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
    const { name, status, order, isPremium, imageCount, prompt, country, android_appVersion, ios_appVersion } = req.body;
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
    if (imageCount !== undefined) updateData.imageCount = Number(imageCount);
    if (prompt !== undefined) updateData.prompt = prompt.trim();
    if (req.body.isUserPreference !== undefined)
      updateData.isUserPreference = req.body.isUserPreference;
    if (req.body.userPreferenceOrder !== undefined)
      updateData.userPreferenceOrder = Number(req.body.userPreferenceOrder);
    
    // Handle country and appVersion (allow null/empty to clear the field)
    if (country !== undefined) {
      updateData.country = country === null || country === "" || country === "null" ? null : country.trim();
    }
    if (android_appVersion !== undefined) {
      updateData.android_appVersion = android_appVersion === null || android_appVersion === "" || android_appVersion === "null" ? null : android_appVersion.trim();
    }
    if (ios_appVersion !== undefined) {
      updateData.ios_appVersion = ios_appVersion === null || ios_appVersion === "" || ios_appVersion === "null" ? null : ios_appVersion.trim();
    }

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

    // Delete asset images if they exist
    if (existing.asset_images && existing.asset_images.length > 0) {
      for (const asset of existing.asset_images) {
        try {
          const url = typeof asset === "string" ? asset : asset.url;
          if (url) {
            deletePromises.push(
              fileUploadService
                .deleteFile({ url })
                .catch((err) =>
                  console.warn("Warning: Failed to delete asset:", err.message)
                )
            );
          }
        } catch (err) {
          console.error(`Failed to delete asset:`, err);
        }
      }
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
      // If all categories are provided, respect their desired order values
      // Use the same logic as partial reorder - it works for both cases
      const desired = items
        .filter(
          (item) =>
            item &&
            item._id &&
            mongoose.Types.ObjectId.isValid(item._id) &&
            typeof item.order !== "undefined"
        )
        .map((item) => ({
          id: item._id.toString(),
          order: Math.max(1, Number(item.order) || 1),
        }))
        .sort((a, b) => a.order - b.order);

      if (desired.length === 0) {
        return apiResponse({
          res,
          statusCode: StatusCodes.BAD_REQUEST,
          status: false,
          message: "No valid categories found for reordering",
          data: null,
        });
      }

      // Build remaining list (should be empty for full reorder, but handle it anyway)
      const desiredIds = new Set(desired.map((d) => d.id));
      const remaining = allCategories.filter(
        (cat) => !desiredIds.has(cat._id.toString())
      );

      // Reconstruct final ordered list respecting desired positions
      const finalList = [];
      let remainingIdx = 0;

      desired.forEach((d) => {
        const targetIdx = Math.max(0, d.order - 1); // Convert to 0-based index
        // Fill slots up to targetIdx with remaining items
        while (
          finalList.length < targetIdx &&
          remainingIdx < remaining.length
        ) {
          finalList.push(remaining[remainingIdx]._id.toString());
          remainingIdx++;
        }
        // Place desired item at its target position
        finalList.push(d.id);
      });

      // Append any leftover remaining items
      while (remainingIdx < remaining.length) {
        finalList.push(remaining[remainingIdx]._id.toString());
        remainingIdx++;
      }

      // Assign sequential orders (1, 2, 3, ...) to all categories
      const bulkOps = finalList.map((id, idx) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
          update: {
            $set: {
              order: idx + 1,
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
      // Respect desired order values and place items at those positions, then reassign all orders sequentially

      // Filter valid items and sort by desired order
      const desired = items
        .filter(
          (item) =>
            item &&
            item._id &&
            mongoose.Types.ObjectId.isValid(item._id) &&
            typeof item.order !== "undefined"
        )
        .map((item) => ({
          id: item._id.toString(),
          order: Math.max(1, Number(item.order) || 1),
        }))
        .sort((a, b) => a.order - b.order);

      if (desired.length === 0) {
        return apiResponse({
          res,
          statusCode: StatusCodes.BAD_REQUEST,
          status: false,
          message: "No valid categories found for reordering",
          data: null,
        });
      }

      // Build remaining list (categories not in desired list)
      const desiredIds = new Set(desired.map((d) => d.id));
      const remaining = allCategories.filter(
        (cat) => !desiredIds.has(cat._id.toString())
      );

      // Reconstruct final ordered list respecting desired positions
      const finalList = [];
      let remainingIdx = 0;

      desired.forEach((d) => {
        const targetIdx = Math.max(0, d.order - 1); // Convert to 0-based index
        // Fill slots up to targetIdx with remaining items
        while (
          finalList.length < targetIdx &&
          remainingIdx < remaining.length
        ) {
          finalList.push(remaining[remainingIdx]._id.toString());
          remainingIdx++;
        }
        // Place desired item at its target position
        finalList.push(d.id);
      });

      // Append any leftover remaining items
      while (remainingIdx < remaining.length) {
        finalList.push(remaining[remainingIdx]._id.toString());
        remainingIdx++;
      }

      // Assign sequential orders (1, 2, 3, ...) to all categories
      const bulkOps = finalList.map((id, idx) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id), isDeleted: false },
          update: {
            $set: {
              order: idx + 1,
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


// Upload Asset Images
const uploadAssetImages = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid category id",
      });
    }

    const item = await Category.findById(id);
    if (!item) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Category not found",
      });
    }

    // Process uploaded files
    const {
      isPremium = false,
      imageCount,
      imagecount,
      prompt = "",
    } = req.body || {};
    const finalIsPremium = Boolean(isPremium);
    const finalPrompt = String(prompt || "").trim();
    const assetImageCount =
      imageCount !== undefined
        ? Number(imageCount) || 1
        : imagecount !== undefined
        ? Number(imagecount) || 1
        : 1;

    const uploadedAssets = [];
    if (req.files?.asset_images && Array.isArray(req.files.asset_images)) {
      for (const file of req.files.asset_images) {
        try {
          const fileUrl = await fileUploadService.uploadFile({
            buffer: file.buffer,
            mimetype: file.mimetype,
            folder: "categories/assets",
          });
          uploadedAssets.push({
            _id: new mongoose.Types.ObjectId(),
            url: fileUrl,
            isPremium: finalIsPremium,
            imageCount: assetImageCount,
            prompt: finalPrompt,
          });
        } catch (err) {
          console.error("Error uploading asset:", err);
        }
      }
    }

    if (uploadedAssets.length === 0) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "No files were uploaded",
      });
    }

    // Filter duplicates
    const existingUrls = (item.asset_images || []).map((a) =>
      typeof a === "string" ? a : a.url
    );
    const newAssets = uploadedAssets.filter(
      (asset) => !existingUrls.includes(asset.url)
    );

    if (newAssets.length === 0) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "All uploaded files already exist",
      });
    }

    const updated = await Category.findByIdAndUpdate(
      id,
      { $push: { asset_images: { $each: newAssets } } },
      { new: true }
    ).lean();

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: `${newAssets.length} asset image(s) uploaded successfully`,
      data: {
        ...updated,
        asset_images: normalizeAssets(updated.asset_images || []),
      },
    });
  } catch (error) {
    console.error("uploadAssetImages error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to upload asset images",
    });
  }
};

// Get Category Assets
const getCategoryAssets = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid category id",
      });
    }

    const category = await Category.findOne({
      _id: id,
      status: true,
    })
      .select({ _id: 1, name: 1, asset_images: 1, prompt: 1 })
      .lean();

    if (!category) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Category not found or inactive",
      });
    }

    const allAssetImages = normalizeAssets(category.asset_images || []);
    const { skip, limit: limitNum } = helper.paginationFun({
      page,
      limit,
    });
    const paginatedAssetImages = allAssetImages.slice(skip, skip + limitNum);
    const pagination = helper.paginationDetails({
      page,
      totalItems: allAssetImages.length,
      limit: limitNum,
    });

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Category assets fetched successfully",
      data: {
        _id: category._id,
        name: category.name,
        asset_images: paginatedAssetImages,
        pagination,
      },
    });
  } catch (error) {
    console.error("getCategoryAssets error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to fetch category assets",
    });
  }
};

// Delete Asset Image
const deleteAssetImage = async (req, res) => {
  try {
    const { id } = req.params;
    const assetId =
      (req.query && req.query.assetId) || (req.body && req.body.assetId);
    const url = (req.query && req.query.url) || (req.body && req.body.url);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid category id",
      });
    }

    if (!assetId && !url) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message:
          'Either assetId or url is required. Provide in query params or body: { "assetId": "<id>" } or { "url": "<url>" }',
      });
    }

    const item = await Category.findById(id);

    if (!item) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Category not found",
      });
    }

    let assetToDelete = null;
    let assetIndex = -1;

    if (assetId) {
      const assets = item.asset_images || [];
      assetIndex = assets.findIndex((asset) => {
        if (typeof asset === "string") return false;
        if (!asset || !asset._id) return false;
        return (
          asset._id.toString() === assetId ||
          asset._id.toString() === String(assetId)
        );
      });
      if (assetIndex !== -1) {
        assetToDelete = assets[assetIndex];
      }
    } else if (url) {
      const decodedUrl = req.query.url ? decodeURIComponent(url) : url;
      const assets = item.asset_images || [];
      assetIndex = assets.findIndex((asset) => {
        if (typeof asset === "string") return asset === decodedUrl;
        if (!asset) return false;
        return (
          asset.url === decodedUrl ||
          (asset._id && asset._id.toString() === decodedUrl)
        );
      });
      if (assetIndex !== -1) {
        assetToDelete = assets[assetIndex];
      }
    }

    if (!assetToDelete || assetIndex === -1) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Asset image not found in this category",
      });
    }

    const assetObj =
      assetToDelete && typeof assetToDelete.toObject === "function"
        ? assetToDelete.toObject()
        : assetToDelete;

    const urlToDelete =
      typeof assetObj === "string"
        ? assetObj
        : assetObj && assetObj.url
        ? assetObj.url
        : null;
    if (urlToDelete) {
      try {
        await fileUploadService.deleteFile({ url: urlToDelete });
      } catch (err) {
        console.error("Failed to delete asset from cloud:", err);
      }
    }

    let pullQuery;
    if (typeof assetObj === "string") {
      pullQuery = urlToDelete;
    } else {
      if (assetObj && assetObj._id) {
        pullQuery = { _id: assetObj._id };
      } else if (urlToDelete) {
        pullQuery = { url: urlToDelete };
      } else {
        pullQuery = assetObj;
      }
    }

    const updated = await Category.findByIdAndUpdate(
      id,
      {
        $pull: {
          asset_images: pullQuery,
        },
      },
      { new: true }
    ).lean();

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Asset image deleted successfully",
      data: {
        ...updated,
        asset_images: normalizeAssets(updated.asset_images || []),
      },
    });
  } catch (error) {
    console.error("deleteAssetImage error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to delete asset image",
    });
  }
};

// Manage Category Assets (add or remove URLs)
const manageCategoryAssets = async (req, res) => {
  try {
    const { id } = req.params;
    const { addUrl, removeUrl, removeUrls } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid category id",
      });
    }

    const item = await Category.findById(id);
    if (!item) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Category not found",
      });
    }

    const {
      isPremium = false,
      imageCount,
      imagecount,
      prompt = "",
    } = req.body || {};
    const finalIsPremium = Boolean(isPremium);
    const finalPrompt = String(prompt || "").trim();
    const assetImageCount =
      imageCount !== undefined
        ? Number(imageCount) || 1
        : imagecount !== undefined
        ? Number(imagecount) || 1
        : 1;

    // Handle file uploads
    if (
      req.files?.asset_images &&
      Array.isArray(req.files.asset_images) &&
      req.files.asset_images.length > 0
    ) {
      const uploadedAssets = [];
      const existingUrls = (item.asset_images || []).map((a) =>
        typeof a === "string" ? a : a.url
      );

      for (const file of req.files.asset_images) {
        try {
          const fileUrl = await fileUploadService.uploadFile({
            buffer: file.buffer,
            mimetype: file.mimetype,
            folder: "categories/assets",
          });

          if (!existingUrls.includes(fileUrl)) {
            uploadedAssets.push({
              _id: new mongoose.Types.ObjectId(),
              url: fileUrl,
              isPremium: finalIsPremium,
              imageCount: assetImageCount,
              prompt: finalPrompt,
            });
            existingUrls.push(fileUrl);
          }
        } catch (err) {
          console.error("Error uploading asset file:", err);
        }
      }

      if (uploadedAssets.length > 0) {
        const updated = await Category.findByIdAndUpdate(
          id,
          { $push: { asset_images: { $each: uploadedAssets } } },
          { new: true }
        ).lean();

        return apiResponse({
          res,
          status: true,
          statusCode: StatusCodes.OK,
          message: `${uploadedAssets.length} asset image(s) uploaded successfully`,
          data: {
            ...updated,
            asset_images: normalizeAssets(updated.asset_images || []),
          },
        });
      } else {
        return apiResponse({
          res,
          status: false,
          statusCode: StatusCodes.BAD_REQUEST,
          message: "All uploaded files already exist or failed to upload",
        });
      }
    }

    // Add URL
    if (addUrl) {
      const existingUrls = (item.asset_images || []).map((a) =>
        typeof a === "string" ? a : a.url
      );

      if (existingUrls.includes(addUrl)) {
        return apiResponse({
          res,
          status: false,
          statusCode: StatusCodes.BAD_REQUEST,
          message: "Asset image with this URL already exists",
        });
      }

      const newAsset = {
        _id: new mongoose.Types.ObjectId(),
        url: addUrl,
        isPremium: finalIsPremium,
        imageCount: assetImageCount,
        prompt: finalPrompt,
      };

      const updated = await Category.findByIdAndUpdate(
        id,
        { $push: { asset_images: newAsset } },
        { new: true }
      ).lean();

      return apiResponse({
        res,
        status: true,
        statusCode: StatusCodes.OK,
        message: "Asset image added successfully",
        data: {
          ...updated,
          asset_images: normalizeAssets(updated.asset_images || []),
        },
      });
    }

    // Remove single URL
    if (removeUrl) {
      const assetToDelete = (item.asset_images || []).find((asset) => {
        if (typeof asset === "string") return asset === removeUrl;
        return asset.url === removeUrl || asset._id?.toString() === removeUrl;
      });

      if (!assetToDelete) {
        return apiResponse({
          res,
          status: false,
          statusCode: StatusCodes.NOT_FOUND,
          message: "Asset image not found",
        });
      }

      const urlToDelete =
        typeof assetToDelete === "string" ? assetToDelete : assetToDelete.url;
      try {
        await fileUploadService.deleteFile({ url: urlToDelete });
      } catch (err) {
        console.error("Failed to delete asset from cloud:", err);
      }

      const updated = await Category.findByIdAndUpdate(
        id,
        {
          $pull: {
            asset_images:
              typeof assetToDelete === "string"
                ? removeUrl
                : { $or: [{ url: urlToDelete }, { _id: assetToDelete._id }] },
          },
        },
        { new: true }
      ).lean();

      return apiResponse({
        res,
        status: true,
        statusCode: StatusCodes.OK,
        message: "Asset image removed successfully",
        data: {
          ...updated,
          asset_images: normalizeAssets(updated.asset_images || []),
        },
      });
    }

    // Remove multiple URLs
    if (removeUrls && Array.isArray(removeUrls) && removeUrls.length > 0) {
      const assetsToDelete = (item.asset_images || []).filter((asset) => {
        const url = typeof asset === "string" ? asset : asset.url;
        const assetId =
          typeof asset === "string" ? null : asset._id?.toString();
        return removeUrls.includes(url) || removeUrls.includes(assetId);
      });

      const deletePromises = assetsToDelete.map((asset) => {
        const url = typeof asset === "string" ? asset : asset.url;
        return fileUploadService.deleteFile({ url }).catch((err) => {
          console.error("Failed to delete asset from cloud:", err);
          return null;
        });
      });
      await Promise.all(deletePromises);

      const updated = await Category.findByIdAndUpdate(
        id,
        {
          $pull: {
            asset_images: {
              $or: [
                { url: { $in: removeUrls } },
                {
                  _id: {
                    $in: removeUrls
                      .filter((id) => mongoose.Types.ObjectId.isValid(id))
                      .map((id) => new mongoose.Types.ObjectId(id)),
                  },
                },
              ],
            },
          },
        },
        { new: true }
      ).lean();

      return apiResponse({
        res,
        status: true,
        statusCode: StatusCodes.OK,
        message: `${assetsToDelete.length} asset image(s) removed successfully`,
        data: {
          ...updated,
          asset_images: normalizeAssets(updated.asset_images || []),
        },
      });
    }

    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message:
        "Please provide either file uploads (asset_images), addUrl, removeUrl, or removeUrls (array)",
    });
  } catch (error) {
    console.error("manageCategoryAssets error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to manage asset images",
    });
  }
};

// Update Asset Image
const updateAssetImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { assetId, url, isPremium, imageCount, imagecount, prompt } =
      req.body || {};
      console.log("req.body", req.body);  

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid category id",
      });
    }

    if (!assetId && !url) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Either assetId or url is required to identify the asset",
      });
    }

    if (
      isPremium === undefined &&
      imageCount === undefined &&
      imagecount === undefined &&
      prompt === undefined
    ) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message:
          "At least one of isPremium, imageCount, or prompt must be provided",
      });
    }

    const item = await Category.findById(id);
    if (!item) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Category not found",
      });
    }

    let assetToUpdate = null;
    if (assetId) {
      assetToUpdate = (item.asset_images || []).find((asset) => {
        if (typeof asset === "string") return false;
        return (
          asset._id?.toString() === assetId ||
          asset._id?.toString() === String(assetId)
        );
      });
    } else if (url) {
      assetToUpdate = (item.asset_images || []).find((asset) => {
        if (typeof asset === "string") return asset === url;
        return asset.url === url;
      });
    }

    if (!assetToUpdate) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Asset not found in this category",
      });
    }

    const updateSet = {};

    if (isPremium !== undefined) {
      const finalIsPremium =
        typeof isPremium === "string"
          ? isPremium.toLowerCase() === "true" || isPremium === "1"
          : Boolean(isPremium);
      updateSet["asset_images.$[asset].isPremium"] = finalIsPremium;
    }

    const finalImageCount =
      imageCount !== undefined
        ? Number(imageCount) || 1
        : imagecount !== undefined
        ? Number(imagecount) || 1
        : undefined;

    if (finalImageCount !== undefined) {
      updateSet["asset_images.$[asset].imageCount"] = finalImageCount;
    }

    if (prompt !== undefined) {
      updateSet["asset_images.$[asset].prompt"] = String(prompt).trim();
    }

    const assetIdentifier = assetId
      ? { "asset._id": new mongoose.Types.ObjectId(assetId) }
      : { "asset.url": url };

    const updated = await Category.findOneAndUpdate(
      { _id: id },
      { $set: updateSet },
      {
        arrayFilters: [assetIdentifier],
        new: true,
      }
    ).lean();

    if (!updated) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Asset not found or could not be updated",
      });
    }

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Asset updated successfully",
      data: {
        ...updated,
        asset_images: normalizeAssets(updated.asset_images || []),
      },
    });
  } catch (error) {
    console.error("updateAssetImage error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to update asset",
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
  uploadAssetImages,
  getCategoryAssets,
  deleteAssetImage,
  manageCategoryAssets,
  updateAssetImage,
};
