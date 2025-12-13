import { StatusCodes } from "http-status-codes";
import Subcategory from "../models/subcategory.js";
import fileUploadService from "../services/file.upload.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import mongoose from "mongoose";
import commonHelper from "../helper/common.helper.js";

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

// Normalize subcategory response - ensure all fields are present
const normalizeSubcategory = (subcategory) => {
  const subcatObj = subcategory.toObject ? subcategory.toObject() : subcategory;
  return {
    ...subcatObj,
    asset_images: normalizeAssets(subcatObj.asset_images || []),
    imageCount:
      subcatObj.imageCount !== undefined && subcatObj.imageCount !== null
        ? subcatObj.imageCount
        : 1,
    isPremium: subcatObj.isPremium !== undefined ? subcatObj.isPremium : false,
  };
};

// Process file uploads
const processMediaUploads = async (req) => {
  const uploaded = {};
  const uploadFields = ["img_sqr", "img_rec", "video_sqr", "video_rec"];

  for (const field of uploadFields) {
    if (req.files?.[field]?.[0]) {
      const fileUrl = await fileUploadService.uploadFile({
        ...req.files[field][0],
        folder: "subcategory",
      });
      uploaded[field] = fileUrl;
    }
  }

    // Process asset_images files
    // Note: Assets should have their own imageCount (default 1), not inherit from subcategory
    if (req.files?.asset_images && Array.isArray(req.files.asset_images)) {
      // Only use isPremium from body for assets, imageCount for assets should default to 1
      // Subcategory's imageCount is separate and set on the subcategory itself
      const { isPremium = false, prompt = "" } = req.body || {};
      const finalIsPremium = Boolean(isPremium);
      const finalPrompt = String(prompt || "").trim();

      const assetObjects = [];
      for (const file of req.files.asset_images) {
        const fileUrl = await fileUploadService.uploadFile({
          buffer: file.buffer,
          mimetype: file.mimetype,
          folder: "subcategory/assets",
        });
        assetObjects.push({
          _id: new mongoose.Types.ObjectId(),
          url: fileUrl,
          isPremium: finalIsPremium,
          imageCount: 1, // Assets default to 1, can be updated via asset-specific APIs
          prompt: finalPrompt,
        });
      }
      if (assetObjects.length > 0) {
        uploaded.asset_images = assetObjects;
      }
    }

  return uploaded;
};

// Calculate next order value
const calculateNextOrder = async (field = "order", excludeId = null) => {
  try {
    const match = excludeId ? { _id: { $ne: excludeId } } : {};
    const [result] = await Subcategory.aggregate([
      { $match: match },
      { $group: { _id: null, maxOrder: { $max: `$${field}` } } },
    ]);
    return result?.maxOrder >= 1 ? result.maxOrder + 1 : 1;
  } catch {
    const count = await Subcategory.countDocuments(
      excludeId ? { _id: { $ne: excludeId } } : {}
    );
    return count + 1;
  }
};

