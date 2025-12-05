import { StatusCodes } from "http-status-codes";
import Subcategory from "../models/Subcategory.js";
import fileUploadService from "../services/file.upload.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import mongoose from "mongoose";


const processMediaUploads = async (req) => {
  const uploaded = {};

  const uploadFields = ["img_sqr", "img_rec", "video_sqr", "video_rec"];

  for (const field of uploadFields) {
    if (req.files && req.files[field] && req.files[field][0]) {
  
      const file = req.files[field][0];
      const fileUrl = await fileUploadService.uploadFile({
        ...file,
        folder: "subcategory"
      });
      uploaded[field] = fileUrl;
    }
  }

  // Process asset_images separately (can be multiple files)
  if (req.files && req.files.asset_images && Array.isArray(req.files.asset_images)) {
    const assetUrls = [];
    for (const file of req.files.asset_images) {
      const fileUrl = await fileUploadService.uploadFile({
        buffer: file.buffer,
        mimetype: file.mimetype,
        folder: "subcategory/assets"
      });
      assetUrls.push(fileUrl);
    }
    if (assetUrls.length > 0) {
      uploaded.asset_images = assetUrls;
    }
  }

  return uploaded;
};

// Create
export const createSubcategory = async (req, res) => {
  try {
    const payload = req.body || {};

    // Upload files if present
    const mediaUploads = await processMediaUploads(req);

    // Merge uploaded URLs into payload
    const finalPayload = {
      ...payload,
      ...mediaUploads,
    };

    // Check uniqueness
    const exists = await Subcategory.findOne({
      categoryId: finalPayload.categoryId,
      subcategoryTitle: finalPayload.subcategoryTitle,
    });

    if (exists) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.CONFLICT,
        message: "Subcategory title already exists for this category.",
      });
    }

    // Build the data object without `order` when it's not provided so Mongoose
    // doesn't apply the schema default (0) before we compute the correct next order.
    const subcategoryData = {
      categoryId: finalPayload.categoryId,
      subcategoryTitle: finalPayload.subcategoryTitle,
      img_sqr: finalPayload.img_sqr || "",
      img_rec: finalPayload.img_rec || "",
      video_sqr: finalPayload.video_sqr || "",
      video_rec: finalPayload.video_rec || "",
      asset_images: finalPayload.asset_images || [], // Include asset_images array
      status:
        typeof finalPayload.status === "boolean"
          ? finalPayload.status
          : true,
    };

    const subcategory = new Subcategory(subcategoryData);

    // Always compute order if not explicitly provided in request
    // Check if order is a valid number (not string, not null, not undefined)
    const providedOrder = finalPayload.order;
    const isValidOrder = typeof providedOrder === "number" && !isNaN(providedOrder) && providedOrder >= 1;
    
    if (!isValidOrder) {
      try {
        // GLOBAL ORDER: Find max order across ALL subcategories (not per category)
        const [aggResult] = await Subcategory.aggregate([
          {
            $group: {
              _id: null,
              totalCount: { $sum: 1 },
              maxOrder: { $max: "$order" }
            }
          }
        ]);

        const totalCount = aggResult?.totalCount || 0;
        const maxOrder = aggResult?.maxOrder || null;

        // Calculate next order (global sequential: 1, 2, 3, 4...)
        let nextOrder = 1;
        if (maxOrder !== null && typeof maxOrder === "number" && maxOrder >= 1) {
          // Use max order + 1 if valid order exists
          nextOrder = maxOrder + 1;
        } else {
          // If no valid order exists, use total count + 1
          nextOrder = totalCount > 0 ? totalCount + 1 : 1;
        }

        subcategory.order = nextOrder;

        console.log(`[Order Calculation - GLOBAL] Max Order: ${maxOrder || 'none'}, Total Count: ${totalCount}, New Order: ${nextOrder}`);
      } catch (err) {
        console.error("Error computing order:", err);
        // Fallback: count ALL existing subcategories and add 1
        try {
          const count = await Subcategory.countDocuments({});
          subcategory.order = count + 1;
          console.log(`[Order Fallback - GLOBAL] Count: ${count}, New Order: ${count + 1}`);
        } catch (countErr) {
          console.error("Error in fallback order calculation:", countErr);
          subcategory.order = 1;
        }
      }
    } else {
      // Use the order provided in request
      subcategory.order = finalPayload.order;
    }

    // Handle isAiPhoto if provided
    if (typeof finalPayload.isAiPhoto === "boolean") {
      subcategory.isAiPhoto = finalPayload.isAiPhoto;
    } else {
      subcategory.isAiPhoto = false;
    }

    // ALWAYS calculate aiPhotoOrder for ALL subcategories (regardless of isAiPhoto)
    const providedAiPhotoOrder = finalPayload.aiPhotoOrder;
    const isValidAiPhotoOrder = typeof providedAiPhotoOrder === "number" && !isNaN(providedAiPhotoOrder) && providedAiPhotoOrder >= 1;
    
    // Only calculate if not explicitly provided
    if (!isValidAiPhotoOrder) {
      try {
        // Use aggregation to get both count and max aiPhotoOrder from ALL subcategories
        const [aggResult] = await Subcategory.aggregate([
          {
            $group: {
              _id: null,
              totalCount: { $sum: 1 },
              maxOrder: { $max: "$aiPhotoOrder" }
            }
          }
        ]);

        const totalCount = aggResult?.totalCount || 0;
        const maxOrder = aggResult?.maxOrder || null;

        // Calculate next aiPhotoOrder (sequential: 1, 2, 3, 4...)
        let nextAiPhotoOrder = 1;
        if (maxOrder !== null && typeof maxOrder === "number" && maxOrder >= 1) {
          // Use max order + 1 if valid order exists
          nextAiPhotoOrder = maxOrder + 1;
        } else {
          // If no valid order exists, use total count + 1
          nextAiPhotoOrder = totalCount > 0 ? totalCount + 1 : 1;
        }

        subcategory.aiPhotoOrder = nextAiPhotoOrder;
        console.log(`[AI Photo Order Calculation - CREATE] Max Order: ${maxOrder || 'none'}, Total Count: ${totalCount}, New Order: ${nextAiPhotoOrder}`);
      } catch (err) {
        console.error("Error computing aiPhotoOrder:", err);
        // Fallback: count ALL existing subcategories and add 1
        try {
          const count = await Subcategory.countDocuments({});
          subcategory.aiPhotoOrder = count + 1;
          console.log(`[AI Photo Order Fallback - CREATE] Count: ${count}, New Order: ${count + 1}`);
        } catch (countErr) {
          console.error("Error in fallback aiPhotoOrder calculation:", countErr);
          subcategory.aiPhotoOrder = 1;
        }
      }
    } else {
      // Use the aiPhotoOrder provided in request (user explicitly set it)
      subcategory.aiPhotoOrder = providedAiPhotoOrder;
      console.log(`[AI Photo Order - CREATE] Using provided order: ${providedAiPhotoOrder}`);
    }

    await subcategory.save();

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.CREATED,
      message: "Subcategory created successfully",
      data: subcategory,
    });
  } catch (error) {
    console.error("createSubcategory error:", error);
    if (error && error.code === 11000) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.CONFLICT,
        message: "Subcategory already exists for this category.",
      });
    }

    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to create subcategory",
    });
  }
};

