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
    const sort = { aiWorldOrder: 1, createdAt: -1 };

    const [items, totalItems] = await Promise.all([
      Subcategory.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(lim)
        .lean(),
      Subcategory.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / lim);

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "AI Photo subcategories fetched successfully",
      data: items,
      pagination: { 
        page: pageNum, 
        limit: lim,
        total: totalItems,
        totalPages 
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

    if (typeof isAiWorld !== "boolean") {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "isAiWorld must be a boolean value",
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

    let updateData = { isAiWorld };

    // If adding to AI Photo, assign order
    if (isAiWorld) {
      // Find max aiWorldOrder
      const maxDoc = await Subcategory.findOne({
        isAiWorld: true,
        aiWorldOrder: { $exists: true, $ne: null, $gte: 1 },
      })
        .sort({ aiWorldOrder: -1 })
        .select("aiWorldOrder")
        .lean();

      // Next order = max + 1, or 1 if no items exist
      const nextOrder = maxDoc && maxDoc.aiWorldOrder ? maxDoc.aiWorldOrder + 1 : 1;
      updateData.aiWorldOrder = nextOrder;
    } else {
      // If removing from AI Photo, reset order to 0
      updateData.aiWorldOrder = 0;

      // Reorder remaining items
      try {
        const remaining = await Subcategory.find({
          isAiWorld: true,
          _id: { $ne: id },
        })
          .sort({ aiWorldOrder: 1, createdAt: 1 })
          .select("_id aiWorldOrder")
          .lean();

        // Reassign orders starting from 1
        for (let i = 0; i < remaining.length; i++) {
          await Subcategory.findByIdAndUpdate(remaining[i]._id, {
            aiWorldOrder: i + 1,
          });
        }
      } catch (err) {
        console.error("Error reordering AI Photo items:", err);
      }
    }

    const updated = await Subcategory.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: isAiWorld
        ? "Subcategory added to AI Photo successfully"
        : "Subcategory removed from AI Photo successfully",
      data: updated,
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

    const filter = {};

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

    // Get all subcategories, sorted by category and order
    const sort = { categoryId: 1, order: 1, createdAt: -1 };

    const [items, totalItems] = await Promise.all([
      Subcategory.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(lim)
        .lean(),
      Subcategory.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / lim);

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategories fetched successfully",
      data: items,
      pagination: {
        page: pageNum,
        limit: lim,
        total: totalItems,
        totalPages
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

