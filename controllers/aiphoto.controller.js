import { StatusCodes } from "http-status-codes";
import Subcategory from "../models/subcategory.js";
import { apiResponse } from "../helper/api-response.helper.js";
import mongoose from "mongoose";

// Get AI Photo subcategories (Client side - sorted by aiPhotoOrder)
export const getAiPhotoSubcategories = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;

    const pageNum = Number(page);
    const lim = Number(limit);
    const skip = (pageNum - 1) * lim;

    // Filter only AI Photo subcategories with valid orders
    const filter = {
      isAiPhoto: true,
      aiPhotoOrder: { $gte: 1 }, // Only items with valid order (>= 1)
    };

    // Sort by aiPhotoOrder (ascending), then by createdAt for items with same order
    const sort = { aiPhotoOrder: 1, createdAt: 1 };

    const [items, totalItems] = await Promise.all([
      Subcategory.find(filter).sort(sort).skip(skip).limit(lim).lean(),
      Subcategory.countDocuments(filter),
    ]);

    console.log(`[AI Photo API] Total subcategories found: ${totalItems}`);
    console.log(`[AI Photo API] Items fetched: ${items.length}`);
    if (items.length > 0) {
      console.log(`[AI Photo API] First item sample:`, {
        _id: items[0]._id,
        subcategoryTitle: items[0].subcategoryTitle,
        img_sqr: items[0].img_sqr,
        img_rec: items[0].img_rec,
        asset_images: items[0].asset_images,
      });
    }

    // Transform each subcategory to have name, photos array (with new structure), imageCount, and isPremium
    const formattedData = items.map((item) => {
      // Get asset_images for this subcategory and normalize to new structure
      const photos = [];
      if (
        item.asset_images &&
        Array.isArray(item.asset_images) &&
        item.asset_images.length > 0
      ) {
        // Normalize to new structure (handle legacy string format)
        const validImages = item.asset_images
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
        photos.push(...validImages);
      }

      return {
        _id: item._id,
        name: item.subcategoryTitle || "",
        photos: photos, // Now contains objects with _id, url, isPremium, imageCount
        imageCount:
          item.imageCount !== undefined && item.imageCount !== null
            ? item.imageCount
            : 1,
        isPremium: item.isPremium !== undefined ? item.isPremium : false,
        categoryId: item.categoryId,
        img_sqr: item.img_sqr || "",
        img_rec: item.img_rec || "",
        video_sqr: item.video_sqr || "",
        video_rec: item.video_rec || "",
        status: item.status,
        order: item.order,
        isAiPhoto: item.isAiPhoto,
        aiPhotoOrder: item.aiPhotoOrder,
      };
    });

    // Return response with array of subcategories
    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "AI Photos fetched successfully",
      data: formattedData,
    });
  } catch (error) {
    console.error("getAiPhotoSubcategories error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: error.message || "Failed to fetch AI Photo subcategories",
    });
  }
};

// Toggle subcategory AI Photo status (Admin only)
export const toggleSubcategoryAiPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAiPhoto } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    const subcategory = await Subcategory.findById(id);
    if (!subcategory) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

    // If isAiPhoto is not provided, toggle the current state
    // If provided, use the provided value
    const newAiPhotoStatus =
      typeof isAiPhoto === "boolean" ? isAiPhoto : !subcategory.isAiPhoto;

    // Preserve existing aiPhotoOrder when toggling; ordering should only change via drag-and-drop reorder API
    const updateData = { isAiPhoto: newAiPhotoStatus };

    const updated = await Subcategory.findByIdAndUpdate(id, updateData, {
      new: true,
    }).lean();

    // Ensure imageCount and isPremium fields exist with default values
    const updatedWithDefaults = {
      ...updated,
      imageCount:
        updated.imageCount !== undefined && updated.imageCount !== null
          ? updated.imageCount
          : 1,
      isPremium: updated.isPremium !== undefined ? updated.isPremium : false,
    };

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: newAiPhotoStatus
        ? "AI Photo activated successfully"
        : "AI Photo deactivated successfully",
      data: updatedWithDefaults,
    });
  } catch (error) {
    console.error("toggleSubcategoryAiPhoto error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to toggle subcategory AI Photo status",
    });
  }
};