// Read all
export const getAllSubcategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, categoryId, status } = req.query;

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

    if (typeof status !== "undefined") {
      filter.status = status === "true" || status === true;
    }

    const pageNum = Number(page);
    const lim = Number(limit);
    const skip = (pageNum - 1) * lim;

    // Sort by order in ascending order (1, 2, 3, 4...)
    // Items with valid order (>= 1) come first, then items without order
    // Use aggregation to handle null orders properly
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          // Add a field to help sort: 0 for items with order >= 1, 1 for null/0/undefined
          orderSort: {
            $cond: [
              { $and: [{ $ne: ["$order", null] }, { $gte: ["$order", 1] }] },
              0, // Valid order
              1  // Invalid/null order
            ]
          }
        }
      },
      { $sort: { orderSort: 1, order: 1, createdAt: -1 } },
      {
        $facet: {
          items: [
            { $skip: skip }, 
            { $limit: lim }, 
            { $project: { orderSort: 0 } } // Remove temporary sort field
          ],
          total: [{ $count: "count" }]
        }
      }
    ];

    const [result] = await Subcategory.aggregate(pipeline);
    const items = result.items || [];
    const totalItems = result.total[0]?.count || 0;

    const totalPages = Math.ceil(totalItems / lim);

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategories fetched successfully",
      data: items,
      pagination: { page: pageNum, totalPages, totalItems, limit: lim },
    });
  } catch (error) {
    console.error("getAllSubcategories error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to fetch subcategories",
    });
  }
};