// Create
export const createSubcategory = async (req, res) => {
  try {
    const payload = req.body || {};
    const mediaUploads = await processMediaUploads(req);
    const finalPayload = { ...payload, ...mediaUploads };

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

    // Prepare subcategory data
    const subcategoryData = {
      categoryId: finalPayload.categoryId,
      subcategoryTitle: finalPayload.subcategoryTitle,
      img_sqr:
        finalPayload.img_sqr && finalPayload.img_sqr !== "null"
          ? finalPayload.img_sqr
          : "",
      img_rec:
        finalPayload.img_rec && finalPayload.img_rec !== "null"
          ? finalPayload.img_rec
          : "",
      video_sqr:
        finalPayload.video_sqr && finalPayload.video_sqr !== "null"
          ? finalPayload.video_sqr
          : "",
      video_rec:
        finalPayload.video_rec && finalPayload.video_rec !== "null"
          ? finalPayload.video_rec
          : "",
      status:
        typeof finalPayload.status === "boolean" ? finalPayload.status : true,
      isPremium:
        finalPayload.isPremium !== undefined
          ? Boolean(finalPayload.isPremium)
          : false,
      imageCount:
        finalPayload.imageCount !== undefined
          ? Number(finalPayload.imageCount)
          : 1,
      isAiPhoto:
        finalPayload.isAiPhoto !== undefined
          ? Boolean(finalPayload.isAiPhoto)
          : false,
      isSection3:
        finalPayload.isSection3 !== undefined
          ? Boolean(finalPayload.isSection3)
          : false,
      isSection4:
        finalPayload.isSection4 !== undefined
          ? Boolean(finalPayload.isSection4)
          : false,
      isSection5:
        finalPayload.isSection5 !== undefined
          ? Boolean(finalPayload.isSection5)
          : false,
    };

    // Handle asset_images - merge uploaded files and body assets
    const assets = [];
    if (finalPayload.asset_images && Array.isArray(finalPayload.asset_images)) {
      assets.push(...finalPayload.asset_images);
    }
    if (payload.asset_images && Array.isArray(payload.asset_images)) {
      const existingUrls = assets.map((a) =>
        typeof a === "string" ? a : a.url
      );
      payload.asset_images.forEach((asset) => {
        const url = typeof asset === "string" ? asset : asset?.url;
        if (url && !existingUrls.includes(url)) {
          assets.push(
            typeof asset === "string"
              ? {
                  _id: new mongoose.Types.ObjectId(),
                  url: asset,
                  isPremium: false,
                  imageCount: 1,
                  prompt: "",
                }
              : {
                  _id: preserveAssetId(asset),
                  url: asset.url || "",
                  isPremium:
                    asset.isPremium !== undefined ? asset.isPremium : false,
                  imageCount:
                    asset.imageCount !== undefined
                      ? Number(asset.imageCount)
                      : 1,
                  prompt:
                    asset.prompt !== undefined
                      ? String(asset.prompt).trim()
                      : "",
                }
          );
        }
      });
    }
    subcategoryData.asset_images = assets;

    // Calculate orders if not provided
    if (!finalPayload.order || finalPayload.order < 1) {
      subcategoryData.order = await calculateNextOrder("order");
    } else {
      subcategoryData.order = Number(finalPayload.order);
    }

    if (!finalPayload.aiPhotoOrder || finalPayload.aiPhotoOrder < 1) {
      subcategoryData.aiPhotoOrder = await calculateNextOrder("aiPhotoOrder");
    } else {
      subcategoryData.aiPhotoOrder = Number(finalPayload.aiPhotoOrder);
    }

    if (!finalPayload.section3Order || finalPayload.section3Order < 1) {
      subcategoryData.section3Order = await calculateNextOrder("section3Order");
    } else {
      subcategoryData.section3Order = Number(finalPayload.section3Order);
    }

    if (!finalPayload.section4Order || finalPayload.section4Order < 1) {
      subcategoryData.section4Order = await calculateNextOrder("section4Order");
    } else {
      subcategoryData.section4Order = Number(finalPayload.section4Order);
    }

    if (!finalPayload.section5Order || finalPayload.section5Order < 1) {
      subcategoryData.section5Order = await calculateNextOrder("section5Order");
    } else {
      subcategoryData.section5Order = Number(finalPayload.section5Order);
    }

    const subcategory = new Subcategory(subcategoryData);
    await subcategory.save();

    // Fetch fresh from database and return normalized response
    const saved = await Subcategory.findById(subcategory._id).lean();
    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.CREATED,
      message: "Subcategory created successfully",
      data: normalizeSubcategory(saved),
    });
  } catch (error) {
    console.error("createSubcategory error:", error);
    if (error?.code === 11000) {
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
    const { categoryId, status } = req.query;
    const filter = {};

    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.categoryId = categoryId;
    } else if (categoryId) {
      return apiResponse({
        res,
        status: false,
        message: "Invalid categoryId",
        statusCode: StatusCodes.BAD_REQUEST,
      });
    }

    if (typeof status !== "undefined") {
      filter.status = status === "true" || status === true;
    }

    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          // Add a field to help sort: 0 for items with order >= 1, 1 for null/0/undefined
          orderSort: {
            $cond: [
              { $and: [{ $ne: ["$order", null] }, { $gte: ["$order", 1] }] },
              0, // Valid order
              1, // Invalid/null order
            ],
          },
          // Create a sortable order value (use actual order or large number for items without order)
          sortOrder: {
            $cond: [
              { $and: [{ $ne: ["$order", null] }, { $gte: ["$order", 1] }] },
              "$order", // Use actual order value for items with valid order
              999999, // Large number to push items without order to the end
            ],
          },
        },
      },
      // Sort: valid orders first (by order ascending), then items without order (by createdAt ascending)
      { $sort: { orderSort: 1, sortOrder: 1, createdAt: 1 } },
      // Remove temporary sort fields
      { $project: { orderSort: 0, sortOrder: 0 } },
    ];

    const items = await Subcategory.aggregate(pipeline);

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategories fetched successfully",
      data: items.map(normalizeSubcategory),
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
      data: normalizeSubcategory(item),
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

    // Process file uploads
    const mediaUploads = await processMediaUploads(req);
    const { asset_images, ...otherUploads } = mediaUploads;
    const finalPayload = { ...payload, ...otherUploads };

    // Normalize media fields
    const mediaFields = ["img_sqr", "img_rec", "video_sqr", "video_rec"];
    for (const field of mediaFields) {
      // If field is explicitly "null" or null, set to empty string (user wants to remove)
      if (finalPayload[field] === null || finalPayload[field] === "null") {
        finalPayload[field] = "";
      } else if (finalPayload[field] === undefined) {
        // If field is undefined (not sent), remove it from payload to preserve existing value
        delete finalPayload[field];
      }
      // Delete old file if new one uploaded
      if (mediaUploads[field] && existing[field]) {
        try {
          await fileUploadService.deleteFile({ url: existing[field] });
        } catch (err) {
          console.error(`Failed to delete old ${field}:`, err);
        }
      }
    }

    // Handle asset_images from body
    let bodyAssetsProvided = false;
    let bodyAssets = [];
    if (
      finalPayload.asset_images !== undefined &&
      Array.isArray(finalPayload.asset_images)
    ) {
      bodyAssetsProvided = true;
      bodyAssets = normalizeAssets(finalPayload.asset_images);
      // Remove asset_images from finalPayload since we'll handle it separately
      delete finalPayload.asset_images;
    }

    // Handle numeric fields
    if (finalPayload.imageCount !== undefined) {
      finalPayload.imageCount = Number(finalPayload.imageCount);
    }
    if (finalPayload.isPremium !== undefined) {
      finalPayload.isPremium = Boolean(finalPayload.isPremium);
    }

    // Build update object
    const updateObj = { $set: finalPayload };

    // Handle asset_images: merge body assets with file uploads
    let finalAssets = [];

    // Start with body assets if provided, otherwise use existing assets
    if (bodyAssetsProvided) {
      // User explicitly provided asset_images (even if empty array)
      finalAssets = [...bodyAssets];
    } else {
      // If body doesn't provide asset_images, keep existing ones
      finalAssets = normalizeAssets(existing.asset_images || []);
    }

    // Add new asset_images from file uploads (if any)
    if (
      asset_images &&
      Array.isArray(asset_images) &&
      asset_images.length > 0
    ) {
      const existingUrls = finalAssets.map((a) => a.url);
      const newAssets = asset_images.filter(
        (asset) => !existingUrls.includes(asset.url)
      );
      finalAssets = [...finalAssets, ...newAssets];
    }

    // Update asset_images if:
    // 1. Body explicitly provided asset_images (even if empty), OR
    // 2. File uploads are present
    if (bodyAssetsProvided || (asset_images && asset_images.length > 0)) {
      updateObj.$set.asset_images = finalAssets;
    }

    const updated = await Subcategory.findByIdAndUpdate(id, updateObj, {
      new: true,
    }).lean();

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategory updated successfully",
      data: normalizeSubcategory(updated),
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
export const deleteSubcategory = async (req, res) => {
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

    // Delete media files
    const mediaFields = ["img_sqr", "img_rec", "video_sqr", "video_rec"];
    for (const field of mediaFields) {
      if (item[field]) {
        try {
          await fileUploadService.deleteFile({ url: item[field] });
        } catch (err) {
          console.error(`Failed to delete ${field}:`, err);
        }
      }
    }

    // Delete asset images
    if (item.asset_images && item.asset_images.length > 0) {
      for (const asset of item.asset_images) {
        try {
          const url = typeof asset === "string" ? asset : asset.url;
          if (url) {
            await fileUploadService.deleteFile({ url });
          }
        } catch (err) {
          console.error(`Failed to delete asset:`, err);
        }
      }
    }

    await item.deleteOne();

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategory deleted successfully",
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
    let { status } = req.body;

    // Validate ID first
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    // Handle form-data: convert string to boolean if needed
    // Support: true/false (boolean), "true"/"false" (string), "1"/"0" (string)
    if (typeof status === "string") {
      const lowerStatus = status.toLowerCase();
      if (lowerStatus === "true" || lowerStatus === "1") {
        status = true;
      } else if (lowerStatus === "false" || lowerStatus === "0") {
        status = false;
      } else {
        return apiResponse({
          res,
          status: false,
          statusCode: StatusCodes.BAD_REQUEST,
          message:
            "status must be a boolean or string ('true'/'false'/'1'/'0')",
        });
      }
    } else if (typeof status !== "boolean") {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "status must be a boolean value",
      });
    }

    // Update subcategory status
    const updated = await Subcategory.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).lean();

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
      data: normalizeSubcategory(updated),
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

    // Fetch all subcategories sorted by current order, then rebuild the full sequence
    const allSubs = await Subcategory.find({})
      .select({ _id: 1, order: 1, createdAt: 1 })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    // Filter valid payload entries and sort by desired order asc
    const desired = payload
      .filter(
        (p) =>
          p &&
          p.id &&
          mongoose.Types.ObjectId.isValid(p.id) &&
          typeof p.order !== "undefined"
      )
      .map((p) => ({
        id: p.id,
        order: Math.max(1, Number(p.order) || 1),
      }))
      .sort((a, b) => a.order - b.order);

    if (desired.length === 0) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "No valid items found",
      });
    }

    // Build remaining list (those not in desired)
    const desiredIds = new Set(desired.map((d) => d.id));
    const remaining = allSubs.filter((s) => !desiredIds.has(s._id.toString()));

    // Reconstruct final ordered list
    const finalList = [];
    let remainingIdx = 0;
    desired.forEach((d) => {
      const targetIdx = Math.max(0, d.order - 1);
      // Fill slots up to targetIdx with remaining items
      while (finalList.length < targetIdx && remainingIdx < remaining.length) {
        finalList.push(remaining[remainingIdx]._id.toString());
        remainingIdx++;
      }
      finalList.push(d.id);
    });
    // Append any leftover remaining
    while (remainingIdx < remaining.length) {
      finalList.push(remaining[remainingIdx]._id.toString());
      remainingIdx++;
    }

    // Assign sequential order 1..n
    const ops = finalList.map((id, idx) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: { order: idx + 1 } },
      },
    }));

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

