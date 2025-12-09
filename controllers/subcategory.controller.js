import { StatusCodes } from "http-status-codes";
import Subcategory from "../models/Subcategory.js";
import fileUploadService from "../services/file.upload.service.js";
import { apiResponse } from "../helper/api-response.helper.js";
import mongoose from "mongoose";
import commonHelper from "../helper/common.helper.js";

const processMediaUploads = async (req) => {
  const uploaded = {};

  const uploadFields = ["img_sqr", "img_rec", "video_sqr", "video_rec"];

  for (const field of uploadFields) {
    if (req.files && req.files[field] && req.files[field][0]) {
      const file = req.files[field][0];
      const fileUrl = await fileUploadService.uploadFile({
        ...file,
        folder: "subcategory",
      });
      uploaded[field] = fileUrl;
    }
  }

  // Process asset_images separately (can be multiple files)
  if (
    req.files &&
    req.files.asset_images &&
    Array.isArray(req.files.asset_images)
  ) {
    const assetUrls = [];
    for (const file of req.files.asset_images) {
      const fileUrl = await fileUploadService.uploadFile({
        buffer: file.buffer,
        mimetype: file.mimetype,
        folder: "subcategory/assets",
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
    // Normalize media fields: if null, "null", or undefined, set to empty string
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
      asset_images: finalPayload.asset_images || [], // Include asset_images array
      status:
        typeof finalPayload.status === "boolean" ? finalPayload.status : true,
      selectImage:
        finalPayload.selectImage !== undefined
          ? Number(finalPayload.selectImage)
          : 1,
    };

    const subcategory = new Subcategory(subcategoryData);

    // Always compute order if not explicitly provided in request
    if (typeof finalPayload.order !== "number") {
      // Find the maximum order for this category
      const maxOrderDoc = await Subcategory.findOne({
        categoryId: finalPayload.categoryId,
        order: { $exists: true, $ne: null, $gte: 1 },
      })
        .sort({ order: -1 })
        .select("order")
        .lean();

      // Next order = max + 1, or 1 if no items exist
      const nextOrder =
        maxOrderDoc && maxOrderDoc.order ? maxOrderDoc.order + 1 : 1;
      subcategory.order = nextOrder;
    } else {
      // Use the order provided in request
      subcategory.order = finalPayload.order;
    }

    // Always assign AI World order (regardless of isAiWorld status)
    // Query max aiWorldOrder from ALL subcategories to ensure unique incrementing order
    const maxAiWorldOrderDoc = await Subcategory.findOne({
      aiWorldOrder: { $exists: true, $ne: null, $gte: 1 },
    })
      .sort({ aiWorldOrder: -1 })
      .select({ aiWorldOrder: 1 })
      .lean()
      .limit(1);
    subcategory.isAiWorld =
      finalPayload.isAiWorld !== undefined ? finalPayload.isAiWorld : false;
    // Assign AI World order: if no subcategories exist with order >= 1, start with 1, otherwise increment
    // Order is assigned even if isAiWorld is false, so it's ready when admin toggles it later
    subcategory.aiWorldOrder =
      maxAiWorldOrderDoc && maxAiWorldOrderDoc.aiWorldOrder
        ? maxAiWorldOrderDoc.aiWorldOrder + 1
        : 1;

    // Always assign home section orders (regardless of section status)
    // Query max orders from ALL subcategories to ensure unique incrementing order
    const [maxSection3Order, maxSection4Order, maxSection5Order] =
      await Promise.all([
        Subcategory.findOne({
          section3Order: { $exists: true, $ne: null, $gte: 1 },
        })
          .sort({ section3Order: -1 })
          .select({ section3Order: 1 })
          .lean()
          .limit(1),
        Subcategory.findOne({
          section4Order: { $exists: true, $ne: null, $gte: 1 },
        })
          .sort({ section4Order: -1 })
          .select({ section4Order: 1 })
          .lean()
          .limit(1),
        Subcategory.findOne({
          section5Order: { $exists: true, $ne: null, $gte: 1 },
        })
          .sort({ section5Order: -1 })
          .select({ section5Order: 1 })
          .lean()
          .limit(1),
      ]);

    subcategory.isSection3 =
      finalPayload.isSection3 !== undefined ? finalPayload.isSection3 : false;
    subcategory.section3Order =
      maxSection3Order && maxSection3Order.section3Order
        ? maxSection3Order.section3Order + 1
        : 1;

    subcategory.isSection4 =
      finalPayload.isSection4 !== undefined ? finalPayload.isSection4 : false;
    subcategory.section4Order =
      maxSection4Order && maxSection4Order.section4Order
        ? maxSection4Order.section4Order + 1
        : 1;

    subcategory.isSection5 =
      finalPayload.isSection5 !== undefined ? finalPayload.isSection5 : false;
    subcategory.section5Order =
      maxSection5Order && maxSection5Order.section5Order
        ? maxSection5Order.section5Order + 1
        : 1;

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
    const sort = { order: 1, createdAt: -1 };

    const [items, totalItems] = await Promise.all([
      Subcategory.find(filter).sort(sort).skip(skip).limit(lim).lean(),
      Subcategory.countDocuments(filter),
    ]);

    // Ensure selectImage field exists with default value of 1 for all subcategories
    const itemsWithSelectImage = items.map((subcategory) => ({
      ...subcategory,
      selectImage:
        subcategory.selectImage !== undefined &&
        subcategory.selectImage !== null
          ? subcategory.selectImage
          : 1,
    }));

    const totalPages = Math.ceil(totalItems / lim);

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategories fetched successfully",
      data: itemsWithSelectImage,
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

    // Ensure selectImage field exists with default value of 1
    const itemWithSelectImage = {
      ...(item.toObject ? item.toObject() : item),
      selectImage:
        item.selectImage !== undefined && item.selectImage !== null
          ? item.selectImage
          : 1,
    };

    return apiResponse({
      res,
      status: true,
      statusCode: StatusCodes.OK,
      message: "Subcategory fetched successfully",
      data: itemWithSelectImage,
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

    // Normalize media fields: if null, "null", or undefined, set to empty string
    const mediaFields = ["img_sqr", "img_rec", "video_sqr", "video_rec"];
    for (const f of mediaFields) {
      // If field is explicitly set in payload and is null/undefined/"null", set to empty string
      if (
        finalPayload[f] === null ||
        finalPayload[f] === "null" ||
        finalPayload[f] === undefined
      ) {
        finalPayload[f] = "";
      }
      // Delete old media if new file uploaded
      if (mediaUploads[f] && existing[f]) {
        try {
          await fileUploadService.deleteFile({ url: existing[f] });
        } catch (err) {
          console.error(`Failed to delete old file for ${f}:`, err);
        }
      }
    }

    // Handle selectImage update
    if (finalPayload.selectImage !== undefined) {
      finalPayload.selectImage = Number(finalPayload.selectImage);
    }

    // Build update object
    const updateObj = { $set: finalPayload };

    // If asset_images were uploaded, add them to the array (prevent duplicates)
    if (
      asset_images &&
      Array.isArray(asset_images) &&
      asset_images.length > 0
    ) {
      updateObj.$addToSet = { asset_images: { $each: asset_images } };
    }

    const updated = await Subcategory.findByIdAndUpdate(id, updateObj, {
      new: true,
    });

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
    if (
      req.path &&
      (req.path.includes("/assets") || req.originalUrl.includes("/assets"))
    ) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message:
          "Invalid route. Use DELETE /:id/assets/delete to delete asset images, not the entire subcategory.",
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

    const categoryId = item.categoryId;
    const deletedItemData = {
      isAiWorld: item.isAiWorld,
      isSection3: item.isSection3,
      isSection4: item.isSection4,
      isSection5: item.isSection5,
    };
    await item.deleteOne();

    // Auto-reorder: fetch all remaining items for this category, sort by current order, reassign 1, 2, 3...
    try {
      // Get all remaining items, sort by order (ascending: 1, 2, 3...)
      const remaining = await Subcategory.find({ categoryId })
        .sort({ order: 1, createdAt: 1 })
        .select("_id order")
        .lean();

      // Reassign orders starting from 1
      for (let i = 0; i < remaining.length; i++) {
        await Subcategory.findByIdAndUpdate(remaining[i]._id, { order: i + 1 });
      }

      // Reorder AI World section if deleted item was in AI World
      if (deletedItemData.isAiWorld) {
        const remainingAiWorld = await Subcategory.find({
          isAiWorld: true,
        })
          .sort({ aiWorldOrder: 1, createdAt: 1 })
          .select("_id aiWorldOrder")
          .lean();

        for (let i = 0; i < remainingAiWorld.length; i++) {
          await Subcategory.findByIdAndUpdate(remainingAiWorld[i]._id, {
            aiWorldOrder: i + 1,
          });
        }
      }

      // Reorder home sections if deleted item was in any section
      const sectionsToReorder = [];
      if (deletedItemData.isSection3)
        sectionsToReorder.push({
          field: "isSection3",
          orderField: "section3Order",
        });
      if (deletedItemData.isSection4)
        sectionsToReorder.push({
          field: "isSection4",
          orderField: "section4Order",
        });
      if (deletedItemData.isSection5)
        sectionsToReorder.push({
          field: "isSection5",
          orderField: "section5Order",
        });

      for (const section of sectionsToReorder) {
        const remainingInSection = await Subcategory.find({
          [section.field]: true,
        })
          .sort({ [section.orderField]: 1, createdAt: 1 })
          .select(`_id ${section.orderField}`)
          .lean();

        for (let i = 0; i < remainingInSection.length; i++) {
          await Subcategory.findByIdAndUpdate(remainingInSection[i]._id, {
            [section.orderField]: i + 1,
          });
        }
      }
    } catch (err) {
      console.error("Error reordering after delete:", err);
      // Don't fail the delete response, just log the error
    }

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
    ).lean();

    if (!updated) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found",
      });
    }

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
      message: "Status updated successfully",
      data: updatedWithDefaults,
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

    if (
      req.files &&
      req.files.asset_images &&
      Array.isArray(req.files.asset_images)
    ) {
      for (const file of req.files.asset_images) {
        try {
          const fileUrl = await fileUploadService.uploadFile({
            buffer: file.buffer,
            mimetype: file.mimetype,
            folder: "subcategory/assets",
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
        message:
          'URL is required. Provide it in request body: { "url": "<url>" }',
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
      console.error(
        `Failed to delete asset image from cloud: ${decodedUrl}`,
        err
      );
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
        console.error(
          `Failed to delete asset image from cloud: ${removeUrl}`,
          err
        );
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
      const deletePromises = removeUrls.map((url) =>
        fileUploadService.deleteFile({ url }).catch((err) => {
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

/**
 * Get all subcategory titles only (for AI Photo page category tags)
 * Returns only subcategoryTitle and _id for all active subcategories
 * @route GET /api/v1/subcategories/titles
 * @access Public
 */
export const getAllSubcategoryTitles = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const filter = {
      status: true, // Only active subcategories
      isAiWorld: true, // Only AI World subcategories
    };

    // Optional filter by categoryId
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

    // Fetch only title and _id, sorted by order
    const subcategories = await Subcategory.find(filter)
      .select({ _id: 1, subcategoryTitle: 1 })
      .sort({ order: 1, createdAt: 1 })
      .lean();

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

/**
 * Get all asset images for a specific subcategory (for AI Photo page grid)
 * Returns paginated asset_images array for the subcategory
 * @route GET /api/v1/subcategories/:id/assets
 * @access Public
 * @query page - Page number (default: 1)
 * @query limit - Items per page (default: 10)
 */
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
      status: true, // Only active subcategories
    })
      .select({ _id: 1, subcategoryTitle: 1, asset_images: 1 })
      .lean();

    if (!subcategory) {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.NOT_FOUND,
        message: "Subcategory not found or inactive",
      });
    }

    // Filter out empty strings from asset_images
    const allAssetImages = (subcategory.asset_images || []).filter(
      (img) => img && img.trim() !== ""
    );

    // Apply pagination
    const { skip, limit: limitNum } = commonHelper.paginationFun({
      page,
      limit,
    });

    // Get paginated asset images
    const paginatedAssetImages = allAssetImages.slice(skip, skip + limitNum);

    // Get pagination details
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

/**
 * Toggle subcategory premium status - Optimized with single query
 * @route PATCH /api/v1/subcategories/:id/premium
 * @access Private (Admin)
 */
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

    // Optimized: Use findOneAndUpdate to get current premium status and update in one query
    const subcategory = await Subcategory.findOneAndUpdate(
      { _id: id },
      { $set: { updatedAt: new Date() } },
      { new: false, lean: true, select: "isPremium" }
    );

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

    // Update with new premium status
    const updated = await Subcategory.findByIdAndUpdate(
      id,
      {
        isPremium: newPremium,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

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
      message: newPremium
        ? "Subcategory marked as premium successfully"
        : "Subcategory removed from premium successfully",
      data: updatedWithDefaults,
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
  getAllSubcategoryTitles,
  getSubcategoryAssets,
};