// Read single
export const getSubcategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    const item = await Subcategory.findById(id).lean();

    if (!item) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategory fetched successfully",
      data: item,
    });
  } catch (error) {
    console.error("getSubcategoryById error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to fetch subcategory",
    });
  }
};

// Update
export const updateSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    const existing = await Subcategory.findById(id);
    if (!existing) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

    // Upload new media
    const mediaUploads = await processMediaUploads(req);
    
    // Separate asset_images from other fields
    const { asset_images, ...otherUploads } = mediaUploads;
    const finalPayload = { ...payload, ...otherUploads };

    // Delete old media if new uploaded
    const mediaFields = ["img_sqr", "img_rec", "video_sqr", "video_rec"];
    for (const f of mediaFields) {
      if (mediaUploads[f] && existing[f]) {
        try {
          await fileUploadService.deleteFile({ url: existing[f] });
        } catch (err) {
          console.error(`Failed to delete old file for ${f}:`, err);
        }
      }
    }

    // Handle isAiPhoto if provided
    if (typeof finalPayload.isAiPhoto === "boolean") {
      // isAiPhoto will be updated via finalPayload
    }

    // ALWAYS calculate aiPhotoOrder for ALL subcategories (regardless of isAiPhoto)
    // Only calculate if not explicitly provided in request
    const providedAiPhotoOrder = finalPayload.aiPhotoOrder;
    const isValidAiPhotoOrder = typeof providedAiPhotoOrder === "number" && !isNaN(providedAiPhotoOrder) && providedAiPhotoOrder >= 1;
    
    if (!isValidAiPhotoOrder) {
      // Only update if current value is 0/null or doesn't exist
      if (!existing.aiPhotoOrder || existing.aiPhotoOrder < 1) {
        try {
          // Use aggregation to get both count and max aiPhotoOrder from ALL subcategories
          const [aggResult] = await Subcategory.aggregate([
            { $match: { _id: { $ne: existing._id } } }, // Exclude current item
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                maxOrder: { $max: "$aiPhotoOrder" }
              }
            }
          ]);

          const totalCount = aggResult?.totalCount || 0;
          const maxOrder = aggResult?.maxOrder || null;

          // Calculate next aiPhotoOrder (sequential: 1, 2, 3, 4...)
          let nextAiPhotoOrder = 1;
          if (maxOrder !== null && typeof maxOrder === "number" && maxOrder >= 1) {
            // Use max order + 1 if valid order exists
            nextAiPhotoOrder = maxOrder + 1;
          } else {
            // If no valid order exists, use total count + 1
            nextAiPhotoOrder = totalCount > 0 ? totalCount + 1 : 1;
          }

          finalPayload.aiPhotoOrder = nextAiPhotoOrder;
          console.log(`[AI Photo Order Calculation - UPDATE] Max Order: ${maxOrder || 'none'}, Total Count: ${totalCount}, New Order: ${nextAiPhotoOrder}`);
        } catch (err) {
          console.error("Error computing aiPhotoOrder in update:", err);
          // Fallback: count ALL existing subcategories (excluding current)
          try {
            const count = await Subcategory.countDocuments({ _id: { $ne: id } });
            finalPayload.aiPhotoOrder = count + 1;
            console.log(`[AI Photo Order Fallback - UPDATE] Count: ${count}, New Order: ${count + 1}`);
          } catch (countErr) {
            console.error("Error in fallback aiPhotoOrder calculation:", countErr);
            finalPayload.aiPhotoOrder = 1;
          }
        }
      }
      // If existing order is valid (>= 1), keep it
    } else {
      // Use the aiPhotoOrder provided in request
      finalPayload.aiPhotoOrder = providedAiPhotoOrder;
      console.log(`[AI Photo Order - UPDATE] Using provided order: ${providedAiPhotoOrder}`);
    }

    // Build update object
    const updateObj = { $set: finalPayload };
    
    // If asset_images were uploaded, add them to the array (prevent duplicates)
    if (asset_images && Array.isArray(asset_images) && asset_images.length > 0) {
      updateObj.$addToSet = { asset_images: { $each: asset_images } };
    }

    const updated = await Subcategory.findByIdAndUpdate(
      id,
      updateObj,
      { new: true }
    );

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategory updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("updateSubcategory error:", error);
    if (error.code === 11000) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.CONFLICT,
        message: "Subcategory already exists for this category.",
      });
    }

    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to update subcategory",
    });
  }
};