// Upload Asset Images
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

    // Process uploaded files
    // Assets should have their own imageCount (default 1), not inherit from subcategory
    // If imageCount is provided in body, it's for the asset itself
    const { isPremium = false, imageCount, imagecount, prompt = "" } =
      req.body || {};
    const finalIsPremium = Boolean(isPremium);
    const finalPrompt = String(prompt || "").trim();
    // For assets, use imageCount from body if provided, otherwise default to 1
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
            folder: "subcategory/assets",
          });
          uploadedAssets.push({
            _id: new mongoose.Types.ObjectId(),
            url: fileUrl,
            isPremium: finalIsPremium,
            imageCount: assetImageCount, // Use asset-specific imageCount
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

    const updated = await Subcategory.findByIdAndUpdate(
      id,
      { $push: { asset_images: { $each: newAssets } } },
      { new: true }
    ).lean();

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: `${newAssets.length} asset image(s) uploaded successfully`,
      data: normalizeSubcategory(updated),
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
// Supports deletion by asset ID or URL
export const deleteAssetImage = async (req, res) => {
  try {
    const { id } = req.params;
    // Accept either assetId or url from query params or body
    const assetId =
      (req.query && req.query.assetId) || (req.body && req.body.assetId);
    const url = (req.query && req.query.url) || (req.body && req.body.url);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    // Either assetId or url must be provided
    if (!assetId && !url) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message:
          'Either assetId or url is required. Provide in query params or body: { "assetId": "<id>" } or { "url": "<url>" }',
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

    // Find asset to delete by ID or URL
    let assetToDelete = null;
    let assetIndex = -1;

    if (assetId) {
      // Find by asset ID
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
      // Find by URL
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
        message: "Asset image not found in this subcategory",
      });
    }

    // Delete from cloud storage
    // Convert to plain object if it's a Mongoose document
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
        // Continue with DB removal even if cloud deletion fails
      }
    }

    // Remove from database
    let pullQuery;
    if (typeof assetObj === "string") {
      pullQuery = urlToDelete;
    } else {
      // Use _id for more reliable deletion
      if (assetObj && assetObj._id) {
        pullQuery = { _id: assetObj._id };
      } else if (urlToDelete) {
        // Fallback to URL if _id not available
        pullQuery = { url: urlToDelete };
      } else {
        // Last resort: use the entire object (MongoDB will match it)
        pullQuery = assetObj;
      }
    }

    const updated = await Subcategory.findByIdAndUpdate(
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
      data: normalizeSubcategory(updated),
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

// Manage Asset Images (add or remove URLs)
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

    // Assets should have their own imageCount (default 1), not inherit from subcategory
    const { isPremium = false, imageCount, imagecount, prompt = "" } =
      req.body || {};
    const finalIsPremium = Boolean(isPremium);
    const finalPrompt = String(prompt || "").trim();
    // For assets, use imageCount from body if provided, otherwise default to 1
    const assetImageCount =
      imageCount !== undefined
        ? Number(imageCount) || 1
        : imagecount !== undefined
        ? Number(imagecount) || 1
        : 1;

    // Handle file uploads (upload from PC)
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
            folder: "subcategory/assets",
          });

          // Check if URL already exists
          if (!existingUrls.includes(fileUrl)) {
            uploadedAssets.push({
              _id: new mongoose.Types.ObjectId(),
              url: fileUrl,
              isPremium: finalIsPremium,
              imageCount: assetImageCount,
              prompt: finalPrompt,
            });
            existingUrls.push(fileUrl); // Add to existing to prevent duplicates in same batch
          }
        } catch (err) {
          console.error("Error uploading asset file:", err);
        }
      }

      if (uploadedAssets.length > 0) {
        const updated = await Subcategory.findByIdAndUpdate(
          id,
          { $push: { asset_images: { $each: uploadedAssets } } },
          { new: true }
        ).lean();

        return apiResponse({
          res,
          status: true,
          statusCode: StatusCodes.OK,
          message: `${uploadedAssets.length} asset image(s) uploaded successfully`,
          data: normalizeSubcategory(updated),
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
        imageCount: assetImageCount, // Use asset-specific imageCount
        prompt: finalPrompt,
      };

      const updated = await Subcategory.findByIdAndUpdate(
        id,
        { $push: { asset_images: newAsset } },
        { new: true }
      ).lean();

      return apiResponse({
        res,
        status: true,
        statusCode: StatusCodes.OK,
        message: "Asset image added successfully",
        data: normalizeSubcategory(updated),
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

      const updated = await Subcategory.findByIdAndUpdate(
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
        data: normalizeSubcategory(updated),
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

      // Delete from cloud storage
      const deletePromises = assetsToDelete.map((asset) => {
        const url = typeof asset === "string" ? asset : asset.url;
        return fileUploadService.deleteFile({ url }).catch((err) => {
          console.error("Failed to delete asset from cloud:", err);
          return null;
        });
      });
      await Promise.all(deletePromises);

      // Remove from database
      const updated = await Subcategory.findByIdAndUpdate(
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
        data: normalizeSubcategory(updated),
      });
    }

    // Check if files were uploaded but validation failed
    if (
      req.files?.asset_images &&
      Array.isArray(req.files.asset_images) &&
      req.files.asset_images.length > 0
    ) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Failed to process uploaded files. Please try again.",
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
    console.error("manageSubcategoryAssets error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to manage asset images",
    });
  }
};