// Bulk reorder AI Photo subcategories (Admin only)
// Allows reordering ANY subcategory regardless of isAiPhoto status
// Handles position conflicts by automatically shifting other subcategories
// Ensures sequential ordering starting from 1 with no duplicates
export const reorderAiPhotoSubcategories = async (req, res) => {
  try {
    const payload = req.body;

    if (!Array.isArray(payload) || payload.length === 0) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Request body must be a non-empty array",
      });
    }

    // Validate all IDs before processing
    const invalidIds = payload.filter(
      (item) => !item.id || !mongoose.Types.ObjectId.isValid(item.id)
    );
    if (invalidIds.length > 0) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory ID format provided",
      });
    }

    // Get ALL subcategories (not just isAiPhoto: true) to handle all aiPhotoOrder values
    // This allows reordering any subcategory regardless of isAiPhoto status
    const allSubcategories = await Subcategory.find({})
      .select({ _id: 1, aiPhotoOrder: 1 })
      .sort({ aiPhotoOrder: 1, createdAt: 1 })
      .lean();

    // Create a map of subcategory IDs to their new aiPhoto orders from request
    const newAiPhotoOrderMap = new Map();
    payload.forEach((item) => {
      if (item.id && typeof item.aiPhotoOrder !== "undefined") {
        newAiPhotoOrderMap.set(
          item.id.toString(),
          Math.max(1, Number(item.aiPhotoOrder))
        );
      }
    });

    // Separate subcategories into reordered and unchanged
    const reorderedSubcategories = [];
    const unchangedSubcategories = [];

    allSubcategories.forEach((subcat) => {
      const subcatId = subcat._id.toString();
      if (newAiPhotoOrderMap.has(subcatId)) {
        reorderedSubcategories.push({
          _id: subcat._id,
          oldAiPhotoOrder: subcat.aiPhotoOrder || 0,
          newAiPhotoOrder: newAiPhotoOrderMap.get(subcatId),
        });
      } else {
        unchangedSubcategories.push({
          _id: subcat._id,
          aiPhotoOrder: subcat.aiPhotoOrder || 0,
        });
      }
    });

    // Sort reordered subcategories by their desired new order
    reorderedSubcategories.sort(
      (a, b) => a.newAiPhotoOrder - b.newAiPhotoOrder
    );

    // Build final order assignment for ALL subcategories
    // This ensures no duplicates and proper sequential ordering (1, 2, 3, 4...)
    const finalOrders = new Map();
    let currentOrder = 1;

    // Process reordered subcategories first (they get priority at their desired positions)
    // Assign sequential orders starting from 1
    reorderedSubcategories.forEach((subcat) => {
      finalOrders.set(subcat._id.toString(), currentOrder);
      currentOrder++;
    });

    // Process unchanged subcategories, maintaining their relative order
    // Sort by current aiPhotoOrder (items with order first, then items without)
    unchangedSubcategories.sort((a, b) => {
      const orderA = a.aiPhotoOrder || 999999;
      const orderB = b.aiPhotoOrder || 999999;
      return orderA - orderB;
    });

    // Assign sequential orders to unchanged subcategories, continuing from where reordered items ended
    unchangedSubcategories.forEach((subcat) => {
      finalOrders.set(subcat._id.toString(), currentOrder);
      currentOrder++;
    });

    // Build bulk operations to update ALL subcategories (no isAiPhoto filter)
    // Only update aiPhotoOrder - DO NOT modify the 'order' field or isAiPhoto status
    const bulkOps = Array.from(finalOrders.entries()).map(
      ([id, aiPhotoOrderValue]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(id) }, // No isAiPhoto filter - update any subcategory
          update: {
            $set: {
              aiPhotoOrder: aiPhotoOrderValue, // Only update aiPhotoOrder, not 'order' field
              updatedAt: new Date(),
            },
          },
        },
      })
    );

    // Use ordered: false for faster parallel execution
    const result = await Subcategory.bulkWrite(bulkOps, {
      ordered: false,
    });

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "AI Photo subcategories reordered successfully",
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
    });
  } catch (error) {
    console.error("reorderAiPhotoSubcategories error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to reorder AI Photo subcategories",
    });
  }
};