// Delete
// Delete
export const deleteSubcategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Safety check: If this is an assets route, it should not reach here
    if (req.path && (req.path.includes('/assets') || req.originalUrl.includes('/assets'))) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid route. Use DELETE /:id/assets/delete to delete asset images, not the entire subcategory.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    const item = await Subcategory.findById(id);
    if (!item) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

    // delete media
    const mediaFields = ["img_sqr", "img_rec", "video_sqr", "video_rec"];
    for (const f of mediaFields) {
      if (item[f]) {
        try {
          await fileUploadService.deleteFile({ url: item[f] });
        } catch (err) {
          console.error(`Failed to delete ${f}:`, err);
        }
      }
    }

    // Delete asset images from cloud storage
    if (item.asset_images && item.asset_images.length > 0) {
      for (const assetUrl of item.asset_images) {
        try {
          await fileUploadService.deleteFile({ url: assetUrl });
        } catch (err) {
          console.error(`Failed to delete asset image ${assetUrl}:`, err);
        }
      }
    }

    await item.deleteOne();

    // Auto-reorder: fetch ALL remaining items globally, sort by current order, reassign 1, 2, 3...
    try {
      // Get ALL remaining items globally, sort by order (ascending: 1, 2, 3...)
      const remaining = await Subcategory.find({})
        .sort({ order: 1, createdAt: 1 })
        .select("_id order")
        .lean();

      // Reassign orders starting from 1 (global sequential ordering)
      for (let i = 0; i < remaining.length; i++) {
        await Subcategory.findByIdAndUpdate(remaining[i]._id, { order: i + 1 });
      }
    } catch (err) {
      console.error("Error reordering after delete:", err);
      // Don't fail the delete response, just log the error
    }

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategory deleted successfully and remaining items reordered",
      data: null,
    });

  } catch (error) {
    console.error("deleteSubcategory error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to delete subcategory",
    });
  }
};


// Toggle status
export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    const updated = await Subcategory.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Status updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("toggleStatus error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to update status",
    });
  }
};

// Batch order update

// Batch order update
export const updateOrderBatch = async (req, res) => {
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
        if (!p.id || typeof p.order === "undefined") return null;

        if (!mongoose.Types.ObjectId.isValid(p.id)) return null;

        // Ensure order is at least 1
        const order = Math.max(1, Number(p.order));

        return {
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(p.id) },
            update: { $set: { order: order } },
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
      message: "Order updated successfully",
    });
  } catch (error) {
    console.error("updateOrderBatch error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to update order",
    });
  }
};

// Upload Asset Images (POST with file uploads)
export const uploadAssetImages = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    const item = await Subcategory.findById(id);
    if (!item) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

    // Process uploaded asset_images files
    const uploadedUrls = [];
    
    if (req.files && req.files.asset_images && Array.isArray(req.files.asset_images)) {
      for (const file of req.files.asset_images) {
        try {
          const fileUrl = await fileUploadService.uploadFile({
            buffer: file.buffer,
            mimetype: file.mimetype,
            folder: "subcategory/assets"
          });
          uploadedUrls.push(fileUrl);
        } catch (err) {
          console.error("Error uploading asset image:", err);
        }
      }
    }

    if (uploadedUrls.length === 0) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "No files were uploaded",
      });
    }

    // Add uploaded URLs to asset_images array (prevent duplicates using $addToSet)
    const updated = await Subcategory.findByIdAndUpdate(
      id,
      { $addToSet: { asset_images: { $each: uploadedUrls } } },
      { new: true }
    );

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: `${uploadedUrls.length} asset image(s) uploaded successfully`,
      data: updated,
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