// Get all subcategory titles
export const getAllSubcategoryTitles = async (req, res) => {
  try {
    const { categoryId } = req.query;
    const filter = { status: true, isAiPhoto: true };

    if (categoryId) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return apiResponse({
          res,
          status: false,
          statusCode: StatusCodes.BAD_REQUEST,
          message: "Invalid categoryId",
        });
      }
      filter.categoryId = categoryId;
    }

    // Order titles using aiPhotoOrder; fall back to createdAt for unset values
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          aiPhotoOrderSort: {
            $cond: [
              {
                $and: [
                  { $ne: ["$aiPhotoOrder", null] },
                  { $gte: ["$aiPhotoOrder", 1] },
                ],
              },
              0,
              1,
            ],
          },
          aiPhotoOrderValue: {
            $cond: [
              {
                $and: [
                  { $ne: ["$aiPhotoOrder", null] },
                  { $gte: ["$aiPhotoOrder", 1] },
                ],
              },
              "$aiPhotoOrder",
              999999,
            ],
          },
        },
      },
      {
        $sort: {
          aiPhotoOrderSort: 1,
          aiPhotoOrderValue: 1,
          createdAt: 1,
        },
      },
      { $project: { _id: 1, subcategoryTitle: 1 } },
    ];

    const subcategories = await Subcategory.aggregate(pipeline);

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategory titles fetched successfully",
      data: subcategories,
    });
  } catch (error) {
    console.error("getAllSubcategoryTitles error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to fetch subcategory titles",
    });
  }
};