// Get all subcategories with AI Photo status (for selection)
export const getAllSubcategoriesForAiPhoto = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const filter = {
      status: true, // Only show subcategories with status: true
      // Removed isAiPhoto filter to show ALL subcategories
      // Removed aiPhotoOrder filter to show all subcategories regardless of order
    };

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return apiResponse({
          res,
          status: false,
          message: "Invalid categoryId",
          statusCode: StatusCodes.BAD_REQUEST,
        });
      }
      filter.categoryId = categoryId;
    }

    // Get all subcategories, sorted by aiPhotoOrder (for AI Photo selection)
    // Items with aiPhotoOrder come first, then items without
    // Use aggregation to properly sort: items with aiPhotoOrder first, then items without
    const items = await Subcategory.aggregate([
      { $match: filter },
      {
        $addFields: {
          // Add a field to help sort: 0 for items with aiPhotoOrder >= 1, 1 for null/0/undefined
          aiPhotoOrderSort: {
            $cond: [
              {
                $and: [
                  { $ne: ["$aiPhotoOrder", null] },
                  { $gte: ["$aiPhotoOrder", 1] },
                ],
              },
              0, // Valid aiPhotoOrder
              1, // Invalid/null aiPhotoOrder
            ],
          },
          // Create a sortable order value (use actual aiPhotoOrder or large number for items without order)
          sortAiPhotoOrder: {
            $cond: [
              {
                $and: [
                  { $ne: ["$aiPhotoOrder", null] },
                  { $gte: ["$aiPhotoOrder", 1] },
                ],
              },
              "$aiPhotoOrder", // Use actual aiPhotoOrder value for items with valid order
              999999, // Large number to push items without order to the end
            ],
          },
        },
      },
      // Sort: valid aiPhotoOrders first (by aiPhotoOrder ascending), then items without order (by createdAt ascending)
      { $sort: { aiPhotoOrderSort: 1, sortAiPhotoOrder: 1, createdAt: 1 } },
      // Remove temporary sort fields
      { $project: { aiPhotoOrderSort: 0, sortAiPhotoOrder: 0 } },
    ]);

    // Ensure imageCount and isPremium fields exist with default values and normalize asset_images
    const itemsWithDefaults = items.map((subcategory) => {
      // Normalize asset_images to new structure (handle legacy string format)
      const normalizedAssets = (subcategory.asset_images || [])
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
            isPremium: asset.isPremium !== undefined ? asset.isPremium : false,
            imageCount: asset.imageCount !== undefined ? asset.imageCount : 1,
          };
        })
        .filter((asset) => asset.url && asset.url.trim() !== "");

      return {
        ...subcategory,
        asset_images: normalizedAssets, // Normalized to new structure
        imageCount:
          subcategory.imageCount !== undefined &&
          subcategory.imageCount !== null
            ? subcategory.imageCount
            : 1,
        isPremium:
          subcategory.isPremium !== undefined ? subcategory.isPremium : false,
      };
    });

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategories fetched successfully",
      data: itemsWithDefaults,
    });
  } catch (error) {
    console.error("getAllSubcategoriesForAiPhoto error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: error.message || "Failed to fetch subcategories",
    });
  }
};

export default {
  getAiPhotoSubcategories,
  toggleSubcategoryAiPhoto,
  reorderAiPhotoSubcategories,
  getAllSubcategoriesForAiPhoto,
};