// Delete Single Asset Image
export const deleteAssetImage = async (req, res) => {
  try {
    const { id } = req.params;
    // Accept URL from either query parameter or request body
    const url = req.query.url || req.body.url;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    if (!url) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "URL is required. Provide it in request body: { \"url\": \"<url>\" }",
      });
    }

    // Decode the URL if it's from query parameter (already decoded if from body)
    const decodedUrl = req.query.url ? decodeURIComponent(url) : url;

    const item = await Subcategory.findById(id);
    if (!item) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

    // Check if the URL exists in asset_images array
    if (!item.asset_images || !item.asset_images.includes(decodedUrl)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Asset image not found in this subcategory",
      });
    }

    // Delete the file from cloud storage
    try {
      await fileUploadService.deleteFile({ url: decodedUrl });
    } catch (err) {
      console.error(`Failed to delete asset image from cloud: ${decodedUrl}`, err);
      // Continue with DB removal even if cloud deletion fails
    }

    // Remove URL from asset_images array
    const updated = await Subcategory.findByIdAndUpdate(
      id,
      { $pull: { asset_images: decodedUrl } },
      { new: true }
    );

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Asset image deleted successfully",
      data: updated,
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

// Manage Asset Images (add or remove URLs from asset_images array)
export const manageSubcategoryAssets = async (req, res) => {
  try {
    const { id } = req.params;
    const { addUrl, removeUrl, removeUrls } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    const item = await Subcategory.findById(id);
    if (!item) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

    let updated;

    if (addUrl) {
      // Add URL to asset_images array (prevent duplicates using $addToSet)
      updated = await Subcategory.findByIdAndUpdate(
        id,
        { $addToSet: { asset_images: addUrl } },
        { new: true }
      );

      return apiResponse({
        res,
        status: true,
        statusCode: StatusCodes.OK,
        message: "Asset image added successfully",
        data: updated,
      });
    }

    // Handle single URL removal
    if (removeUrl) {
      // First, delete the file from cloud storage
      try {
        await fileUploadService.deleteFile({ url: removeUrl });
      } catch (err) {
        console.error(`Failed to delete asset image from cloud: ${removeUrl}`, err);
        // Continue with DB removal even if cloud deletion fails
      }

      // Remove URL from asset_images array
      updated = await Subcategory.findByIdAndUpdate(
        id,
        { $pull: { asset_images: removeUrl } },
        { new: true }
      );

      return apiResponse({
        res,
        status: true,
        statusCode: StatusCodes.OK,
        message: "Asset image removed successfully",
        data: updated,
      });
    }

    // Handle multiple URLs removal
    if (removeUrls && Array.isArray(removeUrls) && removeUrls.length > 0) {
      // Delete files from cloud storage
      const deletePromises = removeUrls.map(url => 
        fileUploadService.deleteFile({ url }).catch(err => {
          console.error(`Failed to delete asset image from cloud: ${url}`, err);
          return null; // Continue even if deletion fails
        })
      );
      await Promise.all(deletePromises);

      // Remove all URLs from asset_images array
      updated = await Subcategory.findByIdAndUpdate(
        id,
        { $pull: { asset_images: { $in: removeUrls } } },
        { new: true }
      );

      return apiResponse({
        res,
        status: true,
        statusCode: StatusCodes.OK,
        message: `${removeUrls.length} asset image(s) removed successfully`,
        data: updated,
      });
    }

    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.BAD_REQUEST,
      message: "Please provide either addUrl, removeUrl, or removeUrls (array)",
    });
  } catch (error) {
    console.error("manageSubcategoryAssets error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to manage asset images",
    });
  }
};

export default {
  createSubcategory,
  getAllSubcategories,
  getSubcategoryById,
  updateSubcategory,
  deleteSubcategory,
  toggleStatus,
  updateOrderBatch,
  uploadAssetImages,
  deleteAssetImage,
  manageSubcategoryAssets,
};