// Get subcategory assets
export const getSubcategoryAssets = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    const subcategory = await Subcategory.findOne({
      _id: id,
      status: true,
    })
      .select({ _id: 1, subcategoryTitle: 1, asset_images: 1, prompt: 1 })
      .lean();

    if (!subcategory) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found or inactive",
      });
    }

    const allAssetImages = normalizeAssets(subcategory.asset_images || []);
    const { skip, limit: limitNum } = commonHelper.paginationFun({
      page,
      limit,
    });
    const paginatedAssetImages = allAssetImages.slice(skip, skip + limitNum);
    const pagination = commonHelper.paginationDetails({
      page,
      totalItems: allAssetImages.length,
      limit: limitNum,
    });

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategory assets fetched successfully",
      data: {
        _id: subcategory._id,
        subcategoryTitle: subcategory.subcategoryTitle,
        asset_images: paginatedAssetImages,
      },
      pagination,
    });
  } catch (error) {
    console.error("getSubcategoryAssets error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to fetch subcategory assets",
    });
  }
};

// Toggle premium status
export const toggleSubcategoryPremium = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPremium } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory ID format",
      });
    }

    const subcategory = await Subcategory.findById(id).lean();
    if (!subcategory) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

    const newPremium =
      isPremium !== undefined ? isPremium : !subcategory.isPremium;

    const updated = await Subcategory.findByIdAndUpdate(
      id,
      { isPremium: newPremium },
      { new: true }
    ).lean();

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: newPremium
        ? "Subcategory marked as premium successfully"
        : "Subcategory removed from premium successfully",
      data: normalizeSubcategory(updated),
    });
  } catch (error) {
    console.error("Toggle Subcategory Premium Error:", error);
    return apiResponse({
      res,
      status: false,
      statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      message: "Failed to toggle subcategory premium status",
    });
  }
};

