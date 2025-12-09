import { StatusCodes } from "http-status-codes";
import Subcategory from "../models/Subcategory.js";
import { apiResponse } from "../helper/api-response.helper.js";
import mongoose from "mongoose";

// Get AI Photo subcategories (Client side - sorted by aiWorldOrder)
export const getAiPhotoSubcategories = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;

    const pageNum = Number(page);
    const lim = Number(limit);
    const skip = (pageNum - 1) * lim;

    // Filter only subcategories that are in AI Photo
    const filter = { isAiWorld: true };

    // Sort by aiWorldOrder (ascending), then by createdAt
    const sort = { aiWorldOrder: 1 };

    const [items, totalItems] = await Promise.all([
      Subcategory.find(filter).sort(sort).skip(skip).limit(lim).lean(),
      Subcategory.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / lim);

    // Transform each subcategory to have name, photos array, selectImage, and isPremium
    const formattedData = items.map((item) => {
      // Get asset_images for this subcategory (filter out empty strings)
      const photos = [];
      if (
        item.asset_images &&
        Array.isArray(item.asset_images) &&
        item.asset_images.length > 0
      ) {
        const validImages = item.asset_images.filter(
          (img) => img && img.trim() !== ""
        );
        photos.push(...validImages);
      }

      return {
        _id: item._id,
        name: item.subcategoryTitle || "",
        photos: photos,
        selectImage:
          item.selectImage !== undefined && item.selectImage !== null
            ? item.selectImage
            : 1,
        isPremium: item.isPremium !== undefined ? item.isPremium : false,
        categoryId: item.categoryId,
        img_sqr: item.img_sqr || "",
        img_rec: item.img_rec || "",
        video_sqr: item.video_sqr || "",
        video_rec: item.video_rec || "",
        status: item.status,
        order: item.order,
        isAiWorld: item.isAiWorld,
        aiWorldOrder: item.aiWorldOrder,
      };
    });

    // Return response with array of subcategories
    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "AI Photo subcategories fetched successfully",
      data: formattedData,
      pagination: {
        page: pageNum,
        limit: lim,
        total: totalItems,
        totalPages,
      },
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
    const { isAiWorld } = req.body;

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

    // If isAiWorld is not provided, toggle the current status
    // If provided, use the provided value
    const newAiWorldStatus =
      typeof isAiWorld === "boolean" ? isAiWorld : !subcategory.isAiWorld;

    // Only update isAiWorld status, don't change any order
    const updateData = { isAiWorld: newAiWorldStatus };

    const updated = await Subcategory.findByIdAndUpdate(id, updateData, {
      new: true,
    }).lean();

    // Ensure selectImage and isPremium fields exist with default values
    const updatedWithDefaults = {
      ...updated,
      selectImage:
        updated.selectImage !== undefined && updated.selectImage !== null
          ? updated.selectImage
          : 1,
      isPremium: updated.isPremium !== undefined ? updated.isPremium : false,
    };

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: newAiWorldStatus
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

    const ops = payload
      .map((p) => {
        if (!p.id || typeof p.aiWorldOrder === "undefined") return null;

        if (!mongoose.Types.ObjectId.isValid(p.id)) return null;

        // Ensure order is at least 1
        const order = Math.max(1, Number(p.aiWorldOrder));

        return {
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(p.id) },
            update: {
              $set: {
                aiWorldOrder: order,
                isAiWorld: true, // Ensure it's marked as AI Photo
              },
            },
          },
        };
      })
      .filter(Boolean);

    if (ops.length === 0) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "No valid items found",
      });
    }

    await Subcategory.bulkWrite(ops);

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "AI Photo subcategories reordered successfully",
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
    const { categoryId, page = 1, limit = 10 } = req.query;

    const pageNum = Number(page);
    const lim = Number(limit);
    const skip = (pageNum - 1) * lim;

    const filter = {
      status: true, // Only show subcategories with status: true
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

    // Get all subcategories, sorted by aiWorldOrder (for AI Photo selection)
    const sort = { aiWorldOrder: 1, createdAt: -1 };

    const [items, totalItems] = await Promise.all([
      Subcategory.find(filter).sort(sort).skip(skip).limit(lim).lean(),
      Subcategory.countDocuments(filter),
    ]);

    // Ensure selectImage and isPremium fields exist with default values for all subcategories
    const itemsWithDefaults = items.map((subcategory) => ({
      ...subcategory,
      selectImage:
        subcategory.selectImage !== undefined &&
        subcategory.selectImage !== null
          ? subcategory.selectImage
          : 1,
      isPremium:
        subcategory.isPremium !== undefined ? subcategory.isPremium : false,
    }));

    const totalPages = Math.ceil(totalItems / lim);

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategories fetched successfully",
      data: itemsWithDefaults,
      pagination: {
        page: pageNum,
        limit: lim,
        total: totalItems,
        totalPages,
      },
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
