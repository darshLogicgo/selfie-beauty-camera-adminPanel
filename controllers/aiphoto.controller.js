import { StatusCodes } from "http-status-codes";
import Subcategory from "../models/Subcategory.js";
import { apiResponse } from "../helper/api-response.helper.js";
import mongoose from "mongoose";

// Get AI Photo subcategories (Client side - sorted by aiPhotoOrder)
export const getAiPhotoSubcategories = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;

    const pageNum = Number(page);
    const lim = Number(limit);
    const skip = (pageNum - 1) * lim;

    // Show all subcategories (we'll filter to only include those with images)
    const filter = {};

    // Sort by aiPhotoOrder (ascending), then by createdAt
    const sort = { aiPhotoOrder: 1, createdAt: -1 };

    const [items, totalItems] = await Promise.all([
      Subcategory.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(lim)
        .lean(),
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

    // Transform data to the desired format
    // Collect all images from img_sqr, img_rec, video_sqr, video_rec, and asset_images
    const formattedData = items
      .map((item) => {
        const photos = [];
        let photoIndex = 0;

        // Helper function to add image if valid (more lenient check)
        const addImage = (imageUrl, fieldName) => {
          // Check if imageUrl exists and is a non-empty string
          if (imageUrl != null && imageUrl !== undefined) {
            const urlString = String(imageUrl).trim();
            // Accept if it's not empty and not just whitespace or quotes
            if (urlString !== "" && urlString !== '""' && urlString !== "''" && urlString.length > 0) {
              photos.push({
                _id: `${item._id.toString()}${photoIndex}`,
                image_url: urlString,
              });
              photoIndex++;
              console.log(`[AI Photo API] Added image from ${fieldName} for ${item.subcategoryTitle}: ${urlString.substring(0, 50)}...`);
            }
          }
        };

        // Add img_sqr if it exists
        if (item.img_sqr != null) addImage(item.img_sqr, 'img_sqr');

        // Add img_rec if it exists
        if (item.img_rec != null) addImage(item.img_rec, 'img_rec');

        // Add video_sqr if it exists (treating videos as images for display)
        if (item.video_sqr != null) addImage(item.video_sqr, 'video_sqr');

        // Add video_rec if it exists (treating videos as images for display)
        if (item.video_rec != null) addImage(item.video_rec, 'video_rec');

        // Add all asset_images if they exist
        if (item.asset_images && Array.isArray(item.asset_images)) {
          item.asset_images.forEach((imageUrl, idx) => {
            if (imageUrl != null && imageUrl !== undefined) {
              const urlString = String(imageUrl).trim();
              if (urlString !== "" && urlString !== '""' && urlString !== "''" && urlString.length > 0) {
                photos.push({
                  _id: `${item._id.toString()}${photoIndex}`,
                  image_url: urlString,
                });
                photoIndex++;
                console.log(`[AI Photo API] Added asset_image[${idx}] for ${item.subcategoryTitle}: ${urlString.substring(0, 50)}...`);
              }
            }
          });
        }

        // Log detailed info if no photos found for debugging
        if (photos.length === 0) {
          console.log(`[AI Photo API] No images found for subcategory: ${item.subcategoryTitle}`, {
            _id: item._id,
            img_sqr: item.img_sqr,
            img_sqr_type: typeof item.img_sqr,
            img_rec: item.img_rec,
            img_rec_type: typeof item.img_rec,
            video_sqr: item.video_sqr,
            video_rec: item.video_rec,
            asset_images: item.asset_images,
            asset_images_type: Array.isArray(item.asset_images) ? 'array' : typeof item.asset_images,
            asset_images_length: Array.isArray(item.asset_images) ? item.asset_images.length : 'N/A',
          });
        }

        // Return subcategory with photos (even if empty)
        return {
          subCategory: item.subcategoryTitle || "",
          photos: photos,
        };
      });

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

    if (typeof isAiPhoto !== "boolean") {
      return apiResponse({
        res,
        status: false,
        statusCode: StatusCodes.BAD_REQUEST,
        message: "isAiPhoto must be a boolean value",
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

    let updateData = { isAiPhoto };

    // If adding to AI Photo, assign order
    if (isAiPhoto) {
      // Use aggregation to get both count and max order in one query
      // Exclude current item from calculation
      const [aggResult] = await Subcategory.aggregate([
        { $match: { isAiPhoto: true, _id: { $ne: subcategory._id } } },
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

      // Calculate next order (sequential: 1, 2, 3, 4...)
      // Always assign new order when toggling to true to ensure sequential ordering
      let nextOrder = 1;
      if (maxOrder !== null && typeof maxOrder === "number" && maxOrder >= 1) {
        // Use max order + 1 if valid order exists
        nextOrder = maxOrder + 1;
      } else {
        // If no valid order exists, use total count + 1
        nextOrder = totalCount > 0 ? totalCount + 1 : 1;
      }

      updateData.aiPhotoOrder = nextOrder;
      console.log(`[AI Photo Order Calculation] Max Order: ${maxOrder || 'none'}, Total Count: ${totalCount}, New Order: ${nextOrder}`);
    } else {
      // If removing from AI Photo, reset order to 0
      updateData.aiPhotoOrder = 0;

      // Reorder remaining items
      try {
        const remaining = await Subcategory.find({
          isAiPhoto: true,
          _id: { $ne: id },
        })
          .sort({ aiPhotoOrder: 1, createdAt: 1 })
          .select("_id aiPhotoOrder")
          .lean();

        // Reassign orders starting from 1
        for (let i = 0; i < remaining.length; i++) {
          await Subcategory.findByIdAndUpdate(remaining[i]._id, {
            aiPhotoOrder: i + 1,
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
      message: isAiPhoto
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
        if (!p.id || typeof p.aiPhotoOrder === "undefined") return null;

        if (!mongoose.Types.ObjectId.isValid(p.id)) return null;

        // Ensure order is at least 1
        const order = Math.max(1, Number(p.aiPhotoOrder));

        return {
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(p.id) },
            update: {
              $set: {
                aiPhotoOrder: order,
                isAiPhoto: true, // Ensure it's marked as AI Photo
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