// Update Individual Asset Properties (isPremium, imageCount, prompt)
export const updateAssetImage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      assetId,
      url,
      isPremium,
      imageCount,
      imagecount,
      prompt,
    } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Invalid subcategory id",
      });
    }

    // Either assetId or url must be provided to identify the asset
    if (!assetId && !url) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "Either assetId or url is required to identify the asset",
      });
    }

    // At least one of isPremium, imageCount, or prompt must be provided
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

    const item = await Subcategory.findById(id);
    if (!item) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

    // Find the asset to update
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
        message: "Asset not found in this subcategory",
      });
    }

    // Prepare update values
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

    // Update the asset in the array using arrayFilters
    const assetIdentifier = assetId
      ? { "asset._id": new mongoose.Types.ObjectId(assetId) }
      : { "asset.url": url };

    const updated = await Subcategory.findOneAndUpdate(
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
      data: normalizeSubcategory(updated),
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
  createSubcategory,
  getAllSubcategories,
  getSubcategoryById,
  updateSubcategory,
  deleteSubcategory,
  toggleStatus,
  toggleSubcategoryPremium,
  updateOrderBatch,
  uploadAssetImages,
  deleteAssetImage,
  manageSubcategoryAssets,
  updateAssetImage,
  getAllSubcategoryTitles,
  getSubcategoryAssets,
};
